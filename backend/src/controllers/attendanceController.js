const prisma = require('../prisma');
const { notifyAdmins } = require('../utils/notifications');
const { logAction } = require('../utils/auditLog');

/**
 * Reconcile driver and bus_staff attendance marks for a student on a given day.
 * Applies conflict-resolution rules and sends the appropriate notification.
 *
 * Rules:
 *   both present                  → notify parent: present
 *   both absent                   → notify parent: absent
 *   one present, one absent       → notify admin: conflict, no parent update
 *   one present, one not marked   → notify parent: present
 *   one absent, one not marked    → notify parent: absent
 *   both not marked               → handled by completeTrip (end-of-trip check)
 */
async function reconcileAttendance(student_id, date_only, school_id, io, attendanceType = 'pickup') {
    const [driverMark, staffMark] = await Promise.all([
        prisma.attendance.findUnique({
            where: { student_id_date_only_marked_by_role: { student_id, date_only, marked_by_role: 'driver' } },
            include: { student: { select: { name: true, parent_id: true, stop: { select: { name: true } } } } },
        }),
        prisma.attendance.findUnique({
            where: { student_id_date_only_marked_by_role: { student_id, date_only, marked_by_role: 'bus_staff' } },
            include: { student: { select: { name: true, parent_id: true, stop: { select: { name: true } } } } },
        }),
    ]);

    const student = driverMark?.student || staffMark?.student;
    if (!student) return;

    // Read the status for THIS phase from its column, falling back to the legacy single
    // `status` field for old rows written before the two-phase columns existed.
    const phaseStatus = (mark) => {
        if (!mark) return undefined;
        const col = attendanceType === 'dropoff' ? mark.dropoff_status : mark.pickup_status;
        if (col != null) return col;
        // Legacy row: its single status belongs to whichever phase it recorded.
        return (mark.attendance_type === attendanceType) ? mark.status : undefined;
    };
    const d = phaseStatus(driverMark);
    const s = phaseStatus(staffMark);

    // Conflict: one present, one absent → admin only, no parent notification
    if (d && s && d !== s) {
        await notifyAdmins(
            school_id,
            `Attendance conflict for ${student.name} on ${date_only}: driver marked ${d}, bus staff marked ${s}.`,
            'alert'
        );
        return;
    }

    // Agreed or one-sided → determine final status
    const finalStatus = d || s;
    if (!finalStatus) return; // this phase not marked by either — handled by completeTrip

    if (!student.parent_id) return;

    const stopName = student.stop?.name;

    // Remove any prior notification for THIS phase today (avoid duplicates) without wiping the
    // other phase's notification — scope the match to this phase's wording.
    const startOfDay = new Date(date_only);
    startOfDay.setHours(0, 0, 0, 0);
    const phrasePool = attendanceType === 'dropoff'
        ? [{ message: { contains: 'dropped off' } }, { message: { contains: 'drop-off' } }]
        : [{ message: { contains: 'present in the bus' } }, { message: { contains: 'marked absent today' } }];
    await prisma.notification.deleteMany({
        where: {
            user_id: student.parent_id,
            message: { contains: student.name },
            created_at: { gte: startOfDay },
            type: { in: ['success', 'alert'] },
            OR: phrasePool,
        },
    });

    let msg;
    if (attendanceType === 'dropoff') {
        msg = finalStatus === 'present'
            ? `${student.name} has been dropped off${stopName ? ` at ${stopName}` : ''}.`
            : `${student.name} was marked absent for evening drop-off today.`;
    } else {
        msg = finalStatus === 'present'
            ? `${student.name} is present in the bus today.`
            : `${student.name} is marked absent today.`;
    }

    await prisma.notification.create({
        data: {
            user_id: student.parent_id,
            school_id,
            message: msg,
            type: finalStatus === 'present' ? 'success' : 'alert',
        },
    });

    if (io) {
        io.to(`parent-${student.parent_id}`).emit('attendance', {
            student_id,
            student_name: student.name,
            status: finalStatus,
            date: date_only,
        });
    }
}

// POST /attendance/mark — driver or bus_staff marks attendance for a student
const markAttendance = async (req, res) => {
    try {
        const { student_id, status, note, trip_id, attendance_type } = req.body;
        if (!student_id || !status) {
            return res.status(400).json({ error: 'student_id and status are required' });
        }
        if (!['present', 'absent', 'missed'].includes(status)) {
            return res.status(400).json({ error: 'status must be present, absent, or missed' });
        }
        const attendanceType = attendance_type === 'dropoff' ? 'dropoff' : 'pickup';

        // Lock attendance to running trips: drivers/bus-staff cannot mark after the
        // trip is completed. Admins are exempt (manual corrections).
        if (trip_id && (req.user.role === 'bus_staff' || req.user.role === 'driver')) {
            const activeTrip = await prisma.activeTrip.findUnique({
                where: { id: trip_id },
                select: { status: true },
            });
            if (!activeTrip || activeTrip.status !== 'running') {
                return res.status(409).json({ error: 'This trip has ended. Attendance is now closed.' });
            }
        }

        // Determine school scope
        let schoolId = req.user.school_id;
        if (req.user.role === 'super_admin') {
            const student = await prisma.student.findUnique({ where: { id: student_id }, select: { school_id: true } });
            if (!student) return res.status(404).json({ error: 'Student not found' });
            schoolId = student.school_id;
        }

        const dateOnly = new Date().toLocaleDateString('en-CA'); // "YYYY-MM-DD"
        const markedByRole = req.user.role; // driver | bus_staff | admin | super_admin
        const now = new Date();

        // Two-phase: write the marked phase into its own column (+ timestamp) on the single
        // per-(student, date, role) row, so a child can be both "picked up" and "dropped"
        // in the evening without one overwriting the other.
        const phaseFields = attendanceType === 'dropoff'
            ? { dropoff_status: status, dropoff_at: now }
            : { pickup_status: status, pickup_at: now };

        // Upsert: one record per (student, date, role) — idempotent re-marking
        const record = await prisma.attendance.upsert({
            where: {
                student_id_date_only_marked_by_role: {
                    student_id,
                    date_only: dateOnly,
                    marked_by_role: markedByRole,
                },
            },
            create: {
                student_id,
                date_only: dateOnly,
                date: now,
                status,
                note: note || null,
                school_id: schoolId,
                marked_by_role: markedByRole,
                trip_id: trip_id || null,
                attendance_type: attendanceType,
                ...phaseFields,
            },
            update: {
                status,
                note: note || null,
                marked_at: now,
                attendance_type: attendanceType,
                ...phaseFields,
            },
            include: {
                student: { select: { id: true, name: true, parent_id: true, stop_id: true } },
            },
        });

        // Reconcile: apply conflict rules and send the right notification for THIS phase
        try {
            const io = req.app.get('io');
            await reconcileAttendance(student_id, dateOnly, schoolId, io, attendanceType);
        } catch (reconcileErr) {
            console.error('Reconcile error:', reconcileErr.message);
        }

        // Log to audit trail (fire-and-forget)
        logAction({ req, action: 'mark_attendance', targetType: 'student', targetId: student_id });

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

        if (month) {
            const [year, mon] = month.split('-').map(Number);
            const start = new Date(year, mon - 1, 1);
            const end = new Date(year, mon, 1);
            where.date = { gte: start, lt: end };
        } else if (date) {
            // Use date_only string field to avoid UTC/IST timezone mismatches
            where.date_only = date;
        } else {
            const todayStr = new Date().toLocaleDateString('en-CA'); // "YYYY-MM-DD" server local
            where.date_only = todayStr;
        }

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

        // Deduplicate: keep most recent per (student_id) for display purposes
        const seen = new Map();
        for (const r of records) {
            if (!seen.has(r.student_id)) seen.set(r.student_id, r);
        }
        const deduped = Array.from(seen.values());

        // Group by route
        const grouped = {};
        for (const record of deduped) {
            const routeId = record.student.route_id || 'unassigned';
            const routeName = record.student.route?.name || 'Unassigned';
            if (!grouped[routeId]) {
                grouped[routeId] = { route_id: routeId, route_name: routeName, records: [] };
            }
            grouped[routeId].records.push(record);
        }

        res.json(Object.values(grouped));
    } catch (error) {
        res.status(500).json({ error: "Error fetching today's attendance", details: error.message });
    }
};

module.exports = { markAttendance, getAttendance, getTodayAttendance };
