const prisma = require('../prisma');

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
    await prisma.notification.createMany({
        data: admins.map(a => ({ user_id: a.id, school_id, message, type })),
    });
};

module.exports = { notifyAdmins };
