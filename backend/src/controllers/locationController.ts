import { Response } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/authMiddleware';

export const getLatestLocation = async (req: AuthRequest, res: Response) => {
    try {
        const { bus_id } = req.params;
        const school_id = req.user.school_id;

        const whereClause: any = { bus_id };
        if (req.user.role !== 'super_admin') {
            whereClause.school_id = school_id;
        }

        const location = await prisma.location.findFirst({
            where: whereClause,
            orderBy: { timestamp: 'desc' }
        });

        if (!location) return res.status(404).json({ message: 'Location not found' });

        res.json(location);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching location', error });
    }
};

export const updateLocation = async (req: AuthRequest, res: Response) => {
    try {
        const { bus_id, latitude, longitude } = req.body;
        const school_id = req.user.role === 'super_admin' ? req.body.school_id : req.user.school_id;

        if (!school_id) return res.status(400).json({ message: 'school_id is required' });

        const location = await prisma.location.create({
            data: { bus_id, latitude, longitude, school_id }
        });
        res.status(201).json(location);
    } catch (error) {
        res.status(500).json({ message: 'Error updating location', error });
    }
};
