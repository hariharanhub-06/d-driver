import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'd_driver_super_secret';

// Mock users for development failover (matches seed.ts)
const MOCK_USERS = [
    { id: 'mock-sa-id', name: 'System Super Admin', email: 'superadmin@d-driver.com', password: 'password123', role: 'super_admin' },
    { id: 'mock-admin-id', name: 'Principal Sarah', email: 'admin@greenwood.com', password: 'password123', role: 'admin', school_id: 'default-school-id' },
    { id: 'mock-driver-id', name: 'John Doe', email: 'driver1@d-driver.com', password: 'password123', role: 'driver', school_id: 'default-school-id' },
    { id: 'mock-parent-id', name: 'Robert Johnson', email: 'parent@home.com', password: 'password123', role: 'parent', school_id: 'default-school-id' }
];

export const register = async (req: Request, res: Response) => {
    try {
        const { name, email, password, role, school_id } = req.body;
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { name, email, password: hashedPassword, role, school_id },
        });
        if (role === 'driver') {
            await prisma.driver.create({
                data: { user: { connect: { id: user.id } }, school: { connect: { id: school_id! } } }
            });
        }
        res.status(201).json({ message: 'User registered successfully', user: { id: user.id, email: user.email, role: user.role } });
    } catch (error) {
        console.error('Registration failed:', error);
        res.status(500).json({ message: 'Server error', error });
    }
};

export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;
    let user: any = null;
    let isMockMode = false;

    try {
        // 1. Try real DB login
        user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
    } catch (dbError: any) {
        console.error('Database connection failed, checking mock failover:', dbError.message);

        // 2. Dev-Mode Failover: Check if mock session is viable
        const mockUser = MOCK_USERS.find(u => u.email === email && u.password === password);
        if (mockUser) {
            console.log('--- ENTERING MOCK MODE AUTH ---');
            user = mockUser;
            isMockMode = true;
        } else {
            // If DB is down and no mock user matches
            return res.status(503).json({
                message: 'Database unavailable and credentials do not match local failover profile.',
                error: 'P2010 Timeout'
            });
        }
    }

    const token = jwt.sign(
        { id: user.id, role: user.role, school_id: user.school_id, isMockMode },
        JWT_SECRET,
        { expiresIn: '24h' }
    );

    res.json({
        token,
        user: { id: user.id, name: user.name, role: user.role, school_id: user.school_id },
        isMockMode
    });
};

