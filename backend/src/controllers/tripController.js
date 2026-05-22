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
    const parentNotifications = students
      .filter((s) => s.parent)
      .map((s) =>
        prisma.notification.create({
          data: {
            user_id: s.parent.id,
            message: `Bus has started for route "${routeName}". It's on the way!`,
            type: 'info',
            school_id: schoolId,
          },
        })
      );
    await Promise.all(parentNotifications);

    students.filter((s) => s.parent).forEach((s) => {
      io?.to(`parent-${s.parent.id}`).emit('trip-started', { route_id, route_name: routeName });
    });

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

    const msg = `Bus has completed route "${trip.route.name}". All students have arrived.`;
    const notifs = students.filter((s) => s.parent).map((s) =>
      prisma.notification.create({ data: { user_id: s.parent.id, message: msg, type: 'success', school_id: schoolId } })
    );
    await Promise.all(notifs);

    students.filter((s) => s.parent).forEach((s) => {
      io?.to(`parent-${s.parent.id}`).emit('trip-completed', { route_id: trip.route_id });
    });

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
