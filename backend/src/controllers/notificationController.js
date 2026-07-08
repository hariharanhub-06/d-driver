const prisma = require('../prisma');

const getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;

        const notifications = await prisma.notification.findMany({
            where: { user_id: userId },
            orderBy: { created_at: 'desc' },
            take: 50,
            include: { school: { select: { name: true } } },
        });

        // Flatten the school name so the client can show "which school" (matters for
        // super-admins who oversee multiple schools).
        res.json(notifications.map(n => ({ ...n, school_name: n.school?.name || null })));
    } catch (error) {
        console.error('getNotifications error:', error);
        res.status(500).json({ error: 'Error fetching notifications' });
    }
};

const markRead = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Only allow the owner to mark their own notification as read
        const notification = await prisma.notification.findFirst({
            where: { id, user_id: userId },
        });
        if (!notification) return res.status(404).json({ error: 'Notification not found' });

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

// POST /notifications/push-token — mobile app registers its Expo push token.
const savePushToken = async (req, res) => {
    try {
        const { expo_push_token } = req.body;
        if (!expo_push_token) return res.status(400).json({ error: 'expo_push_token is required' });
        await prisma.user.update({
            where: { id: req.user.id },
            data: { expo_push_token },
        });
        res.json({ ok: true });
    } catch (error) {
        console.error('savePushToken error:', error.message);
        res.status(500).json({ error: 'Error saving push token' });
    }
};

// GET /notifications/vapid-public-key — the browser needs this to subscribe.
const getVapidPublicKey = async (req, res) => {
    const { getPublicKey } = require('../utils/webPush');
    res.json({ publicKey: getPublicKey() });
};

// POST /notifications/web-push/subscribe — browser/PWA registers a push subscription.
const saveWebPushSubscription = async (req, res) => {
    try {
        const { endpoint, keys } = req.body || {};
        if (!endpoint || !keys?.p256dh || !keys?.auth) {
            return res.status(400).json({ error: 'A valid push subscription is required.' });
        }
        // endpoint is globally unique; upsert so re-subscribing (or a device that
        // switched users) just re-points the existing row instead of duplicating.
        await prisma.pushSubscription.upsert({
            where: { endpoint },
            create: {
                user_id: req.user.id, endpoint,
                p256dh: keys.p256dh, auth: keys.auth,
                user_agent: req.headers['user-agent'] || null,
            },
            update: { user_id: req.user.id, p256dh: keys.p256dh, auth: keys.auth },
        });
        res.json({ ok: true });
    } catch (error) {
        console.error('saveWebPushSubscription error:', error.message);
        res.status(500).json({ error: 'Error saving push subscription' });
    }
};

// POST /notifications/web-push/unsubscribe — remove a subscription (e.g. on logout).
const deleteWebPushSubscription = async (req, res) => {
    try {
        const { endpoint } = req.body || {};
        if (endpoint) {
            await prisma.pushSubscription.deleteMany({ where: { endpoint, user_id: req.user.id } });
        }
        res.json({ ok: true });
    } catch (error) {
        console.error('deleteWebPushSubscription error:', error.message);
        res.status(500).json({ error: 'Error removing push subscription' });
    }
};

module.exports = {
    getNotifications, markRead, markAllRead, getUnreadCount, savePushToken,
    getVapidPublicKey, saveWebPushSubscription, deleteWebPushSubscription,
};
