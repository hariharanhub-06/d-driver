const prisma = require('../prisma');

let _io = null;
const setIo = (io) => { _io = io; };

/**
 * Send a notification to a specific user.
 * Saves to DB + emits socket event so the user sees it instantly.
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

module.exports = { notifyUser, notifyAdmins, setIo };
