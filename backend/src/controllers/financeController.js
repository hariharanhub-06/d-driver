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
        const { getSchoolFilter } = require('../middleware/authMiddleware');
        const { student_id } = req.query;

        const where = { ...getSchoolFilter(req) };
        if (student_id) where.student_id = student_id;

        const fees = await prisma.fee.findMany({
            where,
            include: {
                payments: true,
                student: { select: { id: true, name: true } },
            },
            orderBy: { due_date: 'desc' },
        });

        const now = new Date();
        const enriched = fees.map(fee => ({
            ...fee,
            amount: fee.total_amount,
            status: fee.due_amount === 0
                ? 'paid'
                : new Date(fee.due_date) < now
                    ? 'overdue'
                    : 'pending',
        }));

        res.json(enriched);
    } catch (error) {
        console.error('getFees error:', error);
        res.status(500).json({ error: 'Error fetching fees' });
    }
};

const createFee = async (req, res) => {
    try {
        const { student_id, total_amount, due_amount, due_date, payment_method, school_id } = req.body;
        const schoolId = req.user.role === 'super_admin' ? (school_id || req.query.school_id) : req.user.school_id;

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
        const { student_id, amount, frequency, due_day, academic_year, school_id } = req.body;
        const schoolId = req.user.role === 'super_admin' ? (school_id || req.query.school_id) : req.user.school_id;

        const now = new Date();
        const resolvedAcademicYear = academic_year ||
            (now.getMonth() >= 5
                ? `${now.getFullYear()}-${now.getFullYear() + 1}`
                : `${now.getFullYear() - 1}-${now.getFullYear()}`);

        const feeStructure = await prisma.feeStructure.upsert({
            where: { student_id },
            create: {
                student_id,
                school_id: schoolId,
                amount: parseFloat(amount),
                frequency,
                due_day: parseInt(due_day) || 5,
                academic_year: resolvedAcademicYear,
                is_active: true,
            },
            update: {
                amount: parseFloat(amount),
                frequency,
                due_day: parseInt(due_day) || 5,
                academic_year: resolvedAcademicYear,
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

        // Dev SA sees all; regular SA scoped to assigned schools
        const schoolFilter = req.user.is_dev_sa ? {} : { school: { assigned_sa_id: req.user.id } };
        const payments = await prisma.payment.findMany({
            where: { status: 'paid', ...schoolFilter },
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

        const now = new Date();
        // Flatten children → fees, adding computed status + student_name + normalised amount
        const fees = (parent.children || []).flatMap(child =>
            (child.fees || []).map(fee => ({
                ...fee,
                student_name: child.name,
                amount: fee.total_amount ?? fee.due_amount ?? 0,
                status: fee.due_amount === 0
                    ? 'paid'
                    : new Date(fee.due_date) < now
                        ? 'overdue'
                        : 'pending',
            }))
        );

        res.json(fees);
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

// POST /finance/payment/verify — parent calls this after completing Razorpay checkout in browser
const verifyPayment = async (req, res) => {
    try {
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
        if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
            return res.status(400).json({ error: 'Missing payment verification fields' });
        }

        const fee = await prisma.fee.findFirst({ where: { razorpay_order_id } });
        if (!fee) return res.status(404).json({ error: 'Fee not found for this order' });

        const schoolData = await prisma.school.findUnique({
            where: { id: fee.school_id },
            select: { razorpay_key_secret: true, razorpay_configured: true },
        });
        if (!schoolData?.razorpay_configured || !schoolData.razorpay_key_secret) {
            return res.status(400).json({ error: 'Razorpay not configured for this school' });
        }
        const keySecret = decrypt(schoolData.razorpay_key_secret);

        const expectedSig = crypto
            .createHmac('sha256', keySecret)
            .update(razorpay_order_id + '|' + razorpay_payment_id)
            .digest('hex');

        if (expectedSig !== razorpay_signature) {
            return res.status(400).json({ error: 'Invalid payment signature' });
        }

        await prisma.$transaction([
            prisma.payment.create({
                data: {
                    fee_id: fee.id,
                    amount: fee.due_amount,
                    status: 'paid',
                    payment_method: 'razorpay',
                    razorpay_payment_id,
                    school_id: fee.school_id,
                },
            }),
            prisma.fee.update({
                where: { id: fee.id },
                data: { due_amount: 0 },
            }),
        ]);

        res.json({ success: true });
    } catch (error) {
        console.error('verifyPayment error:', error);
        res.status(500).json({ error: 'Payment verification failed' });
    }
};

// POST /finance/fee-delay — parent requests a due date extension
const createFeeDelayRequest = async (req, res) => {
    try {
        const { fee_id, requested_date, reason } = req.body;
        const userId = req.user.id;

        const fee = await prisma.fee.findUnique({ where: { id: fee_id }, include: { student: true } });
        if (!fee) return res.status(404).json({ error: 'Fee not found' });

        const children = await prisma.student.findMany({ where: { parent_id: userId } });
        if (!children.map(c => c.id).includes(fee.student_id)) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const request = await prisma.feeDelayRequest.create({
            data: {
                fee_id,
                parent_id: userId,
                school_id: fee.school_id,
                requested_date: new Date(requested_date),
                reason,
                status: 'pending',
            },
        });

        const { notifyAdmins } = require('../utils/notifications');
        await notifyAdmins(
            fee.school_id,
            `Fee delay requested for ${fee.student.name} — proposed date: ${new Date(requested_date).toLocaleDateString('en-IN')}. Reason: ${reason}`,
            'alert'
        );

        res.status(201).json(request);
    } catch (err) {
        console.error('createFeeDelayRequest error:', err);
        res.status(500).json({ error: 'Failed to submit delay request' });
    }
};

// GET /finance/fee-delay — admin lists delay requests
const getFeeDelayRequests = async (req, res) => {
    try {
        const { getSchoolFilter } = require('../middleware/authMiddleware');
        const requests = await prisma.feeDelayRequest.findMany({
            where: getSchoolFilter(req),
            include: { fee: { include: { student: { select: { name: true } } } } },
            orderBy: { created_at: 'desc' },
        });

        res.json(requests.map(r => ({
            ...r,
            student_name: r.fee?.student?.name,
            fee_amount: r.fee?.total_amount,
            current_due_date: r.fee?.due_date,
        })));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch delay requests' });
    }
};

// PUT /finance/fee-delay/:id — admin approves or rejects
const updateFeeDelayRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, approved_due_date, admin_note } = req.body;

        const request = await prisma.feeDelayRequest.findUnique({ where: { id } });
        if (!request) return res.status(404).json({ error: 'Request not found' });

        const updated = await prisma.feeDelayRequest.update({
            where: { id },
            data: {
                status,
                approved_due_date: approved_due_date ? new Date(approved_due_date) : null,
                admin_note: admin_note || null,
            },
        });

        if (status === 'approved' && approved_due_date) {
            await prisma.fee.update({
                where: { id: request.fee_id },
                data: { due_date: new Date(approved_due_date) },
            });
        }

        const { notifyUser } = require('../utils/notifications');
        const msg = status === 'approved'
            ? `Your fee delay request was approved. New due date: ${new Date(approved_due_date).toLocaleDateString('en-IN')}`
            : `Your fee delay request was rejected.${admin_note ? ` Reason: ${admin_note}` : ''}`;
        await notifyUser(request.parent_id, msg, status === 'approved' ? 'success' : 'alert', request.school_id);

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update delay request' });
    }
};

// POST /finance/fees/remind-all — admin bulk reminder to all parents with pending/overdue fees
const remindAllFees = async (req, res) => {
    try {
        const schoolId = req.user.school_id;
        const now = new Date();
        const { notifyUser } = require('../utils/notifications');

        const fees = await prisma.fee.findMany({
            where: { school_id: schoolId, due_amount: { gt: 0 } },
            include: { student: { include: { parent: { select: { id: true } } } } },
        });

        const parentsSent = new Set();
        for (const fee of fees) {
            const parentId = fee.student?.parent?.id;
            if (!parentId) continue;
            const isOverdue = new Date(fee.due_date) < now;
            const msg = isOverdue
                ? `Overdue: Transport fee ₹${fee.due_amount.toLocaleString('en-IN')} for ${fee.student.name} is overdue.`
                : `Reminder: Transport fee ₹${fee.due_amount.toLocaleString('en-IN')} for ${fee.student.name} is due ${new Date(fee.due_date).toLocaleDateString('en-IN')}.`;
            await notifyUser(parentId, msg, 'alert', schoolId);
            parentsSent.add(parentId);
        }

        res.json({ reminded: parentsSent.size });
    } catch (err) {
        res.status(500).json({ error: 'Failed to send reminders' });
    }
};

module.exports = {
    getFees,
    createFee,
    createFeeStructure,
    createOrder,
    handleWebhook,
    verifyPayment,
    recordManualPayment,
    getRevenue,
    getMyFees,
    generateFees,
    createFeeDelayRequest,
    getFeeDelayRequests,
    updateFeeDelayRequest,
    remindAllFees,
};
