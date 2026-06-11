const prisma = require('../prisma');

// POST /api/v1/fuel/fill
const recordFuelFill = async (req, res) => {
  try {
    const { liters_filled, km_at_fill } = req.body;
    let { bus_id } = req.body;
    const driverId = req.user.id;
    const schoolId = req.user.school_id;

    if (!liters_filled || liters_filled <= 0) {
      return res.status(400).json({ error: 'liters_filled is required and must be > 0' });
    }

    const driver = await prisma.driver.findUnique({
      where: { user_id: driverId },
      include: { bus: { select: { id: true } } },
    });
    if (!driver) return res.status(404).json({ error: 'Driver profile not found' });

    // Auto-resolve bus_id from driver's assigned bus if not provided
    if (!bus_id) bus_id = driver.bus?.id || driver.assigned_bus_id;
    if (!bus_id) return res.status(400).json({ error: 'No bus assigned to this driver' });

    const updateData = { fuel_liters: { increment: liters_filled } };
    if (km_at_fill) updateData.last_fuel_km = km_at_fill;

    const [entry] = await prisma.$transaction([
      prisma.fuelFillEntry.create({
        data: { driver_id: driver.id, bus_id, liters_filled, km_at_fill: km_at_fill || null, school_id: schoolId },
      }),
      prisma.bus.update({
        where: { id: bus_id },
        data: updateData,
      }),
    ]);

    res.status(201).json({ entry });
  } catch (error) {
    console.error('recordFuelFill error:', error.message);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

// POST /api/v1/fuel/request
const requestFuel = async (req, res) => {
  try {
    const { bus_id, amount_requested, current_km, reason } = req.body;
    const driverId = req.user.id;
    const schoolId = req.user.school_id;
    const io = req.app.get('io');

    const driver = await prisma.driver.findUnique({ where: { user_id: driverId } });
    if (!driver) return res.status(404).json({ error: 'Driver profile not found' });

    const fuelRequest = await prisma.fuelRequest.create({
      data: { driver_id: driver.id, bus_id, amount_requested, current_km, reason, school_id: schoolId },
    });

    io?.to(`admin-${schoolId}`).emit('fuel-request', {
      driver_id: driver.id,
      bus_id,
      amount_requested,
      request_id: fuelRequest.id,
    });

    res.status(201).json({ request: fuelRequest });
  } catch (error) {
    console.error('requestFuel error:', error.message);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

// GET /api/v1/fuel/requests  (admin)
const listRequests = async (req, res) => {
  try {
    const { getSchoolFilter } = require('../middleware/authMiddleware');
    const { status } = req.query;
    const where = { ...getSchoolFilter(req) };
    if (status) where.status = status;

    const requests = await prisma.fuelRequest.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: 100,
      include: {
        driver: { include: { user: { select: { name: true } } } },
        bus: { select: { bus_number: true, fuel_liters: true } },
      },
    });
    res.json({ requests });
  } catch (error) {
    console.error('listRequests error:', error.message);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

// PUT /api/v1/fuel/requests/:id  (admin: approve | reject | disburse)
const updateRequest = async (req, res) => {
  try {
    const { status, admin_note, payment_method, transfer_id } = req.body;
    const io = req.app.get('io');

    if (!['approved', 'rejected', 'disbursed'].includes(status)) {
      return res.status(400).json({ error: 'Status must be approved, rejected, or disbursed' });
    }

    const updateData = { status, admin_note: admin_note || null };
    if (status === 'approved') {
      if (payment_method) updateData.admin_note = `Payment: ${payment_method === 'account_transfer' ? `Bank Transfer (Ref: ${transfer_id || 'N/A'})` : 'Cash'}${admin_note ? ` — ${admin_note}` : ''}`;
    }

    const fuelRequest = await prisma.fuelRequest.update({
      where: { id: req.params.id },
      data: updateData,
      include: { driver: { include: { user: true } } },
    });

    const msg = status === 'approved'
      ? `Fuel request of ₹${fuelRequest.amount_requested} approved`
      : status === 'disbursed'
      ? `Fuel funds of ₹${fuelRequest.amount_requested} have been disbursed`
      : `Fuel request rejected. ${admin_note || ''}`;

    await prisma.notification.create({
      data: { user_id: fuelRequest.driver.user_id, message: msg, type: status === 'rejected' ? 'alert' : 'success', school_id: fuelRequest.school_id },
    });

    io?.to(`driver-${fuelRequest.driver.user_id}`).emit('fuel-request-updated', { status, message: msg });

    res.json({ request: fuelRequest });
  } catch (error) {
    console.error('updateRequest error:', error.message);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

// GET /api/v1/fuel/requests/mine  (driver)
const myRequests = async (req, res) => {
  try {
    const driver = await prisma.driver.findUnique({ where: { user_id: req.user.id } });
    if (!driver) return res.status(404).json({ error: 'Driver profile not found' });

    const requests = await prisma.fuelRequest.findMany({
      where: { driver_id: driver.id },
      orderBy: { created_at: 'desc' },
      take: 30,
      include: { bus: { select: { bus_number: true } } },
    });
    res.json({ requests });
  } catch (error) {
    console.error('myRequests error:', error.message);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

// GET /api/v1/fuel/fills — admin sees all fill entries for their school
const listFills = async (req, res) => {
  try {
    const { getSchoolFilter } = require('../middleware/authMiddleware');
    const fills = await prisma.fuelFillEntry.findMany({
      where: getSchoolFilter(req),
      orderBy: { filled_at: 'desc' },
      take: 200,
      include: {
        driver: { include: { user: { select: { name: true } } } },
        bus: { select: { bus_number: true } },
      },
    });
    res.json(fills);
  } catch (error) {
    console.error('listFills error:', error.message);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

// GET /api/v1/fuel/bus-summary  (admin) — per-bus fuel stats
const busSummary = async (req, res) => {
  try {
    const { getSchoolFilter } = require('../middleware/authMiddleware');
    const buses = await prisma.bus.findMany({
      where: getSchoolFilter(req),
      select: {
        id: true,
        bus_number: true,
        fuel_liters: true,
        fuelRequests: {
          select: { amount_requested: true, status: true },
        },
        fuelFillEntries: {
          orderBy: { filled_at: 'desc' },
          select: { liters_filled: true, filled_at: true, km_at_fill: true },
        },
      },
    });

    const summary = buses.map(bus => {
      const disbursed = bus.fuelRequests
        .filter(r => r.status === 'disbursed')
        .reduce((s, r) => s + r.amount_requested, 0);
      const approved = bus.fuelRequests
        .filter(r => r.status === 'approved')
        .reduce((s, r) => s + r.amount_requested, 0);
      const pending = bus.fuelRequests
        .filter(r => r.status === 'pending')
        .reduce((s, r) => s + r.amount_requested, 0);
      const totalLiters = bus.fuelFillEntries.reduce((s, f) => s + f.liters_filled, 0);
      const lastFill = bus.fuelFillEntries[0] || null;

      return {
        bus_id: bus.id,
        bus_number: bus.bus_number,
        current_fuel_liters: bus.fuel_liters || 0,
        total_disbursed: disbursed,
        total_approved: approved,
        total_pending: pending,
        total_liters_filled: totalLiters,
        fill_count: bus.fuelFillEntries.length,
        last_fill_at: lastFill?.filled_at || null,
        last_fill_liters: lastFill?.liters_filled || null,
      };
    });

    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching bus fuel summary', details: error.message });
  }
};

module.exports = { recordFuelFill, requestFuel, listRequests, updateRequest, myRequests, listFills, busSummary };
