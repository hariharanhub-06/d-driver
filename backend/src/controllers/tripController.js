const prisma = require('../prisma');
const { notifyAdmins } = require('../utils/notifications');

// Canonical stop order for a trip — used by BOTH the driver (getActiveTrips) and the parent
// timeline (getTripProgress) so they ALWAYS agree on order + current_stop_index.
//   - Route with both morning + evening copies → only the matching half.
//   - Route with one (morning) set → an evening trip runs it in reverse (school → home).
// `stops` must already be ordered by sequence asc.
// Returns the stops in the order the bus actually visits them, and stamps each with a stable
// `stop_number` = its rank in the MORNING sequence (1..N). So morning counts up 1→N and
// evening (reversed, school→home) counts down N→1 — the same number a stop shows whichever
// trip it's on, and identical on the driver map and the parent timeline.
function orderStopsForTrip(stops, direction) {
  if (!Array.isArray(stops) || stops.length === 0) return Array.isArray(stops) ? stops : [];
  const hasEvening = stops.some(s => s.trip_type === 'evening');
  if (hasEvening) {
    return stops.filter(s => s.trip_type === direction).map((s, i) => ({ ...s, stop_number: i + 1 }));
  }
  const numbered = stops.map((s, i) => ({ ...s, stop_number: i + 1 }));
  if (direction === 'evening') return [...numbered].reverse();
  return numbered;
}

// POST /api/v1/trips/start
const startTrip = async (req, res) => {
  try {
    const { route_id, bus_id: bodyBusId, shift_id, route_type } = req.body;
    const driverId = req.user.id;
    const schoolId = req.user.school_id;
    const io = req.app.get('io');

    if (!route_id) return res.status(400).json({ error: 'route_id is required' });

    // The driver's chosen direction — evening runs the route in reverse.
    const tripDirection = (route_type === 'evening' || route_type === 'afternoon') ? 'evening' : 'morning';

    const driver = await prisma.driver.findUnique({
      where: { user_id: driverId },
      include: { bus: { select: { id: true } } },
    });
    if (!driver) return res.status(404).json({ error: 'Driver profile not found' });

    const bus_id = bodyBusId || driver.bus?.id || driver.assigned_bus_id;
    if (!bus_id) return res.status(400).json({ error: 'No bus assigned to this driver' });

    const existing = await prisma.activeTrip.findUnique({ where: { route_id } });
    if (existing && existing.status === 'running') {
      return res.status(409).json({ error: 'A trip for this route is already running' });
    }

    const trip = await prisma.activeTrip.upsert({
      where: { route_id },
      update: { driver_id: driver.id, bus_id, shift_id: shift_id || null, status: 'running', started_at: new Date(), completed_at: null, current_stop_index: 0, trip_type: tripDirection },
      create: { route_id, driver_id: driver.id, bus_id, shift_id: shift_id || null, school_id: schoolId, trip_type: tripDirection },
      include: { route: { include: { stops: { orderBy: { sequence: 'asc' } } } } },
    });

    const students = await prisma.student.findMany({
      where: { route_id, school_id: schoolId },
      include: { parent: { select: { id: true } } },
    });

    const routeName = trip.route.name;

    // Group students by parent_id so one parent with multiple students gets one notification
    const parentMap = new Map();
    for (const s of students) {
      if (!s.parent) continue;
      if (!parentMap.has(s.parent.id)) parentMap.set(s.parent.id, { parentId: s.parent.id, names: [] });
      parentMap.get(s.parent.id).names.push(s.name);
    }

    const parentNotifications = [...parentMap.values()].map(({ parentId, names }) => {
      const nameStr = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
      return prisma.notification.create({
        data: {
          user_id: parentId,
          message: tripDirection === 'evening'
            ? `Bus is on the way to drop off ${nameStr}. Route: "${routeName}".`
            : `Bus is on the way to pick up ${nameStr}. Route: "${routeName}".`,
          type: 'info',
          school_id: schoolId,
        },
      });
    });
    await Promise.all(parentNotifications);

    for (const { parentId } of parentMap.values()) {
      io?.to(`parent-${parentId}`).emit('trip-started', { route_id, route_name: routeName });
    }

    // Notify the school room (admins + bus-staff) so the bus-staff roster appears live.
    io?.to(`school-${schoolId}`).emit('trip-started', { route_id, bus_id, route_name: routeName });

    io?.to(`driver-${driverId}`).emit('request-km-entry', { entry_type: 'route_start', message: 'Enter current odometer reading to start trip' });

    res.status(201).json({ trip });
  } catch (error) {
    console.error('startTrip error:', error.message);
    res.status(500).json({ error: 'Error starting trip', details: error.message });
  }
};

// PATCH /api/v1/trips/:id/stop-index
const updateStopIndex = async (req, res) => {
  try {
    const { stop_index } = req.body;
    const existing = await prisma.activeTrip.findUnique({
      where: { id: req.params.id },
      include: { route: { include: { stops: { select: { id: true } } } } },
    });
    if (!existing) return res.status(404).json({ error: 'Trip not found' });
    const stopCount = existing.route?.stops?.length ?? 0;
    if (typeof stop_index !== 'number' || stop_index < 0 || stop_index > stopCount) {
      return res.status(400).json({ error: `stop_index must be between 0 and ${stopCount}` });
    }
    const trip = await prisma.activeTrip.update({
      where: { id: req.params.id },
      data: { current_stop_index: stop_index },
    });
    res.json({ trip });
  } catch (error) {
    console.error('updateStopIndex error:', error.message);
    res.status(500).json({ error: 'Error updating stop index', details: error.message });
  }
};

// POST /api/v1/trips/:id/complete
const completeTrip = async (req, res) => {
  try {
    const io = req.app.get('io');
    const schoolId = req.user.school_id;

    const trip = await prisma.activeTrip.update({
      where: { id: req.params.id },
      data: { status: 'completed', completed_at: new Date() },
      include: {
        route: {
          include: {
            students: { select: { id: true, name: true } },
          },
        },
      },
    });

    const students = await prisma.student.findMany({
      where: { route_id: trip.route_id, school_id: schoolId },
      include: { parent: { select: { id: true } } },
    });

    // Group by parent_id — one notification per parent even if they have multiple students
    const parentMap = new Map();
    for (const s of students) {
      if (!s.parent) continue;
      if (!parentMap.has(s.parent.id)) parentMap.set(s.parent.id, { parentId: s.parent.id, names: [] });
      parentMap.get(s.parent.id).names.push(s.name);
    }

    const isEvening = trip.trip_type === 'evening';
    const notifs = [...parentMap.values()].map(({ parentId, names }) => {
      const nameStr = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
      return prisma.notification.create({
        data: {
          user_id: parentId,
          message: isEvening
            ? `Trip complete. ${nameStr} dropped home safely. Route: "${trip.route.name}".`
            : `Bus has arrived at school. ${nameStr} reached school safely. Route: "${trip.route.name}".`,
          type: 'success',
          school_id: schoolId,
        },
      });
    });
    await Promise.all(notifs);

    for (const { parentId } of parentMap.values()) {
      io?.to(`parent-${parentId}`).emit('trip-completed', { route_id: trip.route_id });
    }

    // Notify the school room (admins + bus-staff) so the bus-staff roster locks live.
    io?.to(`school-${schoolId}`).emit('trip-completed', { route_id: trip.route_id, bus_id: trip.bus_id });

    io?.to(`driver-${req.user.id}`).emit('request-km-entry', { entry_type: 'route_end', message: 'Enter odometer reading to close trip' });

    // End-of-trip: check for students where NEITHER driver nor bus_staff marked attendance
    try {
      const today = new Date().toLocaleDateString('en-CA');
      const routeStudents = trip.route?.students || [];
      const missedStudents = [];

      await Promise.all(routeStudents.map(async (student) => {
        const [d, s] = await Promise.all([
          prisma.attendance.findUnique({
            where: { student_id_date_only_marked_by_role: { student_id: student.id, date_only: today, marked_by_role: 'driver' } },
          }),
          prisma.attendance.findUnique({
            where: { student_id_date_only_marked_by_role: { student_id: student.id, date_only: today, marked_by_role: 'bus_staff' } },
          }),
        ]);
        if (!d && !s) missedStudents.push(student.name);
      }));

      if (missedStudents.length > 0) {
        await notifyAdmins(
          schoolId,
          `Attendance not marked for: ${missedStudents.join(', ')} on ${today} by either driver or bus staff.`,
          'alert'
        );
      }
    } catch (missedErr) {
      console.error('End-of-trip missed attendance check error:', missedErr.message);
    }

    res.json({ trip });
  } catch (error) {
    console.error('completeTrip error:', error.message);
    res.status(500).json({ error: 'Error completing trip', details: error.message });
  }
};

// GET /api/v1/trips/active
const getActiveTrips = async (req, res) => {
  try {
    const where = { status: 'running' };

    if (req.user.role === 'driver') {
      where.school_id = req.user.school_id;
      const driver = await prisma.driver.findUnique({ where: { user_id: req.user.id }, select: { id: true } });
      if (driver) where.driver_id = driver.id;
    } else if (req.user.role === 'bus_staff') {
      where.school_id = req.user.school_id;
      const staffUser = await prisma.user.findUnique({ where: { id: req.user.id }, select: { assigned_bus_id: true } });
      if (staffUser?.assigned_bus_id) where.bus_id = staffUser.assigned_bus_id;
    } else {
      const { getSchoolFilter } = require('../middleware/authMiddleware');
      Object.assign(where, getSchoolFilter(req));
    }

    const trips = await prisma.activeTrip.findMany({
      where,
      include: {
        route: {
          include: {
            stops: {
              orderBy: { sequence: 'asc' },
              include: {
                students: {
                  select: { id: true, name: true, photo_url: true, grade: true },
                },
              },
            },
            students: {
              select: { id: true, name: true, photo_url: true, grade: true, stop_id: true },
            },
          },
        },
        driver: { include: { user: { select: { name: true, phone: true } } } },
        bus: { select: { bus_number: true } },
      },
    });

    // Filter stops per trip by trip_type using started_at converted to IST (UTC+5:30).
    // Routes with morning+evening copies must only show the relevant half per trip.
    for (const trip of trips) {
      if (trip.route?.stops?.length > 0) {
        const startedAt = trip.started_at ? new Date(trip.started_at) : new Date();
        const istHour = (startedAt.getUTCHours() + 5.5) % 24;
        // Prefer the driver's stored choice; fall back to the start-time heuristic.
        const tripType = trip.trip_type || (istHour >= 12 ? 'evening' : 'morning');
        trip.route.stops = orderStopsForTrip(trip.route.stops, tripType);
      }
    }

    // Explicit re-map: override nested Prisma include with a direct query per route.
    // Handles the case where student.stop_id was set to NULL by onDelete:SetNull
    // when stops were deleted/recreated, making the nested include return [].
    if (trips.length > 0) {
      const allRouteIds = [...new Set(trips.map(t => t.route_id).filter(Boolean))];
      const schoolId = where.school_id || req.user.school_id;
      const routeStudents = await prisma.student.findMany({
        where: { route_id: { in: allRouteIds }, ...(schoolId ? { school_id: schoolId } : {}) },
        select: { id: true, name: true, photo_url: true, grade: true, stop_id: true },
      });

      // Apply approved temporary stop-change overrides for today
      const today = new Date().toLocaleDateString('en-CA');
      const tempOverrides = await prisma.stopChangeRequest.findMany({
        where: {
          status: 'approved',
          change_type: 'temporary',
          school_id: { in: trips.map(t => t.school_id).filter(Boolean) },
          effective_date: { lte: new Date(today + 'T23:59:59') },
          // from_date / to_date not in schema — use effective_date as the single override date
        },
        select: { student_id: true, requested_stop_id: true, effective_date: true },
      });
      const todayOverrideMap = new Map(); // student_id → requested_stop_id
      for (const o of tempOverrides) {
        const d = o.effective_date.toLocaleDateString('en-CA');
        if (d === today) todayOverrideMap.set(o.student_id, o.requested_stop_id);
      }

      // Collect all stop IDs currently in these trips' routes
      const validStopIds = new Set();
      const stopNameToCurrentId = new Map(); // "stop name lowercase" → current stop id
      for (const trip of trips) {
        for (const stop of (trip.route?.stops || [])) {
          validStopIds.add(stop.id);
          stopNameToCurrentId.set(stop.name.toLowerCase(), stop.id);
        }
      }

      // Find students whose stop_id points to a stop not in the current route (orphaned UUID).
      // Look up the orphaned stop's name and remap to the matching stop in the current route.
      const orphanedStopIds = [...new Set(
        routeStudents.filter(s => s.stop_id && !validStopIds.has(s.stop_id)).map(s => s.stop_id)
      )];
      const remapStopId = new Map(); // orphaned stop_id → current stop_id
      if (orphanedStopIds.length > 0) {
        const orphanStops = await prisma.stop.findMany({
          where: { id: { in: orphanedStopIds } },
          select: { id: true, name: true },
        });
        for (const os of orphanStops) {
          const currentId = stopNameToCurrentId.get(os.name.toLowerCase());
          if (currentId) remapStopId.set(os.id, currentId);
        }
      }

      for (const trip of trips) {
        for (const stop of (trip.route?.stops || [])) {
          stop.students = routeStudents.filter(s => {
            const effectiveStopId = todayOverrideMap.get(s.id) ?? remapStopId.get(s.stop_id) ?? s.stop_id;
            return effectiveStopId === stop.id;
          });
        }
        trip.route.unassignedStudents = routeStudents.filter(s => {
          const effectiveStopId = todayOverrideMap.get(s.id) ?? remapStopId.get(s.stop_id) ?? s.stop_id;
          return !effectiveStopId || (!validStopIds.has(effectiveStopId));
        });
      }
    }

    res.json(trips);
  } catch (error) {
    console.error('getActiveTrips error:', error.message);
    res.status(500).json({ error: 'Error fetching active trips', details: error.message });
  }
};

// GET /api/v1/trips/history  (admin)
const getTripHistory = async (req, res) => {
  try {
    const { getSchoolFilter } = require('../middleware/authMiddleware');
    const { from, to, limit = 100 } = req.query;

    const where = { ...getSchoolFilter(req) };
    if (from || to) {
      where.started_at = {};
      if (from) where.started_at.gte = new Date(from);
      if (to) where.started_at.lte = new Date(new Date(to).getTime() + 86399999);
    }

    const trips = await prisma.activeTrip.findMany({
      where,
      take: parseInt(limit),
      orderBy: { started_at: 'desc' },
      include: {
        route: { select: { name: true } },
        driver: { include: { user: { select: { name: true } } } },
        bus: { select: { bus_number: true } },
      },
    });

    res.json(trips);
  } catch (error) {
    console.error('getTripHistory error:', error.message);
    res.status(500).json({ error: 'Error fetching trip history', details: error.message });
  }
};

// GET /api/v1/trips/progress/:routeId
// Parent-safe live trip state for a single route, used to drive the parent stop timeline.
// Returns the bus's current stop index, trip status, and how many of the route's
// students have boarded today vs the total on the route.
const getTripProgress = async (req, res) => {
  try {
    const { routeId } = req.params;
    if (!routeId) return res.status(400).json({ error: 'routeId is required' });

    // Authorize parents to only their own child's route. Other roles (admin/super_admin/
    // driver/bus_staff) already have school-scoped trip visibility, so allow them through.
    if (req.user.role === 'parent') {
      const owns = await prisma.student.findFirst({
        where: { parent_id: req.user.id, route_id: routeId },
        select: { id: true },
      });
      if (!owns) return res.status(403).json({ error: 'Not authorized for this route' });
    }

    const trip = await prisma.activeTrip.findUnique({
      where: { route_id: routeId },
      select: { current_stop_index: true, status: true, started_at: true, trip_type: true },
    });

    // Students on this route + how many boarded (present) today.
    const routeStudents = await prisma.student.findMany({
      where: { route_id: routeId },
      select: { id: true },
    });
    const studentIds = routeStudents.map(s => s.id);

    let studentsOnboard = 0;
    if (studentIds.length > 0) {
      const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD (matches Attendance.date_only)
      const present = await prisma.attendance.findMany({
        where: { student_id: { in: studentIds }, date_only: today, status: 'present' },
        select: { student_id: true },
        distinct: ['student_id'],
      });
      studentsOnboard = present.length;
    }

    // Trip direction (morning/evening) — driver's stored choice, else start-time heuristic.
    let direction = 'morning';
    if (trip) {
      if (trip.trip_type) {
        direction = trip.trip_type;
      } else {
        const startedAt = trip.started_at ? new Date(trip.started_at) : new Date();
        const istHour = (startedAt.getUTCHours() + 5.5) % 24;
        direction = istHour >= 12 ? 'evening' : 'morning';
      }
    }

    // Return the EXACT ordered stop list the driver is traversing, computed the same way as
    // getActiveTrips — so the parent timeline matches the bus 1:1 (order + current index).
    const rawStops = await prisma.stop.findMany({
      where: { route_id: routeId },
      orderBy: { sequence: 'asc' },
      select: { id: true, name: true, sequence: true, pickup_time: true, drop_time: true, latitude: true, longitude: true, trip_type: true },
    });
    const orderedStops = orderStopsForTrip(rawStops, direction);

    res.json({
      current_stop_index: trip?.current_stop_index ?? 0,
      status: trip?.status || 'idle',
      stops: orderedStops,
      trip_type: direction,
      students_onboard: studentsOnboard,
      students_total: studentIds.length,
      updated_at: trip?.started_at || null,
    });
  } catch (error) {
    console.error('getTripProgress error:', error.message);
    res.status(500).json({ error: 'Error fetching trip progress', details: error.message });
  }
};

module.exports = { startTrip, updateStopIndex, completeTrip, getActiveTrips, getTripHistory, getTripProgress };
