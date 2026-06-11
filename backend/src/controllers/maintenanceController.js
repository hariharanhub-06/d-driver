const prisma = require('../prisma');
const { notifyAdmins, notifyUser } = require('../utils/notifications');

let _io = null;
const setIo = (io) => { _io = io; };

// POST /maintenance — driver submits maintenance expense
const createMaintenance = async (req, res) => {
    try {
        const { bus_id, date, description, items } = req.body;
        const schoolId = req.user.school_id;

        const driver = await prisma.driver.findUnique({
            where: { user_id: req.user.id },
            include: { user: { select: { name: true } } },
        });
        if (!driver) return res.status(404).json({ error: 'Driver not found' });

        const parsedItems = Array.isArray(items) ? items : [];
        const total_cost = parsedItems.reduce((sum, i) => sum + (parseFloat(i.cost) || 0), 0);

        const record = await prisma.maintenanceRecord.create({
            data: {
                bus_id: bus_id || driver.assigned_bus_id,
                driver_id: driver.id,
                school_id: schoolId,
                date: new Date(date),
                description,
                items: parsedItems,
                total_cost,
                status: 'pending',
            },
        });

        const busInfo = await prisma.bus.findUnique({ where: { id: record.bus_id }, select: { bus_number: true } });
        await notifyAdmins(
            schoolId,
            `Maintenance expense submitted by ${driver.user.name} for Bus ${busInfo?.bus_number || ''} — ₹${total_cost.toLocaleString('en-IN')}`,
            'alert'
        );

        if (_io) _io.to(`admin-${schoolId}`).emit('maintenance-submitted', record);

        res.status(201).json(record);
    } catch (err) {
        console.error('createMaintenance error:', err);
        res.status(500).json({ error: 'Failed to submit maintenance' });
    }
};

// GET /maintenance — admin/SA lists maintenance records
const getMaintenance = async (req, res) => {
    try {
        const schoolId = req.schoolId || req.user.school_id;
        const where = schoolId ? { school_id: schoolId } : {};
        if (req.saSchoolIds) where.school_id = { in: req.saSchoolIds };

        const records = await prisma.maintenanceRecord.findMany({
            where,
            orderBy: { created_at: 'desc' },
        });

        const enriched = await Promise.all(records.map(async (r) => {
            const [driver, bus] = await Promise.all([
                prisma.driver.findUnique({ where: { id: r.driver_id }, include: { user: { select: { name: true } } } }),
                prisma.bus.findUnique({ where: { id: r.bus_id }, select: { bus_number: true } }),
            ]);
            return { ...r, driver_name: driver?.user?.name, bus_number: bus?.bus_number };
        }));

        res.json(enriched);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch maintenance records' });
    }
};

// GET /maintenance/mine — driver views their own submissions
const getMyMaintenance = async (req, res) => {
    try {
        const driver = await prisma.driver.findUnique({ where: { user_id: req.user.id } });
        if (!driver) return res.json([]);

        const records = await prisma.maintenanceRecord.findMany({
            where: { driver_id: driver.id },
            orderBy: { created_at: 'desc' },
        });

        const enriched = await Promise.all(records.map(async (r) => {
            const bus = await prisma.bus.findUnique({ where: { id: r.bus_id }, select: { bus_number: true } });
            return { ...r, bus_number: bus?.bus_number };
        }));

        res.json(enriched);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch maintenance records' });
    }
};

// PUT /maintenance/:id — admin approves or rejects
const updateMaintenance = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, admin_note } = req.body;

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const record = await prisma.maintenanceRecord.update({
            where: { id },
            data: { status, admin_note: admin_note || null },
        });

        // Notify driver
        const driver = await prisma.driver.findUnique({
            where: { id: record.driver_id },
            include: { user: { select: { id: true } } },
        });
        if (driver) {
            const msg = status === 'approved'
                ? `Your maintenance expense (₹${record.total_cost.toLocaleString('en-IN')}) has been approved.`
                : `Your maintenance expense (₹${record.total_cost.toLocaleString('en-IN')}) was rejected.${admin_note ? ` Reason: ${admin_note}` : ''}`;
            await notifyUser(driver.user.id, msg, status === 'approved' ? 'success' : 'alert', record.school_id);
            if (_io) _io.to(`user-${driver.user.id}`).emit('maintenance-updated', record);
        }

        res.json(record);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update maintenance record' });
    }
};

module.exports = { createMaintenance, getMaintenance, getMyMaintenance, updateMaintenance, setIo };
