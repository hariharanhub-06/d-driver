const prisma = require('../prisma');

/**
 * Log a super-admin action on school data.
 * Fire-and-forget — never throws, so it never blocks a response.
 */
const logAudit = ({ actor_id, actor_role, action, target_type, target_id, school_id, ip_address }) => {
  prisma.auditLog
    .create({ data: { actor_id, actor_role, action, target_type, target_id, school_id: school_id || null, ip_address: ip_address || null } })
    .catch((err) => console.error('AuditLog write failed:', err.message));
};

/**
 * Log an action using the authenticated request context.
 * Async but never throws — safe to await without crashing the caller.
 */
const logAction = async ({ req, action, targetType, targetId, schoolId = null, details = null }) => {
  try {
    const actor = req.user;
    if (!actor) return;
    await prisma.auditLog.create({
      data: {
        actor_id: actor.id || 'system',
        actor_role: actor.role || 'unknown',
        action,
        target_type: targetType,
        target_id: String(targetId),
        school_id: schoolId || actor.school_id || null,
        ip_address: req.ip || req.headers['x-forwarded-for'] || null,
      },
    });
  } catch (e) {
    // Never crash on audit log failure
  }
};

module.exports = { logAudit, logAction };
