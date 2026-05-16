const prisma = require('../prisma');

// POST /attendance/mark — driver or admin marks attendance for a student
const markAttendance = async (req, res) => {
    try {
        const { student_id, status, note } = req.body;
        if (!student_id || !status) {
            return res.status(400).json({ error: 'student_id and status are required' });
        }
        if (!['present', 'absent', 'missed'].includes(status)) {
            return res.status(400).json({ error: 'status must be present, absent, or missed' });
        }

        // Determine school scope
        let schoolId = req.user.school_id;
        if (req.user.role === 'super_admin') {
            const student = await prisma.student.findUnique({ where: { id: student_id }, select: { school_id: true } });
            if (!student) return res.status(404).json({ error: 'Student not found' });
            schoolId = student.school_id;
        }

        const record = await prisma.attendance.create({
            data: {
                student_id,
                status,
                note: note || null,
                school_id: schoolId,
                date: new Date(),
                marked_at: new Date(),
            },
            include: {
                student: { select: { id: true, name: true, parent_id: true, stop_id: true } },
            },
        });

        // Notify parent via DB notification + socket emit
        if (record.student.parent_id) {
            try {
                await prisma.notification.create({
                    data: {
                        user_id: record.student.parent_id,
                        school_id: schoolId,
                        message: `${record.student.name} is marked ${status} today.`,
                        type: status === 'present' ? 'success' : 'alert',
                    },
                });
                const io = req.app.get('io');
                if (io) {
                    io.to(`parent-${record.student.parent_id}`).emit('attendance', {
                        student_id,
                        student_name: record.student.name,
                        status,
                        date: record.date,
                    });
                }
            } catch (notifyErr) {
                console.error('Notification error:', notifyErr.message);
                // Don't fail the whole request if notification fails
            }
        }

        res.status(201).json(record);
    } catch (error) {
        res.status(500).json({ error: 'Error marking attendance', details: error.message });
    }
};

// GET /attendance — supports ?student_id, ?route_id, ?date, ?month
const getAttendance = async (req, res) => {
    try {
        const { student_id, route_id, date, month } = req.query;
        const schoolId = req.user.role === 'super_admin' ? req.query.school_id : req.user.school_id;

        const where = {};
        if (schoolId) where.school_id = schoolId;
        if (student_id) where.student_id = student_id;

        // Month view: YYYY-MM — return all records in that calendar month
        if (month) {
            const [year, mon] = month.split('-').map(Number);
            const start = new Date(year, mon - 1, 1);
            const end = new Date(year, mon, 1);
            where.date = { gte: start, lt: end };
        } else if (date) {
            const day = new Date(date);
            const nextDay = new Date(date);
            nextDay.setDate(nextDay.getDate() + 1);
            where.date = { gte: day, lt: nextDay };
        } else {
            // Default: today
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            where.date = { gte: today, lt: tomorrow };
        }

        // Route filter — join through student
        if (route_id) {
            where.student = { route_id };
        }

        const attendance = await prisma.attendance.findMany({
            where,
            include: {
                student: {
                    select: {
                        id: true,
                        name: true,
                        grade: true,
                        section: true,
                        stop: { select: { id: true, name: true } },
                    },
                },
            },
            orderBy: { date: 'desc' },
        });
        res.json(attendance);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching attendance', details: error.message });
    }
};

// GET /attendance/today — today's attendance for school, grouped by route
const getTodayAttendance = async (req, res) => {
    try {
        const schoolId = req.user.role === 'super_admin' ? req.query.school_id : req.user.school_id;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const records = await prisma.attendance.findMany({
            where: {
                school_id: schoolId,
                date: { gte: today, lt: tomorrow },
            },
            include: {
                student: {
                    select: {
                        id: true,
                        name: true,
                        route_id: true,
                        stop: { select: { id: true, name: true } },
                        route: { select: { id: true, name: true } },
                    },
                },
            },
            orderBy: { marked_at: 'desc' },
        });

        // Group by route
        const grouped = {};
        for (const record of records) {
            const routeId = record.student.route_id || 'unassigned';
            const routeName = record.student.route?.name || 'Unassigned';
            if (!grouped[routeId]) {
                grouped[routeId] = { route_id: routeId, route_name: routeName, records: [] };
            }
            grouped[routeId].records.push(record);
        }

        res.json(Object.values(grouped));
    } catch (error) {
        res.status(500).json({ error: 'Error fetching today\'s attendance', details: error.message });
    }
};

module.exports = { markAttendance, getAttendance, getTodayAttendance };
