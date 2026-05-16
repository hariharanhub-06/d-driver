const prisma = require('../prisma');

// Feature permission keys must match the JSON stored in School.permissions
const PERMISSION_KEYS = [
  'gps_tracking', 'fee_management', 'fuel_management', 'shift_tracking',
  'attendance', 'parent_portal', 'route_management', 'student_photos',
  'stop_change_requests', 'absence_reporting', 'razorpay_payments',
];

const DEFAULT_PERMISSIONS = Object.fromEntries(PERMISSION_KEYS.map((k) => [k, true]));

/**
 * Middleware factory — checks that a specific feature is enabled for the school.
 * SA always passes through.
 */
const requirePermission = (featureKey) => async (req, res, next) => {
  if (req.user.role === 'super_admin') return next();

  const schoolId = req.user.school_id;
  if (!schoolId) return res.status(403).json({ error: 'No school context' });

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { permissions: true },
  });

  const permissions = { ...DEFAULT_PERMISSIONS, ...(school?.permissions || {}) };

  if (!permissions[featureKey]) {
    return res.status(403).json({
      error: `Feature not enabled for your school`,
      feature: featureKey,
    });
  }

  next();
};

module.exports = { requirePermission, PERMISSION_KEYS, DEFAULT_PERMISSIONS };
