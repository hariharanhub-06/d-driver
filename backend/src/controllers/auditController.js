const prisma = require('../prisma');

// Returns IDs of all DEV SA users — used to scrub their traces from non-DEV SA views.
const getDevSaIds = async () => {
  const devSAs = await prisma.user.findMany({ where: { is_dev_sa: true }, select: { id: true } });
  return devSAs.map(u => u.id);
};

// Build exclusion clause that hides all DEV SA traces from regular SAs.
// Hides: logs where actor is DEV SA, OR where target is a DEV SA user.
const buildDevSaExclude = (devSaIds) => {
  if (!devSaIds.length) return {};
  return {
    actor_id: { notIn: devSaIds },
    NOT: {
      AND: [
        { target_type: 'user' },
        { target_id: { in: devSaIds } },
      ],
    },
  };
};

const getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, action, targetType, schoolId, date_from: from, date_to: to } = req.query;

    // Non-DEV SA must never see DEV SA traces
    const devSaIds = req.user.is_dev_sa ? [] : await getDevSaIds().catch(() => []);

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

    // Exclude DEV SA traces for regular SAs
    if (devSaIds.length) {
      where.actor_id = { notIn: devSaIds };
      // Also hide logs that targeted a DEV SA user
      where.NOT = {
        AND: [{ target_type: 'user' }, { target_id: { in: devSaIds.map(String) } }],
      };
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

    // Enrich with actor names — exclude DEV SA users from lookup for non-DEV SA
    const actorIds = [...new Set(logs.map(l => l.actor_id).filter(id => id !== 'system'))];
    const users = actorIds.length > 0
      ? await prisma.user.findMany({
          where: {
            id: { in: actorIds },
            ...(devSaIds.length ? { is_dev_sa: false } : {}),
          },
          select: { id: true, name: true, email: true },
        })
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
    const { page = 1, limit = 50, date_from: from, date_to: to, role } = req.query;

    const devSaIds = req.user.is_dev_sa ? [] : await getDevSaIds().catch(() => []);

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

    // Hide DEV SA login traces from regular SAs
    if (devSaIds.length) {
      where.actor_id = { notIn: devSaIds };
    }

    let logs = [], total = 0;
    try {
      [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          orderBy: { created_at: 'desc' },
          skip: (parseInt(page) - 1) * parseInt(limit),
          take: parseInt(limit),
        }),
        prisma.auditLog.count({ where }),
      ]);
    } catch (e) {
      console.error('auditLog query failed (table may not exist yet):', e.message);
    }

    const actorIds = [...new Set(logs.map(l => l.actor_id).filter(id => id !== 'system'))];
    const users = actorIds.length > 0
      ? await prisma.user.findMany({
          where: {
            id: { in: actorIds },
            ...(devSaIds.length ? { is_dev_sa: false } : {}),
          },
          select: { id: true, name: true, email: true },
        }).catch(() => [])
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
