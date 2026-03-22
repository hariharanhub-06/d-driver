import { Response } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/authMiddleware';

export const getBuses = async (req: AuthRequest, res: Response) => {
    try {
        const school_id = req.user.school_id;
        const whereClause = req.user.role === 'super_admin' ? {} : { school_id };

        const buses = await prisma.bus.findMany({
            where: whereClause,
            include: { drivers: { include: { user: true } }, school: true }
        });
        res.json(buses);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching buses', error });
    }
};

export const createBus = async (req: AuthRequest, res: Response) => {
    try {
        const { bus_number, capacity } = req.body;
        const school_id = req.user.role === 'super_admin' ? req.body.school_id : req.user.school_id;

        if (!school_id) {
            return res.status(400).json({ message: 'school_id is required' });
        }

        const bus = await prisma.bus.create({
            data: { bus_number, capacity, school_id }
        });
        res.status(201).json(bus);
    } catch (error) {
        res.status(500).json({ message: 'Error creating bus', error });
    }
};

export const updateBus = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { bus_number, capacity } = req.body;

        const bus = await prisma.bus.findUnique({ where: { id: id as string } });
        if (!bus) return res.status(404).json({ message: 'Bus not found' });
        if (req.user.role !== 'super_admin' && bus.school_id !== req.user.school_id) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const updatedBus = await prisma.bus.update({
            where: { id: id as string },
            data: { bus_number, capacity }
        });
        res.json(updatedBus);
    } catch (error) {
        res.status(500).json({ message: 'Error updating bus', error });
    }
};

export const deleteBus = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const bus = await prisma.bus.findUnique({ where: { id: id as string } });
        if (!bus) return res.status(404).json({ message: 'Bus not found' });
        if (req.user.role !== 'super_admin' && bus.school_id !== req.user.school_id) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        await prisma.bus.delete({ where: { id: id as string } });
        res.json({ message: 'Bus deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting bus', error });
    }
};
