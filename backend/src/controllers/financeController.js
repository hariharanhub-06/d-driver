const crypto = require('crypto');
const prisma = require('../prisma');
const { decrypt } = require('../utils/encryption');
const Razorpay = require('razorpay');

// ─── Private helpers ──────────────────────────────────────────────────────────

const getSchoolRazorpay = async (schoolId) => {
    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school || !school.razorpay_configured || !school.razorpay_key_id || !school.razorpay_key_secret) {
        throw new Error('Razorpay is not configured for this school');
    }
    return new Razorpay({
        key_id: decrypt(school.razorpay_key_id),
        key_secret: decrypt(school.razorpay_key_secret),
    });
};

const getPlatformRazorpay = async () => {
    const config = await prisma.platformConfig.findUnique({ where: { id: 'singleton' } });
    if (config && config.razorpay_configured && config.razorpay_key_id && config.razorpay_key_secret) {
        return new Razorpay({
            key_id: decrypt(config.razorpay_key_id),
            key_secret: decrypt(config.razorpay_key_secret),
        });
    }
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
        return new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
    }
    throw new Error('Platform Razorpay is not configured');
};

// Compute the due_date for the current period given a FeeStructure
const computeDueDate = (feeStructure) => {
    const now = new Date();
    const dueDay = feeStructure.due_day || 5;
    switch (feeStructure.frequency) {
        case 'weekly': {
            // Next occurrence of due_day (0=Sun) this or next week
            const d = new Date(now);
            d.setDate(d.getDate() + ((dueDay - d.getDay() + 7) % 7));
            d.setHours(0, 0, 0, 0);
            return d;
        }
        case 'monthly': {
            const d = new Date(now.getFullYear(), now.getMonth(), dueDay);
            if (d < now) d.setMonth(d.getMonth() + 1);
            return d;
        }
        case 'quarterly': {
            const d = new Date(now.getFullYear(), now.getMonth(), dueDay);
            if (d < now) d.setMonth(d.getMonth() + 3);
            return d;
        }
        case 'half-yearly': {
            const d = new Date(now.getFullYear(), now.getMonth(), dueDay);
            if (d < now) d.setMonth(d.getMonth() + 6);
            return d;
        }
        case 'yearly': {
            const d = new Date(now.getFullYear(), now.getMonth(), dueDay);
            if (d < now) d.setFullYear(d.getFullYear() + 1);
            return d;
        }
        default: {
            const d = new Date(now.getFullYear(), now.getMonth(), dueDay);
            if (d < now) d.setMonth(d.getMonth() + 1);
            return d;
        }
    }
};

// ─── Exported handlers ────────────────────────────────────────────────────────

const getFees = async (req, res) => {
    try {
        const { student_id } = req.query;
        let schoolId;

        if (req.user.role === 'super_admin') {
            schoolId = req.query.school_id || undefined;
        } else {
            schoolId = req.user.school_id;
        }

        const where = {};
        if (schoolId) where.school_id = schoolId;
        if (student_id) where.student_id = student_id;

        const fees = await prisma.fee.findMany({
            where,
            include: {
                payments: true,
                student: { select: { name: true } },
            },
            orderBy: { due_date: 'desc' },
        });

        res.json(fees);
    } catch (error) {
        console.error('getFees error:', error);
        res.status(500).json({ error: 'Error fetching fees' });
    }
};

const createFee = async (req, res) => {
    try {
        const { student_id, total_amount, due_amount, due_date, payment_method } = req.body;
        const schoolId = req.user.school_id;

        const fee = await prisma.fee.create({
            data: {
                student_id,
                school_id: schoolId,
                total_amount: parseFloat(total_amount),
                due_amount: parseFloat(due_amount || total_amount),
                due_date: new Date(due_date),
                payment_method: payment_method || null,
            },
        });

        res.status(201).json(fee);
    } catch (error) {
        console.error('createFee error:', error);
        res.status(500).json({ error: 'Error creating fee' });
    }
};

const createFeeStructure = async (req, res) => {
    try {
        const { student_id, amount, frequency, due_day, academic_year } = req.body;
        const schoolId = req.user.school_id;

        const feeStructure = await prisma.feeStructure.upsert({
            where: { student_id },
            create: {
                student_id,
                school_id: schoolId,
                amount: parseFloat(amount),
                frequency,
                due_day: parseInt(due_day) || 5,
                academic_year,
                is_active: true,
            },
            update: {
                amount: parseFloat(amount),
                frequency,
                due_day: parseInt(due_day) || 5,
                academic_year,
                is_active: true,
            },
        });

        res.status(200).json(feeStructure);
    } catch (error) {
        console.error('createFeeStructure error:', error);
        res.status(500).json({ error: 'Error creating fee structure' });
    }
};

const createOrder = async (req, res) => {
    try {
        const { fee_id } = req.body;

        const fee = await prisma.fee.findUnique({ where: { id: fee_id } });
        if (!fee) return res.status(404).json({ error: 'Fee not found' });

        const alreadyPaid = await prisma.payment.findFirst({
            where: { fee_id, status: 'paid' },
        });
        if (alreadyPaid) return res.status(400).json({ error: 'Fee already paid' });

        const razorpay = await getSchoolRazorpay(fee.school_id);
        const order = await razorpay.orders.create({
            amount: Math.round(fee.due_amount * 100),
            currency: 'INR',
            receipt: fee_id,
        });

        await prisma.fee.update({
            where: { id: fee_id },
            data: { razorpay_order_id: order.id },
        });

        res.json({ order_id: order.id, amount: order.amount, currency: order.currency });
    } catch (error) {
        console.error('createOrder error:', error);
        res.status(500).json({ error: error.message || 'Error creating order' });
    }
};

const handleWebhook = async (req, res) => {
    try {
        const event = req.body?.event;
        const entity = req.body?.payload?.payment?.entity;
        if (!entity) return res.status(400).json({ error: 'Invalid webhook payload' });

        const { razorpay_order_id, id: razorpay_payment_id, amount } = entity;

        const fee = await prisma.fee.findFirst({ where: { razorpay_order_id } });
        if (!fee) return res.status(404).json({ error: 'Fee not found for this order' });

        const school = await prisma.school.findUnique({ where: { id: fee.school_id } });
        if (!school || !school.razorpay_key_secret) {
            return res.status(400).json({ error: 'School Razorpay not configured' });
        }

        const keySecret = decrypt(school.razorpay_key_secret);
        const signature = req.headers['x-razorpay-signature'];
        const expectedSig = crypto
            .createHmac('sha256', keySecret)
            .update(JSON.stringify(req.body))
            .digest('hex');

        if (signature !== expectedSig) {
            return res.status(400).json({ error: 'Invalid signature' });
        }

        if (event === 'payment.captured') {
            await prisma.$transaction([
                prisma.payment.create({
                    data: {
                        fee_id: fee.id,
                        amount: amount / 100,
                        status: 'paid',
                        school_id: fee.school_id,
                        payment_method: 'razorpay',
                        razorpay_payment_id,
                    },
                }),
                prisma.fee.update({
                    where: { id: fee.id },
                    data: { due_amount: 0 },
                }),
            ]);
        }

        res.json({ ok: true });
    } catch (error) {
        console.error('handleWebhook error:', error);
        res.status(500).json({ error: 'Webhook processing error' });
    }
};

const recordManualPayment = async (req, res) => {
    try {
        const { fee_id, amount, note } = req.body;
        const schoolId = req.user.school_id;

        const fee = await prisma.fee.findUnique({ where: { id: fee_id } });
        if (!fee) return res.status(404).json({ error: 'Fee not found' });
        if (fee.school_id !== schoolId) return res.status(403).json({ error: 'Forbidden' });

        const result = await prisma.$transaction([
            prisma.payment.create({
                data: {
                    fee_id,
                    amount: parseFloat(amount),
                    status: 'paid',
                    school_id: schoolId,
                    payment_method: 'cash',
                },
            }),
            prisma.fee.update({
                where: { id: fee_id },
                data: { due_amount: 0 },
            }),
        ]);

        res.json({ payment: result[0], fee: result[1] });
    } catch (error) {
        console.error('recordManualPayment error:', error);
        res.status(500).json({ error: 'Error recording payment' });
    }
};

const getRevenue = async (req, res) => {
    try {
        if (req.user.role !== 'super_admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const payments = await prisma.payment.findMany({
            where: { status: 'paid' },
            select: { amount: true, school_id: true },
        });

        const total = payments.reduce((sum, p) => sum + p.amount, 0);

        const perSchool = {};
        for (const p of payments) {
            perSchool[p.school_id] = (perSchool[p.school_id] || 0) + p.amount;
        }

        res.json({ total, perSchool });
    } catch (error) {
        console.error('getRevenue error:', error);
        res.status(500).json({ error: 'Error fetching revenue' });
    }
};

const getMyFees = async (req, res) => {
    try {
        const userId = req.user.id;

        const parent = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                children: {
                    include: {
                        fees: {
                            include: { payments: true },
                            orderBy: { due_date: 'desc' },
                        },
                    },
                },
            },
        });

        if (!parent) return res.status(404).json({ error: 'Parent not found' });

        res.json(parent.children);
    } catch (error) {
        console.error('getMyFees error:', error);
        res.status(500).json({ error: 'Error fetching fees' });
    }
};

const generateFees = async (req, res) => {
    try {
        const schoolId = req.user.school_id;

        const structures = await prisma.feeStructure.findMany({
            where: { school_id: schoolId, is_active: true },
        });

        let generated = 0;

        for (const structure of structures) {
            const dueDate = computeDueDate(structure);
            const periodStart = new Date(dueDate.getFullYear(), dueDate.getMonth(), 1);
            const periodEnd = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 1);

            const existing = await prisma.fee.findFirst({
                where: {
                    student_id: structure.student_id,
                    school_id: schoolId,
                    due_date: { gte: periodStart, lt: periodEnd },
                },
            });

            if (!existing) {
                await prisma.fee.create({
                    data: {
                        student_id: structure.student_id,
                        school_id: schoolId,
                        total_amount: structure.amount,
                        due_amount: structure.amount,
                        due_date: dueDate,
                    },
                });
                generated++;
            }
        }

        res.json({ generated });
    } catch (error) {
        console.error('generateFees error:', error);
        res.status(500).json({ error: 'Error generating fees' });
    }
};

module.exports = {
    getFees,
    createFee,
    createFeeStructure,
    createOrder,
    handleWebhook,
    recordManualPayment,
    getRevenue,
    getMyFees,
    generateFees,
};
