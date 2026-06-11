const prisma = require('../prisma');
const { notifyAdmins, notifyUser } = require('../utils/notifications');

let _io = null;
const setIo = (io) => { _io = io; };

// POST /sos/trigger — driver triggers SOS
const triggerSOS = async (req, res) => {
    try {
        const { latitude, longitude } = req.body;
        const userId = req.user.id;
        const schoolId = req.user.school_id;

        const driver = await prisma.driver.findUnique({
            where: { user_id: userId },
            include: { user: { select: { name: true } }, bus: { select: { bus_number: true } } },
        });
        if (!driver) return res.status(404).json({ error: 'Driver not found' });
        if (!driver.assigned_bus_id) return res.status(400).json({ error: 'No bus assigned. SOS alert requires a bus.' });

        const sos = await prisma.sosAlert.create({
            data: {
                driver_id: driver.id,
                bus_id: driver.assigned_bus_id,
                school_id: schoolId,
                latitude: latitude || null,
                longitude: longitude || null,
                status: 'active',
            },
        });

        const busLabel = driver.bus?.bus_number ? ` (Bus ${driver.bus.bus_number})` : '';
        const message = `🚨 SOS ALERT: Driver ${driver.user.name}${busLabel} needs emergency assistance!`;

        // Notify all admins in school — DB + socket
        const admins = await prisma.user.findMany({
            where: { school_id: schoolId, role: 'admin', is_active: true },
            select: { id: true },
        });
        await Promise.all(admins.map(a => notifyUser(a.id, message, 'alert', schoolId)));

        // Real-time socket to admin room
        if (_io) {
            _io.to(`admin-${schoolId}`).emit('sos-alert', {
                ...sos,
                driver_name: driver.user.name,
                bus_number: driver.bus?.bus_number,
            });
        }

        res.status(201).json(sos);
    } catch (err) {
        console.error('triggerSOS error:', err);
        res.status(500).json({ error: 'Failed to trigger SOS' });
    }
};

// PUT /sos/:id/cancel — driver cancels their own SOS
const cancelSOS = async (req, res) => {
    try {
        const { id } = req.params;
        const driver = await prisma.driver.findUnique({ where: { user_id: req.user.id } });
        if (!driver) return res.status(404).json({ error: 'Driver not found' });

        const sos = await prisma.sosAlert.findUnique({ where: { id } });
        if (!sos || sos.driver_id !== driver.id) return res.status(403).json({ error: 'Forbidden' });

        const updated = await prisma.sosAlert.update({
            where: { id },
            data: { status: 'resolved', resolved_note: 'Cancelled by driver' },
        });

        if (_io) {
            _io.to(`admin-${sos.school_id}`).emit('sos-cancelled', { id });
        }

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: 'Failed to cancel SOS' });
    }
};

// PUT /sos/:id/resolve — admin resolves SOS
const resolveSOS = async (req, res) => {
    try {
        const { id } = req.params;
        const { note } = req.body;

        const updated = await prisma.sosAlert.update({
            where: { id },
            data: { status: 'resolved', resolved_by: req.user.id, resolved_note: note || null },
        });

        // Notify driver that SOS was resolved
        const driver = await prisma.driver.findUnique({
            where: { id: updated.driver_id },
            include: { user: { select: { id: true } } },
        });
        if (driver) {
            await notifyUser(driver.user.id, 'Your SOS alert has been acknowledged and resolved by admin.', 'success', updated.school_id);
            if (_io) {
                _io.to(`user-${driver.user.id}`).emit('sos-resolved', { id });
            }
        }

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: 'Failed to resolve SOS' });
    }
};

// GET /sos — admin sees all SOS alerts for their school
const getSOSAlerts = async (req, res) => {
    try {
        const schoolId = req.user.school_id;
        const alerts = await prisma.sosAlert.findMany({
            where: { school_id: schoolId },
            orderBy: { triggered_at: 'desc' },
        });

        // Enrich with driver + bus info
        const enriched = await Promise.all(alerts.map(async (alert) => {
            const driver = await prisma.driver.findUnique({
                where: { id: alert.driver_id },
                include: { user: { select: { name: true, phone: true } }, bus: { select: { bus_number: true } } },
            });
            return {
                ...alert,
                driver_name: driver?.user?.name,
                driver_phone: driver?.user?.phone,
                bus_number: driver?.bus?.bus_number,
            };
        }));

        res.json(enriched);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch SOS alerts' });
    }
};

// GET /sos/mine — driver sees their own SOS (active one)
const getMyActiveSOS = async (req, res) => {
    try {
        const driver = await prisma.driver.findUnique({ where: { user_id: req.user.id } });
        if (!driver) return res.json(null);

        const sos = await prisma.sosAlert.findFirst({
            where: { driver_id: driver.id, status: 'active' },
            orderBy: { triggered_at: 'desc' },
        });
        res.json(sos);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch SOS' });
    }
};

module.exports = { triggerSOS, cancelSOS, resolveSOS, getSOSAlerts, getMyActiveSOS, setIo };
