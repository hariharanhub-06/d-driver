const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../prisma');
const { sendEmail } = require('../utils/resend');

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
            where.role = role && ['driver', 'parent'].includes(role) ? role : { in: ['driver', 'parent'] };
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
            },
            orderBy: { created_at: 'asc' },
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching SA users', details: error.message });
    }
};

// POST /users/sa — create a new super_admin with temp password + welcome email
const createSAUser = async (req, res) => {
    try {
        const { name, email, phone } = req.body;
        if (!name || !email) {
            return res.status(400).json({ error: 'name and email are required' });
        }

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(409).json({ error: 'A user with this email already exists' });
        }

        const tempPassword = crypto.randomBytes(6).toString('hex');
        const hashedPassword = await bcrypt.hash(tempPassword, 12);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                phone: phone || null,
                password: hashedPassword,
                role: 'super_admin',
                is_active: true,
                is_first_login: true,
                is_dev_sa: false,
            },
            select: {
                id: true, name: true, email: true, phone: true,
                is_active: true, is_dev_sa: true, created_at: true,
            },
        });

        const loginUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        try {
            await sendEmail({
                to: email,
                subject: 'Your D-Driver Platform Admin account',
                html: `
                    <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;">
                        <h2 style="color:#3B82F6;margin:0 0 8px;">D-Driver Platform</h2>
                        <p>Hi ${name},</p>
                        <p>A Super Admin account has been created for you on the D-Driver platform.</p>
                        <p><strong>Login URL:</strong> <a href="${loginUrl}/login">${loginUrl}/login</a></p>
                        <p><strong>Email:</strong> ${email}</p>
                        <p><strong>Temporary Password:</strong> <code style="background:#f1f5f9;padding:4px 8px;border-radius:4px;">${tempPassword}</code></p>
                        <p style="color:#64748b;font-size:13px;">You will be asked to set a new password on first login.</p>
                    </div>`,
                template: 'sa_welcome',
            });
        } catch (emailErr) {
            console.error('Welcome email failed:', emailErr.message);
            // Don't fail account creation if email fails
        }

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
            if (!['driver', 'parent'].includes(target.role)) {
                return res.status(403).json({ error: 'Admins can only toggle drivers and parents' });
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
        const { name, email, password, role, school_id, phone } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { name, email, password: hashedPassword, role, school_id, phone },
            select: { id: true, name: true, email: true, phone: true, role: true, school_id: true, created_at: true },
        });
        res.status(201).json(user);
    } catch (error) {
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
};
