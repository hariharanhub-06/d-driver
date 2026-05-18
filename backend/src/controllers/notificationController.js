const prisma = require('../prisma');

const getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;

        const notifications = await prisma.notification.findMany({
            where: { user_id: userId },
            orderBy: { created_at: 'desc' },
            take: 50,
        });

        res.json(notifications);
    } catch (error) {
        console.error('getNotifications error:', error);
        res.status(500).json({ error: 'Error fetching notifications' });
    }
};

const markRead = async (req, res) => {
    try {
        const { id } = req.params;

        const updated = await prisma.notification.update({
            where: { id },
            data: { is_read: true },
        });

        res.json(updated);
    } catch (error) {
        console.error('markRead error:', error);
        res.status(500).json({ error: 'Error marking notification as read' });
    }
};

const markAllRead = async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await prisma.notification.updateMany({
            where: { user_id: userId, is_read: false },
            data: { is_read: true },
        });

        res.json({ updated: result.count });
    } catch (error) {
        console.error('markAllRead error:', error);
        res.status(500).json({ error: 'Error marking all notifications as read' });
    }
};

const getUnreadCount = async (req, res) => {
    try {
        const userId = req.user.id;

        const count = await prisma.notification.count({
            where: { user_id: userId, is_read: false },
        });

        res.json({ count });
    } catch (error) {
        console.error('getUnreadCount error:', error);
        res.status(500).json({ error: 'Error fetching unread count' });
    }
};

module.exports = { getNotifications, markRead, markAllRead, getUnreadCount };
