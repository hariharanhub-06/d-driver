import { Request, Response } from 'express';
import prisma from '../prisma';

export const getSchools = async (req: Request, res: Response) => {
    try {
        const schools = await prisma.school.findMany();
        res.json(schools);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching schools', error });
    }
};

export const createSchool = async (req: Request, res: Response) => {
    try {
        const { name, subscription_plan, status } = req.body;
        const school = await prisma.school.create({
            data: { name, subscription_plan, status }
        });
        res.status(201).json(school);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating school', error });
    }
};

export const updateSchool = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, subscription_plan, status } = req.body;
        const school = await prisma.school.update({
            where: { id: id as string },
            data: { name, subscription_plan, status }
        });
        res.json(school);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating school', error });
    }
};

export const deleteSchool = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.school.delete({ where: { id: id as string } });
        res.json({ message: 'School deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting school', error });
    }
};
