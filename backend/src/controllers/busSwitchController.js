const prisma = require('../prisma');

// POST /api/v1/bus-switch
const requestSwitch = async (req, res) => {
  try {
    const { reason, notes, km_at_switch } = req.body;
    let { original_bus_id } = req.body;
    const driverId = req.user.id;
    const schoolId = req.user.school_id;
    const io = req.app.get('io');

    const driver = await prisma.driver.findUnique({
      where: { user_id: driverId },
      include: { user: { select: { name: true } } },
    });
    if (!driver) return res.status(404).json({ error: 'Driver profile not found' });

    // Auto-fill from driver's currently assigned bus if not provided
    if (!original_bus_id) original_bus_id = driver.assigned_bus_id;
    if (!original_bus_id) return res.status(400).json({ error: 'No bus assigned to this driver' });

    let activeShift = await prisma.driverShift.findFirst({
      where: { driver_id: driver.id, status: 'active', school_id: schoolId },
    });
    // Auto-create a shift if none is open (driver may have started a trip without starting a shift)
    if (!activeShift) {
      activeShift = await prisma.driverShift.create({
        data: { driver_id: driver.id, school_id: schoolId, start_time: new Date(), status: 'active' },
      });
    }

    const ops = [
      prisma.busSwitchLog.create({
        data: { shift_id: activeShift.id, driver_id: driver.id, original_bus_id, new_bus_id: null, reason, notes, km_at_switch: km_at_switch ?? null, school_id: schoolId },
      }),
    ];

    // Only create km entry if km_at_switch was provided
    if (km_at_switch != null) {
      ops.push(
        prisma.shiftKmEntry.create({
          data: { shift_id: activeShift.id, bus_id: original_bus_id, km_reading: km_at_switch, entry_type: 'bus_switch', note: `Switched bus — reason: ${reason}` },
        })
      );
    }

    const [switchLog] = await prisma.$transaction(ops);

    // Notify all admins in this school
    io?.to(`admin-${schoolId}`).emit('bus-switch-requested', {
      driver_name: driver.user?.name,
      original_bus_id,
      new_bus_id: null,
      reason,
      switch_log_id: switchLog.id,
    });

    res.status(201).json({ switch_log: switchLog });
  } catch (error) {
    console.error('requestSwitch error:', error.message);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

// PUT /api/v1/bus-switch/:id/assign
const assignNewBus = async (req, res) => {
  try {
    const { new_bus_id } = req.body;
    const io = req.app.get('io');

    const switchLog = await prisma.busSwitchLog.findUnique({
      where: { id: req.params.id },
      include: { driver: { include: { user: true } } },
    });
    if (!switchLog) return res.status(404).json({ error: 'Switch log not found' });

    // Mark the switch log as resolved and update the driver's assigned bus
    await Promise.all([
      prisma.busSwitchLog.update({ where: { id: switchLog.id }, data: { new_bus_id } }),
      prisma.driver.update({ where: { id: switchLog.driver_id }, data: { assigned_bus_id: new_bus_id } }),
    ]);

    const newBus = await prisma.bus.findUnique({ where: { id: new_bus_id } });

    // Find the replacement driver on the new bus (if any)
    const replacementDriver = await prisma.driver.findFirst({
      where: { assigned_bus_id: new_bus_id },
      include: { user: { select: { name: true, phone: true } } },
    });

    // Notify the driver — include replacement driver contact if available
    const contactInfo = replacementDriver?.user
      ? ` Coordinate with ${replacementDriver.user.name}${replacementDriver.user.phone ? ` (${replacementDriver.user.phone})` : ''}.`
      : '';

    const { notifyUser } = require('../utils/notifications');
    await notifyUser(
      switchLog.driver.user_id,
      `New bus assigned: Bus #${newBus?.bus_number}.${contactInfo}`,
      'success',
      switchLog.school_id
    );

    io?.to(`driver-${switchLog.driver.user_id}`).emit('bus-assigned', {
      new_bus_id,
      bus_number: newBus?.bus_number,
      replacement_driver_name: replacementDriver?.user?.name || null,
      replacement_driver_phone: replacementDriver?.user?.phone || null,
      message: `You have been assigned Bus #${newBus?.bus_number}`,
    });

    res.json({ message: 'New bus assigned to driver', bus: newBus });
  } catch (error) {
    console.error('assignNewBus error:', error.message);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

// GET /api/v1/bus-switch
const listSwitchLogs = async (req, res) => {
  try {
    const logs = await prisma.busSwitchLog.findMany({
      where: { school_id: req.schoolId },
      orderBy: { switched_at: 'desc' },
      take: 100,
      include: {
        driver: { include: { user: { select: { name: true } } } },
        originalBus: { select: { id: true, bus_number: true } },
        newBus: { select: { id: true, bus_number: true } },
      },
    });

    // Shape response to match frontend types (snake_case fields + derived status)
    const shaped = logs.map(l => ({
      id: l.id,
      driver: l.driver,
      original_bus: l.originalBus,
      new_bus: l.newBus,
      reason: l.reason,
      notes: l.notes,
      km_at_switch: l.km_at_switch,
      status: l.new_bus_id ? 'resolved' : 'pending',
      created_at: l.switched_at,
    }));

    res.json(shaped);
  } catch (error) {
    console.error('listSwitchLogs error:', error.message);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

module.exports = { requestSwitch, assignNewBus, listSwitchLogs };
