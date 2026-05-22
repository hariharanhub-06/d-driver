const prisma = require('../prisma');
const { notifyAdmins } = require('../utils/notifications');

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

  const requestedStop = await prisma.stop.findUnique({ where: { id: requested_stop_id }, select: { name: true } });

  const request = await prisma.stopChangeRequest.create({
    data: { student_id, parent_id: parentId, current_stop_id, requested_stop_id, change_type, effective_date: new Date(effective_date), reason, school_id: schoolId },
    include: { requestedStop: { select: { name: true } } },
  });

  const typeLabel = change_type === 'temporary' ? 'temporary' : 'permanent';
  await notifyAdmins(
    schoolId,
    `Stop change request for ${student.name}: ${typeLabel} move to "${requestedStop?.name || 'new stop'}" on ${effective_date}. Reason: ${reason || 'none'}.`,
    'info'
  );

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
  try {
    const { admin_note } = req.body;
    const io = req.app.get('io');

    const request = await prisma.stopChangeRequest.findUnique({
      where: { id: req.params.id },
      include: {
        student: { select: { name: true } },
        requestedStop: { select: { name: true } },
      },
    });
    if (!request) return res.status(404).json({ error: 'Request not found' });

    await prisma.stopChangeRequest.update({
      where: { id: request.id },
      data: { status: 'approved', admin_note: admin_note || null },
    });

    // Permanent change: update the student's stop_id in the DB immediately.
    // Temporary change: do NOT touch stop_id — getActiveTrips applies it dynamically.
    if (request.change_type === 'permanent') {
      await prisma.student.update({
        where: { id: request.student_id },
        data: { stop_id: request.requested_stop_id },
      });
    }

    const stopName = request.requestedStop?.name || 'new stop';
    const studentName = request.student?.name || 'Student';
    const typeLabel = request.change_type === 'temporary' ? 'temporarily' : 'permanently';

    await prisma.notification.create({
      data: {
        user_id: request.parent_id,
        message: `Stop change for ${studentName} approved. ${studentName} will ${typeLabel} board from "${stopName}".`,
        type: 'success',
        school_id: request.school_id,
      },
    });

    io?.to(`parent-${request.parent_id}`).emit('stop-change-approved', { student_name: studentName });

    res.json({ message: `Stop change approved (${request.change_type})` });
  } catch (error) {
    console.error('approveRequest error:', error.message);
    res.status(500).json({ error: 'Error approving request', details: error.message });
  }
};

// PUT /api/v1/stop-change/:id/reject  (admin)
const rejectRequest = async (req, res) => {
  try {
    const { admin_note } = req.body;
    const io = req.app.get('io');

    const request = await prisma.stopChangeRequest.findUnique({
      where: { id: req.params.id },
      include: { student: { select: { name: true } } },
    });
    if (!request) return res.status(404).json({ error: 'Request not found' });

    await prisma.stopChangeRequest.update({
      where: { id: request.id },
      data: { status: 'rejected', admin_note: admin_note || null },
    });

    const studentName = request.student?.name || 'Student';
    await prisma.notification.create({
      data: {
        user_id: request.parent_id,
        message: `Stop change for ${studentName} was not approved.${admin_note ? ' ' + admin_note : ''}`,
        type: 'alert',
        school_id: request.school_id,
      },
    });

    io?.to(`parent-${request.parent_id}`).emit('stop-change-rejected', { student_name: studentName, reason: admin_note });

    res.json({ message: 'Stop change request rejected' });
  } catch (error) {
    console.error('rejectRequest error:', error.message);
    res.status(500).json({ error: 'Error rejecting request', details: error.message });
  }
};

module.exports = { requestChange, listRequests, approveRequest, rejectRequest };
