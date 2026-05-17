const prisma = require('../prisma');

// POST /api/v1/shifts/start
const startShift = async (req, res) => {
  const { bus_id, start_km } = req.body;
  const driverId = req.user.id;
  const schoolId = req.user.school_id;

  const driver = await prisma.driver.findUnique({ where: { user_id: driverId } });
  if (!driver) return res.status(404).json({ error: 'Driver profile not found' });

  // Prevent double-open shift
  const existing = await prisma.driverShift.findFirst({
    where: { driver_id: driver.id, status: 'active', school_id: schoolId },
  });
  if (existing) return res.status(409).json({ error: 'You already have an active shift. End it before starting a new one.' });

  const shift = await prisma.driverShift.create({
    data: {
      driver_id: driver.id,
      school_id: schoolId,
      start_time: new Date(),
      status: 'active',
      kmEntries: {
        create: { bus_id, km_reading: start_km, entry_type: 'shift_start' },
      },
    },
    include: { kmEntries: true },
  });

  res.status(201).json({ shift });
};

// POST /api/v1/shifts/km-entry
const addKmEntry = async (req, res) => {
  const { bus_id, km_reading, entry_type, note } = req.body;
  const driverId = req.user.id;
  const schoolId = req.user.school_id;

  const driver = await prisma.driver.findUnique({ where: { user_id: driverId } });
  if (!driver) return res.status(404).json({ error: 'Driver profile not found' });

  const shift = await prisma.driverShift.findFirst({
    where: { driver_id: driver.id, status: 'active', school_id: schoolId },
  });
  if (!shift) return res.status(404).json({ error: 'No active shift found' });

  const entry = await prisma.shiftKmEntry.create({
    data: { shift_id: shift.id, bus_id, km_reading, entry_type, note },
  });

  // Update bus total_km_run if this is a route_end or shift_end reading
  if (['route_end', 'shift_end'].includes(entry_type)) {
    await prisma.bus.update({
      where: { id: bus_id },
      data: { total_km_run: km_reading },
    });
  }

  res.status(201).json({ entry });
};

// POST /api/v1/shifts/end
const endShift = async (req, res) => {
  const { end_km, bus_id } = req.body;
  const driverId = req.user.id;
  const schoolId = req.user.school_id;

  const driver = await prisma.driver.findUnique({ where: { user_id: driverId } });
  if (!driver) return res.status(404).json({ error: 'Driver profile not found' });

  const shift = await prisma.driverShift.findFirst({
    where: { driver_id: driver.id, status: 'active', school_id: schoolId },
    include: { kmEntries: { orderBy: { recorded_at: 'asc' } } },
  });
  if (!shift) return res.status(404).json({ error: 'No active shift found' });

  const startEntry = shift.kmEntries.find((e) => e.entry_type === 'shift_start');
  const totalKm = startEntry ? end_km - startEntry.km_reading : 0;

  await prisma.$transaction([
    prisma.shiftKmEntry.create({
      data: { shift_id: shift.id, bus_id: bus_id || shift.kmEntries[0]?.bus_id, km_reading: end_km, entry_type: 'shift_end' },
    }),
    prisma.driverShift.update({
      where: { id: shift.id },
      data: { status: 'completed', end_time: new Date() },
    }),
  ]);

  res.json({ message: 'Shift ended', total_km: totalKm });
};

// GET /api/v1/shifts  (admin)
const listShifts = async (req, res) => {
  const schoolId = req.schoolId;
  const { driver_id, date, limit = 50 } = req.query;

  const where = { school_id: schoolId };
  if (driver_id) where.driver_id = driver_id;
  if (date) {
    const d = new Date(date);
    where.date = { gte: d, lt: new Date(d.getTime() + 86400000) };
  }

  const shifts = await prisma.driverShift.findMany({
    where,
    take: parseInt(limit),
    orderBy: { date: 'desc' },
    include: {
      driver: { include: { user: { select: { name: true } } } },
      kmEntries: { orderBy: { recorded_at: 'asc' } },
      busSwitches: true,
    },
  });

  res.json({ shifts });
};

// GET /api/v1/shifts/mine  (driver)
const myShifts = async (req, res) => {
  const driver = await prisma.driver.findUnique({ where: { user_id: req.user.id } });
  if (!driver) return res.status(404).json({ error: 'Driver profile not found' });

  const shifts = await prisma.driverShift.findMany({
    where: { driver_id: driver.id },
    take: 30,
    orderBy: { date: 'desc' },
    include: { kmEntries: { orderBy: { recorded_at: 'asc' } } },
  });

  res.json({ shifts });
};

// GET /api/v1/shifts/:id/entries  (admin)
const getShiftEntries = async (req, res) => {
  const shift = await prisma.driverShift.findUnique({
    where: { id: req.params.id },
    include: {
      kmEntries: { orderBy: { recorded_at: 'asc' }, include: { bus: true } },
      busSwitches: true,
    },
  });
  if (!shift || shift.school_id !== req.schoolId) return res.status(404).json({ error: 'Shift not found' });
  res.json({ shift });
};

module.exports = { startShift, addKmEntry, endShift, listShifts, myShifts, getShiftEntries };
