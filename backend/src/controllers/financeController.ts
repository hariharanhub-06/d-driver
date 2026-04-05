const prisma = require('../prisma');

const getFees = async (req, res) => {
    try {
        const { id } = req.params;
        const fees = await prisma.fee.findMany({
            where: { student_id: id },
            include: { payments: true }
        });
        res.json(fees);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching fees', error: error.message });
    }
};

const payFee = async (req, res) => {
    try {
        const { fee_id, amount, school_id } = req.body;
        const payment = await prisma.payment.create({
            data: { fee_id, amount, status: 'paid', school_id }
        });
        res.status(201).json(payment);
    } catch (error) {
        res.status(500).json({ message: 'Error paying fee', error: error.message });
    }
};

const getRevenue = async (req, res) => {
    try {
        const total = await prisma.payment.aggregate({
            _sum: { amount: true }
        });
        res.json({ totalRevenue: total._sum.amount || 0 });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching revenue', error: error.message });
    }
};

module.exports = { getFees, payFee, getRevenue };
