const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../prisma');
const { sendEmail } = require('../utils/resend');
const { logAction } = require('../utils/auditLog');

// GET /users/me — current user's safe profile (no password), with school name
const getMe = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                is_active: true,
                is_first_login: true,
                is_dev_sa: true,
                created_at: true,
                school: { select: { id: true, name: true, logo_url: true, primary_color: true } },
            },
        });
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching profile', details: error.message });
    }
};

// GET /users — admin lists drivers/parents in their school; SA can pass ?school_id
const listSchoolUsers = async (req, res) => {
    try {
        const schoolId = req.user.role === 'super_admin' ? req.query.school_id : req.user.school_id;
        const { role } = req.query;

        const where = {};
        if (schoolId) where.school_id = schoolId;
        if (role) where.role = role;
        // Admin only sees drivers and parents (not other admins/SAs)
        if (req.user.role === 'admin') {
            const adminRoles = ['driver', 'parent', 'bus_staff'];
            where.role = role && adminRoles.includes(role) ? role : { in: adminRoles };
        }

        const users = await prisma.user.findMany({
            where,
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                is_active: true,
                is_first_login: true,
                created_at: true,
                school: { select: { id: true, name: true } },
            },
            orderBy: { created_at: 'desc' },
        });
        res.json(users);
    } catch (error) {
        console.error('DATABASE ERROR (listSchoolUsers):', error.message);
        res.status(500).json({ error: 'Error fetching users', details: error.message });
    }
};

// GET /users/sa — list super_admin users
const listSAUsers = async (req, res) => {
    try {
        const where = { role: 'super_admin' };
        if (!req.user.is_dev_sa) {
            where.is_dev_sa = false;
        }
        const users = await prisma.user.findMany({
            where,
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                is_active: true,
                is_dev_sa: true,
                created_at: true,
                _count: { select: { assignedSchools: true } },
            },
            orderBy: { created_at: 'asc' },
        });
        const mapped = users.map(u => ({
            ...u,
            assigned_schools_count: u._count.assignedSchools,
            _count: undefined,
        }));
        res.json(mapped);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching SA users', details: error.message });
    }
};

// POST /users/sa — create a new super_admin with an explicit password
const createSAUser = async (req, res) => {
    try {
        const { name, email: rawEmail, phone, password } = req.body;
        const email = rawEmail?.toLowerCase().trim();
        if (!name || !email) return res.status(400).json({ error: 'name and email are required' });
        if (!password || password.length < 8) return res.status(400).json({ error: 'password is required and must be at least 8 characters' });

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) return res.status(409).json({ error: 'A user with this email already exists' });

        const hashedPassword = await bcrypt.hash(password, 12);
        const user = await prisma.user.create({
            data: {
                name, email, phone: phone || null,
                password: hashedPassword,
                role: 'super_admin',
                is_active: true,
                is_first_login: true,
                is_dev_sa: false,
            },
            select: { id: true, name: true, email: true, phone: true, is_active: true, is_dev_sa: true, created_at: true },
        });
        await logAction({ req, action: 'create_user', targetType: 'user', targetId: user.id });
        res.status(201).json(user);
    } catch (error) {
        console.error('createSAUser error:', error.message);
        res.status(500).json({ error: 'Error creating SA user', details: error.message });
    }
};

// PATCH /users/:id/active — toggle is_active
const toggleUserActive = async (req, res) => {
    try {
        const { id } = req.params;

        if (id === req.user.id) {
            return res.status(400).json({ error: 'Cannot deactivate your own account' });
        }

        const target = await prisma.user.findUnique({
            where: { id },
            select: { is_active: true, is_dev_sa: true, school_id: true, role: true },
        });
        if (!target) return res.status(404).json({ error: 'User not found' });

        // Admin can only toggle drivers/parents in their own school
        if (req.user.role === 'admin') {
            if (target.school_id !== req.user.school_id) {
                return res.status(403).json({ error: 'Access denied' });
            }
            if (!['driver', 'parent', 'bus_staff'].includes(target.role)) {
                return res.status(403).json({ error: 'Admins can only toggle drivers, parents and bus staff' });
            }
        }

        if (target.is_dev_sa && !req.user.is_dev_sa) {
            return res.status(403).json({ error: 'Cannot modify a dev SA account' });
        }

        const updated = await prisma.user.update({
            where: { id },
            data: { is_active: !target.is_active },
            select: { id: true, name: true, email: true, is_active: true },
        });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Error toggling user status', details: error.message });
    }
};

// DELETE /users/:id — SA only. Cannot delete self or DEV SA accounts
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        if (id === req.user.id) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        const target = await prisma.user.findUnique({
            where: { id },
            select: { role: true, is_dev_sa: true },
        });
        if (!target) return res.status(404).json({ error: 'User not found' });

        if (target.is_dev_sa && !req.user.is_dev_sa) {
            return res.status(403).json({ error: 'Cannot delete a dev SA account' });
        }

        await prisma.user.delete({ where: { id } });
        await logAction({ req, action: 'delete_user', targetType: 'user', targetId: id });
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('DATABASE ERROR (deleteUser):', error.message);
        res.status(500).json({ error: 'Error deleting user', details: error.message });
    }
};

// Legacy helpers kept for internal use by other routes
const getAllUsers = async (req, res) => {
    try {
        const { role, school_id } = req.query;
        const where = {};
        if (role) where.role = role;
        if (school_id) where.school_id = school_id;

        const users = await prisma.user.findMany({
            where,
            select: {
                id: true, name: true, email: true, phone: true, role: true,
                is_active: true, is_first_login: true, created_at: true,
                school: { select: { id: true, name: true } },
            },
        });
        res.json(users);
    } catch (error) {
        console.error('DATABASE ERROR (getAllUsers):', error.message);
        res.status(500).json({ error: 'Error fetching users', details: error.message });
    }
};

const createUser = async (req, res) => {
    try {
        const { name, email: rawEmail, role, school_id, phone: rawPhone } = req.body;
        const email = rawEmail?.toLowerCase().trim();
        const phone = rawPhone?.trim() || null;

        if (!name || !email) return res.status(400).json({ error: 'name and email are required' });

        const rawPassword = req.body.password || crypto.randomBytes(8).toString('base64url');

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            // Orphaned driver user (deleted Driver record but User row remained) — reuse the account
            if (existing.role === 'driver' && role === 'driver') {
                const linkedDriver = await prisma.driver.findUnique({ where: { user_id: existing.id } });
                if (!linkedDriver) {
                    const hashedPassword = await bcrypt.hash(rawPassword, 12);
                    const updated = await prisma.user.update({
                        where: { id: existing.id },
                        data: { name, phone, school_id: school_id || null, password: hashedPassword, is_first_login: true, is_active: true },
                        select: { id: true, name: true, email: true, phone: true, role: true, school_id: true, created_at: true },
                    });
                    return res.status(201).json(updated);
                }
            }
            return res.status(409).json({ error: 'A user with this email already exists' });
        }
        const hashedPassword = await bcrypt.hash(rawPassword, 12);
        const user = await prisma.user.create({
            data: { name, email, password: hashedPassword, role, school_id: school_id || null, phone, is_first_login: true, is_active: true },
            select: { id: true, name: true, email: true, phone: true, role: true, school_id: true, created_at: true },
        });
        res.status(201).json(user);
    } catch (error) {
        console.error('createUser error:', error.message);
        if (error.code === 'P2002') {
            const field = error.meta?.target?.[0] || 'field';
            return res.status(409).json({ error: `A user with this ${field} already exists` });
        }
        res.status(500).json({ error: 'Error creating user', details: error.message });
    }
};

const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { password, ...safeData } = req.body; // Never allow raw password updates here
        const updated = await prisma.user.update({
            where: { id },
            data: safeData,
            select: { id: true, name: true, email: true, phone: true, role: true, is_active: true },
        });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Error updating user', details: error.message });
    }
};

// PATCH /users/:id/reset-password — SA resets any user's password (no current password needed)
const resetUserPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { new_password } = req.body;
        if (!new_password || new_password.length < 8) {
            return res.status(400).json({ error: 'new_password must be at least 8 characters' });
        }
        const target = await prisma.user.findUnique({ where: { id }, select: { is_dev_sa: true } });
        if (!target) return res.status(404).json({ error: 'User not found' });
        // Only DEV SA can reset DEV SA password; regular SA cannot touch DEV SA
        if (target.is_dev_sa && !req.user.is_dev_sa) {
            return res.status(403).json({ error: 'Cannot reset DEV SA password' });
        }
        const hashed = await bcrypt.hash(new_password, 12);
        await prisma.user.update({
            where: { id },
            data: { password: hashed, is_first_login: true },
        });
        await logAction({ req, action: 'reset_password', targetType: 'user', targetId: id });
        res.json({ message: 'Password reset. User must change it on next login.' });
    } catch (error) {
        console.error('resetUserPassword error:', error.message);
        res.status(500).json({ error: 'Error resetting password' });
    }
};

// POST /users/:id/send-reset-email — admin triggers password reset email for a parent
const sendResetEmail = async (req, res) => {
    try {
        const { id } = req.params;
        const target = await prisma.user.findUnique({
            where: { id },
            select: { id: true, email: true, school_id: true, role: true, is_active: true },
        });
        if (!target) return res.status(404).json({ error: 'User not found' });
        if (target.school_id !== req.user.school_id && req.user.role !== 'super_admin') {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Invalidate any existing tokens
        await prisma.passwordResetToken.updateMany({
            where: { user_id: target.id, used: false },
            data: { used: true },
        });

        const rawToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
        await prisma.passwordResetToken.create({
            data: { user_id: target.id, token: hashedToken, expires_at: new Date(Date.now() + 60 * 60 * 1000) },
        });

        let school = null;
        if (target.school_id) {
            school = await prisma.school.findUnique({ where: { id: target.school_id } });
        }
        const baseDomain = process.env.BASE_DOMAIN || 'localhost:3000';
        const slug = school?.slug;
        const baseUrl = slug ? `https://${slug}.${baseDomain}` : `https://${baseDomain}`;
        const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;

        const { sendPasswordReset } = require('../utils/resend');
        await sendPasswordReset({ to: target.email, resetUrl, school });

        await logAction({ req, action: 'send_reset_email', targetType: 'user', targetId: target.id });
        res.json({ message: 'Password reset email sent.' });
    } catch (error) {
        console.error('sendResetEmail error:', error.message);
        res.status(500).json({ error: 'Error sending reset email' });
    }
};

module.exports = {
    getMe,
    listSchoolUsers,
    getAllUsers,
    createUser,
    updateUser,
    deleteUser,
    listSAUsers,
    createSAUser,
    toggleUserActive,
    resetUserPassword,
    sendResetEmail,
};
