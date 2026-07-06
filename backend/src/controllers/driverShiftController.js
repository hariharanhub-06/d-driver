const prisma = require('../prisma');

// POST /api/v1/shifts/start
const startShift = async (req, res) => {
  try {
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
  } catch (error) {
    console.error('startShift error:', error.message);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

// POST /api/v1/shifts/km-entry
const addKmEntry = async (req, res) => {
  try {
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
  } catch (error) {
    console.error('addKmEntry error:', error.message);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

// POST /api/v1/shifts/end
const endShift = async (req, res) => {
  try {
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
  } catch (error) {
    console.error('endShift error:', error.message);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

// GET /api/v1/shifts/active  (driver — returns own active shift or null)
const getActiveShift = async (req, res) => {
  try {
    const driverId = req.user.id;
    const schoolId = req.user.school_id;

    const driver = await prisma.driver.findUnique({ where: { user_id: driverId } });
    if (!driver) return res.status(404).json({ error: 'Driver profile not found' });

    const shift = await prisma.driverShift.findFirst({
      where: { driver_id: driver.id, status: 'active', school_id: schoolId },
      include: { kmEntries: { orderBy: { recorded_at: 'asc' } } },
    });

    res.json(shift || null);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching active shift', details: error.message });
  }
};

// GET /api/v1/shifts  (admin)
const listShifts = async (req, res) => {
  try {
    const { getSchoolFilter } = require('../middleware/authMiddleware');
    const { driver_id, from, to, limit = 50 } = req.query;

    const where = { ...getSchoolFilter(req) };
    if (driver_id) where.driver_id = driver_id;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(new Date(to).getTime() + 86399999);
    }

    const shifts = await prisma.driverShift.findMany({
      where,
      take: parseInt(limit),
      orderBy: { date: 'desc' },
      include: {
        driver: { include: { user: { select: { name: true } } } },
        kmEntries: {
          orderBy: { recorded_at: 'asc' },
          include: { bus: { select: { bus_number: true } } },
        },
      },
    });

    // Compute total_km from shift_start → shift_end entries; surface bus_number
    const enriched = shifts.map(s => {
      const startEntry = s.kmEntries.find(e => e.entry_type === 'shift_start');
      const endEntry   = s.kmEntries.find(e => e.entry_type === 'shift_end');
      const total_km   = startEntry && endEntry ? endEntry.km_reading - startEntry.km_reading : null;
      const bus_number = s.kmEntries[0]?.bus?.bus_number || null;
      return { ...s, total_km, bus_number };
    });

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching shifts', details: error.message });
  }
};

// GET /api/v1/shifts/mine  (driver)
const myShifts = async (req, res) => {
  try {
    const driver = await prisma.driver.findUnique({ where: { user_id: req.user.id } });
    if (!driver) return res.status(404).json({ error: 'Driver profile not found' });

    const shifts = await prisma.driverShift.findMany({
      where: { driver_id: driver.id },
      take: 30,
      orderBy: { date: 'desc' },
      include: { kmEntries: { orderBy: { recorded_at: 'asc' } } },
    });

    res.json({ shifts });
  } catch (error) {
    console.error('myShifts error:', error.message);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

// GET /api/v1/shifts/mine/summary  (driver) — lifetime + this-month distance totals
const myShiftSummary = async (req, res) => {
  try {
    const driver = await prisma.driver.findUnique({ where: { user_id: req.user.id } });
    if (!driver) return res.status(404).json({ error: 'Driver profile not found' });

    const shifts = await prisma.driverShift.findMany({
      where: { driver_id: driver.id },
      select: { id: true, date: true, kmEntries: { select: { km_reading: true } } },
    });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let total_km = 0;
    let month_km = 0;
    let shifts_with_distance = 0;
    for (const s of shifts) {
      const readings = (s.kmEntries || []).map(e => e.km_reading).filter(n => typeof n === 'number');
      if (readings.length < 2) continue;
      const dist = Math.max(0, Math.max(...readings) - Math.min(...readings));
      if (dist <= 0) continue;
      total_km += dist;
      shifts_with_distance += 1;
      if (s.date && new Date(s.date) >= monthStart) month_km += dist;
    }

    res.json({
      total_km: Math.round(total_km * 10) / 10,
      month_km: Math.round(month_km * 10) / 10,
      total_shifts: shifts.length,
      shifts_with_distance,
    });
  } catch (error) {
    console.error('myShiftSummary error:', error.message);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

// GET /api/v1/shifts/:id/entries  (admin)
const getShiftEntries = async (req, res) => {
  try {
    const shift = await prisma.driverShift.findUnique({
      where: { id: req.params.id },
      include: {
        kmEntries: { orderBy: { recorded_at: 'asc' }, include: { bus: true } },
        busSwitches: true,
      },
    });
    if (!shift || shift.school_id !== req.schoolId) return res.status(404).json({ error: 'Shift not found' });
    res.json({ shift });
  } catch (error) {
    console.error('getShiftEntries error:', error.message);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

module.exports = { startShift, addKmEntry, endShift, getActiveShift, listShifts, myShifts, myShiftSummary, getShiftEntries };
