const prisma = require('../prisma');

// POST /api/v1/fuel/fill
const recordFuelFill = async (req, res) => {
  const { bus_id, liters_filled, km_at_fill } = req.body;
  const driverId = req.user.id;
  const schoolId = req.user.school_id;

  const driver = await prisma.driver.findUnique({ where: { user_id: driverId } });
  if (!driver) return res.status(404).json({ error: 'Driver profile not found' });

  const [entry] = await prisma.$transaction([
    prisma.fuelFillEntry.create({
      data: { driver_id: driver.id, bus_id, liters_filled, km_at_fill, school_id: schoolId },
    }),
    prisma.bus.update({
      where: { id: bus_id },
      data: { fuel_liters: liters_filled, last_fuel_km: km_at_fill },
    }),
  ]);

  res.status(201).json({ entry });
};

// POST /api/v1/fuel/request
const requestFuel = async (req, res) => {
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
};

// GET /api/v1/fuel/requests  (admin)
const listRequests = async (req, res) => {
  const { status } = req.query;
  const where = { school_id: req.schoolId };
  if (status) where.status = status;

  const requests = await prisma.fuelRequest.findMany({
    where,
    orderBy: { created_at: 'desc' },
    take: 100,
    include: {
      driver: { include: { user: { select: { name: true } } } },
      bus: { select: { bus_number: true } },
    },
  });
  res.json({ requests });
};

// PUT /api/v1/fuel/requests/:id  (admin: approve | reject | disburse)
const updateRequest = async (req, res) => {
  const { status, admin_note } = req.body;
  const io = req.app.get('io');

  if (!['approved', 'rejected', 'disbursed'].includes(status)) {
    return res.status(400).json({ error: 'Status must be approved, rejected, or disbursed' });
  }

  const fuelRequest = await prisma.fuelRequest.update({
    where: { id: req.params.id },
    data: { status, admin_note },
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
};

// GET /api/v1/fuel/requests/mine  (driver)
const myRequests = async (req, res) => {
  const driver = await prisma.driver.findUnique({ where: { user_id: req.user.id } });
  if (!driver) return res.status(404).json({ error: 'Driver profile not found' });

  const requests = await prisma.fuelRequest.findMany({
    where: { driver_id: driver.id },
    orderBy: { created_at: 'desc' },
    take: 30,
    include: { bus: { select: { bus_number: true } } },
  });
  res.json({ requests });
};

module.exports = { recordFuelFill, requestFuel, listRequests, updateRequest, myRequests };
