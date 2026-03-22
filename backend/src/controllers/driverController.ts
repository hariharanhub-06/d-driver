import { Response } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/authMiddleware';

export const getDrivers = async (req: AuthRequest, res: Response) => {
    try {
        const school_id = req.user.school_id;
        const whereClause = req.user.role === 'super_admin' ? {} : { school_id };

        const drivers = await prisma.driver.findMany({
            where: whereClause,
            include: { user: true, bus: true }
        });
        res.json(drivers);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching drivers', error });
    }
};

export const assignBusToDriver = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { bus_id } = req.body;

        const driver = await prisma.driver.findUnique({ where: { id: id as string } });
        if (!driver) return res.status(404).json({ message: 'Driver not found' });

        if (req.user.role !== 'super_admin' && driver.school_id !== req.user.school_id) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const updatedDriver = await prisma.driver.update({
            where: { id: id as string },
            data: { assigned_bus_id: bus_id }
        });

        res.json(updatedDriver);
    } catch (error) {
        res.status(500).json({ message: 'Error assigning bus', error });
    }
};
