const prisma = require('../prisma');

// POST /api/v1/absence
const reportAbsence = async (req, res) => {
  const { student_id, date, reason } = req.body;
  const parentId = req.user.id;
  const schoolId = req.user.school_id;

  const student = await prisma.student.findUnique({ where: { id: student_id } });
  if (!student || student.school_id !== schoolId) return res.status(404).json({ error: 'Student not found' });
  if (student.parent_id !== parentId) return res.status(403).json({ error: 'You are not this student\'s parent' });

  const absenceDate = new Date(date);

  // Check if already reported for this date
  const existing = await prisma.absenceReport.findFirst({
    where: { student_id, date: { gte: new Date(absenceDate.toDateString()), lt: new Date(absenceDate.toDateString() + 'T23:59:59') } },
  });
  if (existing) return res.status(409).json({ error: 'Absence already reported for this date' });

  const report = await prisma.absenceReport.create({
    data: { student_id, parent_id: parentId, date: absenceDate, reason, school_id: schoolId },
  });

  res.status(201).json({ report });
};

// GET /api/v1/absence  (admin sees all; driver sees only their route's students)
const getTodayAbsences = async (req, res) => {
  const schoolId = req.schoolId;
  const { route_id, date } = req.query;

  const targetDate = date ? new Date(date) : new Date();
  const dayStart = new Date(targetDate.toDateString());
  const dayEnd = new Date(dayStart.getTime() + 86400000);

  const where = { school_id: schoolId, date: { gte: dayStart, lt: dayEnd } };

  if (req.user.role === 'driver' && route_id) {
    // Drivers see only students on their route
    const routeStudentIds = await prisma.student.findMany({
      where: { route_id, school_id: schoolId },
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
};

// DELETE /api/v1/absence/:id  (parent cancels)
const cancelAbsence = async (req, res) => {
  const report = await prisma.absenceReport.findUnique({ where: { id: req.params.id } });
  if (!report || report.parent_id !== req.user.id) return res.status(404).json({ error: 'Absence report not found' });

  await prisma.absenceReport.delete({ where: { id: req.params.id } });
  res.json({ message: 'Absence report cancelled' });
};

module.exports = { reportAbsence, getTodayAbsences, cancelAbsence };
