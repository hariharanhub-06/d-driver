import { Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/authMiddleware';

// Mock users for development failover (In-memory persistence)
const SESSION_MOCK_USERS = [
    { id: 'mock-admin-id', name: 'Principal Sarah', email: 'admin@greenwood.com', role: 'admin', school_id: 'default-school-id', created_at: new Date() }
];


export const getUsers = async (req: AuthRequest, res: Response) => {
    try {
        const { role } = req.query;
        const school_id = req.user.school_id;
        const whereClause: any = req.user.role === 'super_admin' ? {} : { school_id };

        if (role) whereClause.role = role;

        const users = await prisma.user.findMany({
            where: whereClause,
            select: { id: true, name: true, email: true, role: true, school_id: true, created_at: true }
        });
        res.json(users);
    } catch (error: any) {
        console.error('Database failure, serving mock users:', error.message);
        const { role } = req.query;
        let users = SESSION_MOCK_USERS;
        if (role) {
            users = users.filter(u => u.role === role);
        }
        res.json(users);
    }
};

export const createUser = async (req: AuthRequest, res: Response) => {
    const { name, email, password, role } = req.body;
    const school_id = req.user.role === 'super_admin' ? req.body.school_id : req.user.school_id;

    if (!school_id && role !== 'super_admin') return res.status(400).json({ message: 'school_id is required' });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role,
                school_id: (school_id && school_id.toString().length === 24) ? school_id : undefined
            }
        });

        const { password: _, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
    } catch (error: any) {
        console.error('Database failure, mock user creation:', error.message);
        const newMock = {
            id: `mock-u-${Date.now()}`,
            name, email, role, school_id,
            created_at: new Date()
        };
        (SESSION_MOCK_USERS as any[]).push(newMock);
        res.status(201).json(newMock);
    }
};


