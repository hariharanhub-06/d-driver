const prisma = require('../prisma');
const { notifyAdmins } = require('../utils/notifications');

// POST /api/v1/absence
const reportAbsence = async (req, res) => {
  try {
    const { student_id, date, reason } = req.body;
    const parentId = req.user.id;
    const schoolId = req.user.school_id;

    const student = await prisma.student.findUnique({ where: { id: student_id } });
    if (!student || student.school_id !== schoolId) return res.status(404).json({ error: 'Student not found' });
    if (student.parent_id !== parentId) return res.status(403).json({ error: 'You are not this student\'s parent' });

    // date arrives as "YYYY-MM-DD" — build day boundaries correctly
    const dayStart = new Date(date + 'T00:00:00');
    const dayEnd   = new Date(date + 'T23:59:59.999');

    const existing = await prisma.absenceReport.findFirst({
      where: { student_id, date: { gte: dayStart, lte: dayEnd } },
    });
    if (existing) return res.status(409).json({ error: 'Absence already reported for this date' });

    const report = await prisma.absenceReport.create({
      data: { student_id, parent_id: parentId, date: dayStart, reason, school_id: schoolId },
    });

    // Pre-mark attendance absent for driver + bus_staff so they don't need to manually mark.
    // skipDuplicates ensures we never override a mark that driver/bus_staff already made.
    await prisma.attendance.createMany({
      data: [
        { student_id, date_only: date, status: 'absent', marked_by_role: 'driver', school_id: schoolId },
        { student_id, date_only: date, status: 'absent', marked_by_role: 'bus_staff', school_id: schoolId },
      ],
      skipDuplicates: true,
    });

    await notifyAdmins(
      schoolId,
      `Absence reported for ${student.name} on ${date}. Reason: ${reason || 'none'}.`,
      'info'
    );

    res.status(201).json({ report });
  } catch (error) {
    console.error('reportAbsence error:', error.message);
    res.status(500).json({ error: 'Error reporting absence', details: error.message });
  }
};

// GET /api/v1/absence  (admin sees all; driver sees only their route's students)
const getTodayAbsences = async (req, res) => {
  try {
    const { getSchoolFilter } = require('../middleware/authMiddleware');
    const { route_id, date } = req.query;

    const dateStr = date || new Date().toLocaleDateString('en-CA');
    const dayStart = new Date(dateStr + 'T00:00:00');
    const dayEnd   = new Date(dateStr + 'T23:59:59.999');

    const where = { ...getSchoolFilter(req), date: { gte: dayStart, lte: dayEnd } };

    if (req.user.role === 'driver' && route_id) {
      const routeStudentIds = await prisma.student.findMany({
        where: { route_id, school_id: req.user.school_id },
        select: { id: true },
      });
      where.student_id = { in: routeStudentIds.map((s) => s.id) };
    } else if (route_id) {
      const routeStudentIds = await prisma.student.findMany({ where: { route_id }, select: { id: true } });
      where.student_id = { in: routeStudentIds.map((s) => s.id) };
    }

    const absences = await prisma.absenceReport.findMany({
      where,
      include: { student: { select: { id: true, name: true, grade: true, route_id: true, photo_url: true } } },
    });

    res.json({ absences, count: absences.length });
  } catch (error) {
    console.error('getTodayAbsences error:', error.message);
    res.status(500).json({ error: 'Error fetching absences', details: error.message });
  }
};

// DELETE /api/v1/absence/:id  (parent cancels)
const cancelAbsence = async (req, res) => {
  try {
    const report = await prisma.absenceReport.findUnique({ where: { id: req.params.id } });
    if (!report || report.parent_id !== req.user.id) return res.status(404).json({ error: 'Absence report not found' });

    const dateOnly = report.date.toLocaleDateString('en-CA');

    await prisma.absenceReport.delete({ where: { id: req.params.id } });

    // Remove auto-pre-marked absent records (only those still 'absent' — if driver changed to 'present', keep that)
    await prisma.attendance.deleteMany({
      where: {
        student_id: report.student_id,
        date_only: dateOnly,
        status: 'absent',
        marked_by_role: { in: ['driver', 'bus_staff'] },
      },
    });

    res.json({ message: 'Absence report cancelled' });
  } catch (error) {
    console.error('cancelAbsence error:', error.message);
    res.status(500).json({ error: 'Error cancelling absence', details: error.message });
  }
};

// GET /api/v1/absence/my  (parent sees their own history)
const getMyAbsences = async (req, res) => {
  try {
    const reports = await prisma.absenceReport.findMany({
      where: { parent_id: req.user.id },
      include: { student: { select: { name: true, grade: true } } },
      orderBy: { date: 'desc' },
      take: 30,
    });
    res.json(reports);
  } catch (error) {
    console.error('getMyAbsences error:', error.message);
    res.status(500).json({ error: 'Error fetching absence history' });
  }
};

module.exports = { reportAbsence, getTodayAbsences, cancelAbsence, getMyAbsences };
