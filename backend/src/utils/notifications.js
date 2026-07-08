const prisma = require('../prisma');
const { sendWebPush } = require('./webPush');

let _io = null;
const setIo = (io) => { _io = io; };

// Default mobile notification tone (bundled school-bus horn). Platform-wide.
const NOTIFICATION_SOUND = process.env.NOTIFICATION_SOUND || 'bus_horn.wav';
const ANDROID_CHANNEL_ID = 'alerts-horn-v1';

/**
 * Fire-and-forget Expo push to the Onlive mobile app. Plays the bus-horn tone.
 * Never throws — push is best-effort and must not block the request.
 */
const sendExpoPush = async (expoPushToken, title, body) => {
    if (!expoPushToken || typeof fetch !== 'function') return;
    try {
        await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: expoPushToken,
                title,
                body,
                sound: NOTIFICATION_SOUND,
                channelId: ANDROID_CHANNEL_ID,
                priority: 'high',
            }),
        });
    } catch (err) {
        console.error('sendExpoPush error:', err.message);
    }
};

/**
 * Send a notification to a specific user.
 * Saves to DB + emits socket event so the user sees it instantly, and sends a
 * native push (with the bus-horn tone) if the user has a registered device.
 */
const notifyUser = async (userId, message, type = 'info', schoolId = null) => {
    if (!userId || !schoolId) return;
    try {
        const notification = await prisma.notification.create({
            data: { user_id: userId, message, type, school_id: schoolId, is_read: false },
        });
        if (_io) {
            _io.to(`user-${userId}`).emit('new-notification', notification);
        }
        // Best-effort native push (won't block / throw).
        prisma.user.findUnique({ where: { id: userId }, select: { expo_push_token: true } })
            .then(u => { if (u?.expo_push_token) sendExpoPush(u.expo_push_token, 'Onlive', message); })
            .catch(() => {});
        // Best-effort browser/PWA web push (won't block / throw). Deep-link to the
        // in-app notifications view; SOS alerts open on whatever page is focused.
        sendWebPush(userId, 'Onlive', message, { url: '/', tag: type === 'alert' ? 'sos' : undefined })
            .catch(() => {});
        return notification;
    } catch (err) {
        console.error('notifyUser error:', err.message);
    }
};

/**
 * Send an in-app notification to all active admins of a school.
 */
const notifyAdmins = async (school_id, message, type = 'alert') => {
    if (!school_id) return;
    const admins = await prisma.user.findMany({
        where: { school_id, role: 'admin', is_active: true },
        select: { id: true },
    });
    if (admins.length === 0) return;
    await Promise.all(admins.map(a => notifyUser(a.id, message, type, school_id)));
};

module.exports = { notifyUser, notifyAdmins, setIo, sendExpoPush };
