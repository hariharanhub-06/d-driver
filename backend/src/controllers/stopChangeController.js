const prisma = require('../prisma');

// POST /api/v1/stop-change  (parent)
const requestChange = async (req, res) => {
  const { student_id, current_stop_id, requested_stop_id, change_type, effective_date, reason } = req.body;
  const parentId = req.user.id;
  const schoolId = req.user.school_id;

  const student = await prisma.student.findUnique({
    where: { id: student_id },
    include: { stop: true, route: { include: { stops: { orderBy: { sequence: 'asc' } } } } },
  });
  if (!student || student.parent_id !== parentId) return res.status(403).json({ error: 'Not your student' });

  // Block if within 1 hour of pickup_time
  const currentStop = student.stop;
  if (currentStop?.pickup_time) {
    const [h, m] = currentStop.pickup_time.split(':').map(Number);
    const now = new Date();
    const pickup = new Date();
    pickup.setHours(h, m, 0, 0);
    const diffMs = pickup - now;
    if (diffMs > 0 && diffMs < 60 * 60 * 1000) {
      return res.status(400).json({ error: 'Changes locked 1 hour before departure' });
    }
  }

  const request = await prisma.stopChangeRequest.create({
    data: { student_id, parent_id: parentId, current_stop_id, requested_stop_id, change_type, effective_date: new Date(effective_date), reason, school_id: schoolId },
  });

  res.status(201).json({ request });
};

// GET /api/v1/stop-change  (admin)
const listRequests = async (req, res) => {
  const { status } = req.query;
  const schoolId = req.user.role === 'super_admin'
    ? (req.query.school_id || null)
    : req.user.school_id;
  const where = { school_id: schoolId };
  if (status) where.status = status;

  const requests = await prisma.stopChangeRequest.findMany({
    where,
    orderBy: { created_at: 'desc' },
    take: 100,
    include: {
      student: { select: { name: true, grade: true } },
      currentStop: { select: { name: true } },
      requestedStop: { select: { name: true } },
    },
  });
  res.json({ requests });
};

// PUT /api/v1/stop-change/:id/approve  (admin)
const approveRequest = async (req, res) => {
  const { admin_note } = req.body;
  const io = req.app.get('io');

  const request = await prisma.stopChangeRequest.findUnique({
    where: { id: req.params.id },
    include: { student: true },
  });
  if (!request) return res.status(404).json({ error: 'Request not found' });

  await prisma.$transaction([
    prisma.stopChangeRequest.update({ where: { id: request.id }, data: { status: 'approved', admin_note } }),
    prisma.student.update({ where: { id: request.student_id }, data: { stop_id: request.requested_stop_id } }),
  ]);

  await prisma.notification.create({
    data: { user_id: request.parent_id, message: `Stop change for ${request.student.name} has been approved.`, type: 'success', school_id: request.school_id },
  });

  io?.to(`parent-${request.parent_id}`).emit('stop-change-approved', { student_name: request.student.name });

  res.json({ message: 'Stop change approved and student stop updated' });
};

// PUT /api/v1/stop-change/:id/reject  (admin)
const rejectRequest = async (req, res) => {
  const { admin_note } = req.body;
  const io = req.app.get('io');

  const request = await prisma.stopChangeRequest.findUnique({ where: { id: req.params.id }, include: { student: true } });
  if (!request) return res.status(404).json({ error: 'Request not found' });

  await prisma.stopChangeRequest.update({ where: { id: request.id }, data: { status: 'rejected', admin_note } });

  await prisma.notification.create({
    data: { user_id: request.parent_id, message: `Stop change for ${request.student.name} was not approved. ${admin_note || ''}`, type: 'alert', school_id: request.school_id },
  });

  io?.to(`parent-${request.parent_id}`).emit('stop-change-rejected', { student_name: request.student.name, reason: admin_note });

  res.json({ message: 'Stop change request rejected' });
};

module.exports = { requestChange, listRequests, approveRequest, rejectRequest };
