import { Response } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/authMiddleware';
import bcrypt from 'bcryptjs';

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
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users', error });
    }
};

export const createUser = async (req: AuthRequest, res: Response) => {
    try {
        const { name, email, password, role } = req.body;
        const school_id = req.user.role === 'super_admin' ? req.body.school_id : req.user.school_id;

        if (!school_id && role !== 'super_admin') return res.status(400).json({ message: 'school_id is required' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { name, email, password: hashedPassword, role, school_id }
        });

        const { password: _, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
    } catch (error) {
        res.status(500).json({ message: 'Error creating user', error });
    }
};
