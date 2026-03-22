import { Response } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/authMiddleware';

export const getAttendance = async (req: AuthRequest, res: Response) => {
    try {
        const school_id = req.user.school_id || undefined;
        const { date, route_id, student_id } = req.query;

        const whereClause: any = {};
        if (school_id) whereClause.school_id = school_id;
        if (student_id) whereClause.student_id = student_id;

        if (date) {
            whereClause.date = {
                gte: new Date(date as string),
                lt: new Date(new Date(date as string).getTime() + 24 * 60 * 60 * 1000),
            };
        }

        const attendances = await prisma.attendance.findMany({
            where: whereClause,
            include: { student: true }
        });

        const filtered = route_id
            ? attendances.filter((a: any) => a.student.route_id === route_id)
            : attendances;

        res.json(filtered);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching attendance', error });
    }
};

export const markAttendance = async (req: AuthRequest, res: Response) => {
    try {
        const { student_id, status } = req.body;
        const school_id = req.user.role === 'super_admin' ? req.body.school_id : req.user.school_id;

        if (!school_id) return res.status(400).json({ message: 'school_id is required' });

        const attendance = await prisma.attendance.create({
            data: { student_id, status, school_id }
        });
        res.status(201).json(attendance);
    } catch (error) {
        res.status(500).json({ message: 'Error marking attendance', error });
    }
};
