const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../prisma');
const { logAction } = require('../utils/auditLog');

const getAllDrivers = async (req, res) => {
    try {
        const schoolId = req.schoolId || (req.user.role === 'super_admin' ? req.query.school_id : req.user.school_id);
        const drivers = await prisma.driver.findMany({
            where: schoolId ? { school_id: schoolId } : {},
            include: {
                user: { select: { id: true, name: true, phone: true, email: true, is_active: true } },
                bus: { select: { id: true, bus_number: true, registration_no: true, fuel_liters: true, mileage: true } },
                school: { select: { id: true, name: true } },
            },
        });
        res.json(drivers);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching drivers', details: error.message });
    }
};

const getDriverById = async (req, res) => {
    try {
        const { id } = req.params;
        const schoolId = req.user.role === 'super_admin' ? undefined : req.user.school_id;
        const driver = await prisma.driver.findUnique({
            where: { id },
            include: {
                user: { select: { id: true, name: true, phone: true, email: true, is_active: true } },
                bus: { select: { id: true, bus_number: true, registration_no: true, fuel_liters: true, mileage: true } },
                school: { select: { id: true, name: true } },
            },
        });
        if (!driver) return res.status(404).json({ error: 'Driver not found' });
        if (schoolId && driver.school_id !== schoolId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        res.json(driver);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching driver', details: error.message });
    }
};

const createDriver = async (req, res) => {
    try {
        const { user_id, license_no, assigned_bus_id, school_id } = req.body;
        const effectiveSchoolId = req.user.role === 'super_admin' ? school_id : req.user.school_id;
        const newDriver = await prisma.driver.create({
            data: { user_id, license_no, assigned_bus_id, school_id: effectiveSchoolId },
        });
        await logAction({ req, action: 'create_driver', targetType: 'driver', targetId: newDriver.id });
        res.status(201).json(newDriver);
    } catch (error) {
        res.status(500).json({ error: 'Error creating driver', details: error.message });
    }
};

const updateDriver = async (req, res) => {
    try {
        const { id } = req.params;
        const schoolId = req.user.role === 'super_admin' ? undefined : req.user.school_id;
        if (schoolId) {
            const existing = await prisma.driver.findUnique({ where: { id }, select: { school_id: true } });
            if (!existing) return res.status(404).json({ error: 'Driver not found' });
            if (existing.school_id !== schoolId) return res.status(403).json({ error: 'Access denied' });
        }
        const updatedDriver = await prisma.driver.update({
            where: { id },
            data: req.body,
        });
        await logAction({ req, action: 'update_driver', targetType: 'driver', targetId: id });
        res.json(updatedDriver);
    } catch (error) {
        res.status(500).json({ error: 'Error updating driver', details: error.message });
    }
};

const deleteDriver = async (req, res) => {
    try {
        const { id } = req.params;
        const schoolId = req.user.role === 'super_admin' ? undefined : req.user.school_id;

        const existing = await prisma.driver.findUnique({ where: { id }, select: { school_id: true, user_id: true } });
        if (!existing) return res.status(404).json({ error: 'Driver not found' });
        if (schoolId && existing.school_id !== schoolId) return res.status(403).json({ error: 'Access denied' });

        await prisma.driver.delete({ where: { id } });
        // Delete the linked user account so the credentials are immediately invalidated
        if (existing.user_id) {
            await prisma.user.delete({ where: { id: existing.user_id } }).catch(() => {});
        }

        await logAction({ req, action: 'delete_driver', targetType: 'driver', targetId: id });
        res.json({ message: 'Driver deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting driver', details: error.message });
    }
};

// GET /drivers/me — driver sees their own profile with bus and school
const getMe = async (req, res) => {
    try {
        const driver = await prisma.driver.findUnique({
            where: { user_id: req.user.id },
            include: {
                user: { select: { id: true, name: true, phone: true, email: true } },
                bus: {
                    select: {
                        id: true, bus_number: true, registration_no: true,
                        fuel_liters: true, mileage: true,
                        routes: { select: { id: true, name: true } },
                    },
                },
                school: { select: { id: true, name: true, primary_color: true, slug: true } },
            },
        });
        if (!driver) return res.status(404).json({ error: 'Driver profile not found' });
        res.json(driver);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching driver profile', details: error.message });
    }
};

// POST /drivers/bulk — admin creates multiple drivers at once
const bulkCreateDrivers = async (req, res) => {
    const { drivers } = req.body;
    if (!Array.isArray(drivers) || drivers.length === 0) {
        return res.status(400).json({ error: 'drivers array is required' });
    }

    const schoolId = req.user.role === 'super_admin' ? req.body.school_id : req.user.school_id;
    if (!schoolId) return res.status(400).json({ error: 'school_id is required' });

    const created = [];
    const errors = [];

    for (const row of drivers) {
        const { name, email, phone, license_no } = row;
        if (!name || !email) {
            errors.push({ row, error: 'name and email are required' });
            continue;
        }
        try {
            const existing = await prisma.user.findUnique({ where: { email } });
            if (existing) {
                errors.push({ row, error: 'Email already in use' });
                continue;
            }
            const tempPassword = crypto.randomBytes(6).toString('hex');
            const hashedPassword = await bcrypt.hash(tempPassword, 12);

            const user = await prisma.user.create({
                data: {
                    name,
                    email,
                    phone: phone || null,
                    password: hashedPassword,
                    role: 'driver',
                    school_id: schoolId,
                    is_first_login: true,
                    is_active: true,
                },
            });

            const driver = await prisma.driver.create({
                data: {
                    user_id: user.id,
                    license_no: license_no || null,
                    school_id: schoolId,
                },
            });

            created.push({ driver, tempPassword });
        } catch (err) {
            errors.push({ row, error: err.message });
        }
    }

    res.status(201).json({ created: created.length, errors });
};

module.exports = {
    getAllDrivers,
    createDriver,
    getDriverById,
    updateDriver,
    deleteDriver,
    getMe,
    bulkCreateDrivers,
};
