const prisma = require('../prisma');

// POST /api/v1/trips/start  (also POST /api/v1/trips/)
const startTrip = async (req, res) => {
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

  // One active trip per route at a time
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

  // Notify all parents on this route — bus started
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

  // Emit via Socket.io to all parents on this route
  students.filter((s) => s.parent).forEach((s) => {
    io?.to(`parent-${s.parent.id}`).emit('trip-started', { route_id, route_name: routeName });
  });

  // Prompt driver for KM entry
  io?.to(`driver-${driverId}`).emit('request-km-entry', { entry_type: 'route_start', message: 'Enter current odometer reading to start trip' });

  res.status(201).json({ trip });
};

// PATCH /api/v1/trips/:id/stop-index
const updateStopIndex = async (req, res) => {
  const { stop_index } = req.body;
  const trip = await prisma.activeTrip.update({
    where: { id: req.params.id },
    data: { current_stop_index: stop_index },
  });
  res.json({ trip });
};

// POST /api/v1/trips/:id/complete
const completeTrip = async (req, res) => {
  const io = req.app.get('io');
  const schoolId = req.user.school_id;

  const trip = await prisma.activeTrip.update({
    where: { id: req.params.id },
    data: { status: 'completed', completed_at: new Date() },
    include: { route: true },
  });

  // Notify parents on this route — arrived
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

  // Prompt driver for end KM
  io?.to(`driver-${req.user.id}`).emit('request-km-entry', { entry_type: 'route_end', message: 'Enter odometer reading to close trip' });

  res.json({ trip });
};

// GET /api/v1/trips/active
const getActiveTrips = async (req, res) => {
  const schoolId = req.user.role === 'driver' ? req.user.school_id : req.schoolId;
  const where = { school_id: schoolId, status: 'running' };

  // Drivers only see their own active trips
  if (req.user.role === 'driver') {
    const driver = await prisma.driver.findUnique({ where: { user_id: req.user.id }, select: { id: true } });
    if (driver) where.driver_id = driver.id;
  }

  const trips = await prisma.activeTrip.findMany({
    where,
    include: {
      route: {
        include: {
          stops: { orderBy: { sequence: 'asc' } },
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
};

module.exports = { startTrip, updateStopIndex, completeTrip, getActiveTrips };
