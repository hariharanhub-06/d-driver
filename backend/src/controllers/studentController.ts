import { Response } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/authMiddleware';

export const getStudents = async (req: AuthRequest, res: Response) => {
    try {
        const school_id = req.user.school_id;
        const whereClause = req.user.role === 'super_admin' ? {} : { school_id };

        const students = await prisma.student.findMany({
            where: whereClause,
            include: { route: true, stop: true, parent: { select: { id: true, name: true, email: true } } }
        });
        res.json(students);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching students', error });
    }
};

export const createStudent = async (req: AuthRequest, res: Response) => {
    try {
        const { name, parent_id, route_id, stop_id } = req.body;
        const school_id = req.user.role === 'super_admin' ? req.body.school_id : req.user.school_id;

        if (!school_id) return res.status(400).json({ message: 'school_id is required' });

        const student = await prisma.student.create({
            data: { name, parent_id, route_id, stop_id, school_id }
        });
        res.status(201).json(student);
    } catch (error) {
        res.status(500).json({ message: 'Error creating student', error });
    }
};
