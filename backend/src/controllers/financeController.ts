import { Response } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/authMiddleware';

export const getFees = async (req: AuthRequest, res: Response) => {
    try {
        const school_id = req.user.school_id;
        const { student_id } = req.query;

        const whereClause: any = req.user.role === 'super_admin' ? {} : { school_id };
        if (student_id) whereClause.student_id = student_id;

        const fees = await prisma.fee.findMany({
            where: whereClause,
            include: { student: true, payments: true }
        });

        res.json(fees);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching fees', error });
    }
};

export const createFee = async (req: AuthRequest, res: Response) => {
    try {
        const { student_id, total_amount, due_date } = req.body;
        const school_id = req.user.role === 'super_admin' ? req.body.school_id : req.user.school_id;

        if (!school_id) return res.status(400).json({ message: 'school_id is required' });

        const fee = await prisma.fee.create({
            data: {
                student_id,
                total_amount,
                due_amount: total_amount,
                due_date: new Date(due_date),
                school_id
            }
        });

        res.status(201).json(fee);
    } catch (error) {
        res.status(500).json({ message: 'Error creating fee', error });
    }
};

export const recordPayment = async (req: AuthRequest, res: Response) => {
    try {
        const { fee_id, amount } = req.body;
        const school_id = req.user.role === 'super_admin' ? req.body.school_id : req.user.school_id;

        const fee = await prisma.fee.findUnique({ where: { id: fee_id } });
        if (!fee) return res.status(404).json({ message: 'Fee not found' });

        const newDueAmount = fee.due_amount - amount;
        const status = newDueAmount <= 0 ? 'paid' : 'pending';

        const payment = await prisma.payment.create({
            data: {
                fee_id,
                amount,
                status: status,
                school_id
            }
        });

        await prisma.fee.update({
            where: { id: fee_id },
            data: { due_amount: newDueAmount > 0 ? newDueAmount : 0 }
        });

        res.status(201).json(payment);
    } catch (error) {
        res.status(500).json({ message: 'Error recording payment', error });
    }
};
