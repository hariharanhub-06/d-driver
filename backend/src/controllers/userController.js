

const bcrypt = require('bcryptjs');
const prisma = require('../prisma');

const getAllUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            include: { school: true }
        });
        res.json(users);
    } catch (error) {
        console.error('DATABASE ERROR (getAllUsers):', error.message);
        res.status(500).json({ message: 'Error fetching users', error: error.message, stack: error.stack });
    }
};

const createUser = async (req, res) => {
    try {
        const { name, email, password, role, school_id, phone } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { name, email, password: hashedPassword, role, school_id, phone }
        });
        res.status(201).json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error creating user', error: error.message });
    }
};

const getCurrentUser = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: { school: true }
        });
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching profile', error: error.message });
    }
};

const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await prisma.user.update({
            where: { id },
            data: req.body
        });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: 'Error updating user', error: error.message });
    }
};

module.exports = { getAllUsers, createUser, getCurrentUser, updateUser };
