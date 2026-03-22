import { Response } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/authMiddleware';

export const getRoutes = async (req: AuthRequest, res: Response) => {
    try {
        const school_id = req.user.school_id;
        const whereClause = req.user.role === 'super_admin' ? {} : { school_id };

        const routes = await prisma.route.findMany({
            where: whereClause,
            include: { stops: true, students: true }
        });
        res.json(routes);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching routes', error });
    }
};

export const createRoute = async (req: AuthRequest, res: Response) => {
    try {
        const { name, stops } = req.body; // stops: Array<{name, latitude, longitude}>
        const school_id = req.user.role === 'super_admin' ? req.body.school_id : req.user.school_id;

        if (!school_id) return res.status(400).json({ message: 'school_id is required' });

        const route = await prisma.route.create({
            data: {
                name,
                school_id,
                stops: {
                    create: stops || []
                }
            },
            include: { stops: true }
        });
        res.status(201).json(route);
    } catch (error) {
        res.status(500).json({ message: 'Error creating route', error });
    }
};
