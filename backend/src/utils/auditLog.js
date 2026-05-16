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

module.exports = { logAudit };
