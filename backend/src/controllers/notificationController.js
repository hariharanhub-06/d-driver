const prisma = require('../prisma');

const getNotifications = async (req, res) => {
    try {
        const { schoolId } = req.query;
        const notifications = await prisma.notification.findMany({
            where: schoolId ? { school_id: schoolId } : {},
            orderBy: { created_at: 'desc' }
        });
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching notifications', error: error.message });
    }
};

const markRead = async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await prisma.notification.update({
            where: { id },
            data: { type: 'read' }
        });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: 'Error marking notification', error: error.message });
    }
};

module.exports = { getNotifications, markRead };
