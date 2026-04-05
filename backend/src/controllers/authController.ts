const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma');

const JWT_SECRET = process.env.JWT_SECRET || 'd_driver_super_secret';

const register = async (req, res) => {
    try {
        const { name, email, password, role, school_id } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { name, email, password: hashedPassword, role, school_id }
        });
        res.status(201).json({ message: 'User registered successfully', user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (error) {
        res.status(500).json({ message: 'Registration failed', error: error.message });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('DEBUG: Login Attempt for:', email);

        let user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            return res.status(401).json({ message: 'Verification failed. Please check your credentials.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Verification failed. Please check your credentials.' });
        }

        const token = jwt.sign(
            { id: user.id, name: user.name, email: user.email, role: user.role, school_id: user.school_id },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role, school_id: user.school_id }
        });
    } catch (error) {
        console.error('SERVER ERROR during login:', error.message);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
};

module.exports = { register, login };
