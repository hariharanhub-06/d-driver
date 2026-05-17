const prisma = require('../prisma');

const getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, action, targetType, schoolId, from, to } = req.query;
    const where = {};
    if (action) where.action = action;
    if (targetType) where.target_type = targetType;
    if (req.user.role !== 'super_admin' && req.user.school_id) {
      where.school_id = req.user.school_id;
    } else if (schoolId) {
      where.school_id = schoolId;
    }
    if (from || to) {
      where.created_at = {};
      if (from) where.created_at.gte = new Date(from);
      if (to) where.created_at.lte = new Date(to);
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.auditLog.count({ where }),
    ]);

    // Enrich with actor names
    const actorIds = [...new Set(logs.map(l => l.actor_id).filter(id => id !== 'system'))];
    const users = actorIds.length > 0
      ? await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true, email: true } })
      : [];
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));

    const enriched = logs.map(l => ({
      ...l,
      actor_name: userMap[l.actor_id]?.name || l.actor_id,
      actor_email: userMap[l.actor_id]?.email || null,
    }));

    res.json({ logs: enriched, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error('getAuditLogs error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
};

const getLoginActivity = async (req, res) => {
  try {
    const { page = 1, limit = 50, from, to, role } = req.query;
    const where = { action: 'login' };
    if (role) where.actor_role = role;
    if (from || to) {
      where.created_at = {};
      if (from) where.created_at.gte = new Date(from);
      if (to) where.created_at.lte = new Date(to);
    }
    if (req.user.role !== 'super_admin' && req.user.school_id) {
      where.school_id = req.user.school_id;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.auditLog.count({ where }),
    ]);

    const actorIds = [...new Set(logs.map(l => l.actor_id).filter(id => id !== 'system'))];
    const users = actorIds.length > 0
      ? await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true, email: true } })
      : [];
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));

    const enriched = logs.map(l => ({
      ...l,
      actor_name: userMap[l.actor_id]?.name || l.actor_id,
      actor_email: userMap[l.actor_id]?.email || null,
    }));

    res.json({ logs: enriched, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error('getLoginActivity error:', error);
    res.status(500).json({ error: 'Failed to fetch login activity' });
  }
};

module.exports = { getAuditLogs, getLoginActivity };
