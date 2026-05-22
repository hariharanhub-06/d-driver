const prisma = require('../prisma');
const { notifyAdmins } = require('../utils/notifications');

// POST /api/v1/trips/start
const startTrip = async (req, res) => {
  try {
    const { route_id, bus_id: bodyBusId, shift_id } = req.body;
    const driverId = req.user.id;
    const schoolId = req.user.school_id;
    const io = req.app.get('io');

    if (!route_id) return res.status(400).json({ error: 'route_id is required' });

    const driver = await prisma.driver.findUnique({
      where: { user_id: driverId },
      include: { bus: { select: { id: true } } },
    });
    if (!driver) return res.status(404).json({ error: 'Driver profile not found' });

    const bus_id = bodyBusId || driver.bus?.id || driver.assigned_bus_id;

    const existing = await prisma.activeTrip.findUnique({ where: { route_id } });
    if (existing && existing.status === 'running') {
      return res.status(409).json({ error: 'A trip for this route is already running' });
    }

    const trip = await prisma.activeTrip.upsert({
      where: { route_id },
      update: { driver_id: driver.id, bus_id, shift_id: shift_id || null, status: 'running', started_at: new Date(), completed_at: null, current_stop_index: 0 },
      create: { route_id, driver_id: driver.id, bus_id, shift_id: shift_id || null, school_id: schoolId },
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
          message: `Bus is on the way to pick up ${nameStr}. Route: "${routeName}".`,
          type: 'info',
          school_id: schoolId,
        },
      });
    });
    await Promise.all(parentNotifications);

    for (const { parentId } of parentMap.values()) {
      io?.to(`parent-${parentId}`).emit('trip-started', { route_id, route_name: routeName });
    }

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

    const notifs = [...parentMap.values()].map(({ parentId, names }) => {
      const nameStr = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
      return prisma.notification.create({
        data: {
          user_id: parentId,
          message: `Bus has arrived at school. ${nameStr} reached school safely. Route: "${trip.route.name}".`,
          type: 'success',
          school_id: schoolId,
        },
      });
    });
    await Promise.all(notifs);

    for (const { parentId } of parentMap.values()) {
      io?.to(`parent-${parentId}`).emit('trip-completed', { route_id: trip.route_id });
    }

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
    } else if (req.schoolId) {
      where.school_id = req.schoolId;
    } else if (req.user.role === 'super_admin' && !req.user.is_dev_sa) {
      where.school = { assigned_sa_id: req.user.id };
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

      console.log(`[getActiveTrips] DEBUG students=${routeStudents.length} stops=${validStopIds.size} orphaned=${orphanedStopIds.length} remapped=${remapStopId.size}`);
      console.log('[getActiveTrips] DEBUG student stop_ids:', JSON.stringify(routeStudents.map(s => ({ n: s.name, sid: s.stop_id }))));
      console.log('[getActiveTrips] DEBUG validStopIds:', JSON.stringify([...validStopIds]));

      for (const trip of trips) {
        for (const stop of (trip.route?.stops || [])) {
          stop.students = routeStudents.filter(s => {
            const effectiveStopId = todayOverrideMap.get(s.id) ?? remapStopId.get(s.stop_id) ?? s.stop_id;
            return effectiveStopId === stop.id;
          });
          if (stop.name === 'Sitra')
            console.log(`[getActiveTrips] Sitra stop id=${stop.id} → ${stop.students.length} students`);
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
    const schoolId = req.schoolId;
    const { from, to, limit = 100 } = req.query;

    const where = { school_id: schoolId };
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

module.exports = { startTrip, updateStopIndex, completeTrip, getActiveTrips, getTripHistory };
