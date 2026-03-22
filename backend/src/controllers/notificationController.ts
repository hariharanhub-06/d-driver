import { Response } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/authMiddleware';

export const getNotifications = async (req: AuthRequest, res: Response) => {
    try {
        const { id: user_id } = req.user;

        const notifications = await prisma.notification.findMany({
            where: { user_id },
            orderBy: { created_at: 'desc' }
        });

        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching notifications', error });
    }
};

export const createNotification = async (req: AuthRequest, res: Response) => {
    try {
        const { user_id, message, type } = req.body;
        const school_id = req.user.role === 'super_admin' ? req.body.school_id : req.user.school_id;

        if (!school_id) return res.status(400).json({ message: 'school_id is required' });

        const notification = await prisma.notification.create({
            data: { user_id, message, type, school_id }
        });

        res.status(201).json(notification);
    } catch (error) {
        res.status(500).json({ message: 'Error creating notification', error });
    }
};
