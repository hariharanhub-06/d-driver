const jwt = require('jsonwebtoken');
const prisma = require('../prisma');

// Helper: get school IDs visible to an SA user
const getSASchoolIds = async (userId) => {
    const schools = await prisma.school.findMany({
        where: { assigned_sa_id: userId },
        select: { id: true },
    });
    return schools.map(s => s.id);
};

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  // Check if token has been invalidated (logout blocklist) — fail open on DB error
  try {
    const blocked = await prisma.blockedToken.findUnique({ where: { token } });
    if (blocked) {
      return res.status(401).json({ error: 'Token has been invalidated. Please log in again.' });
    }
  } catch {
    // Blocklist check failed (DB hiccup) — proceed rather than block the user
  }

  let user;
  try {
    user = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  try {
    // Verify user still exists and is active
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser || !dbUser.is_active) {
      return res.status(401).json({ error: 'Account not found or deactivated' });
    }

    // Verify the school the user belongs to is still active (skip for super_admin)
    if (dbUser.school_id && dbUser.role !== 'super_admin') {
      const school = await prisma.school.findUnique({
        where: { id: dbUser.school_id },
        select: { status: true },
      });
      if (!school || school.status !== 'active') {
        return res.status(403).json({ error: 'Your school account has been suspended. Please contact your school administrator.', code: 'SCHOOL_SUSPENDED' });
      }
    }

    req.user = {
      id: dbUser.id,
      role: dbUser.role,
      school_id: dbUser.school_id,
      is_dev_sa: dbUser.is_dev_sa,
      is_first_login: dbUser.is_first_login,
    };

    next();
  } catch (err) {
    console.error('authenticateToken DB error:', err.message);
    return res.status(500).json({ error: 'Authentication error. Please try again.' });
  }
};

// Role-based access guard
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient privileges' });
    }
    next();
  };
};

// School-scope guard — ensures users only access their own school's data
// Dev SA (is_dev_sa=true) sees all schools.
// Regular SA sees only schools assigned to them (assigned_sa_id = SA's user id).
const requireSchoolScope = async (req, res, next) => {
  if (req.user.role === 'super_admin') {
    if (req.user.is_dev_sa) {
      // Master Admin — unrestricted
      req.schoolId = req.query.school_id || null;
      req.saSchoolIds = null; // null = no restriction
      return next();
    }
    // Regular SA — restrict to assigned schools
    try {
      if (req.query.school_id) {
        const school = await prisma.school.findUnique({
          where: { id: req.query.school_id },
          select: { assigned_sa_id: true },
        });
        if (!school || school.assigned_sa_id !== req.user.id) {
          return res.status(403).json({ error: 'Access denied to this school' });
        }
        req.schoolId = req.query.school_id;
        req.saSchoolIds = [req.query.school_id];
      } else {
        req.schoolId = null;
        req.saSchoolIds = await getSASchoolIds(req.user.id);
      }
    } catch (err) {
      return res.status(500).json({ error: 'Scope verification failed' });
    }
    return next();
  }
  if (!req.user.school_id) {
    return res.status(403).json({ error: 'No school context for this user' });
  }
  req.schoolId = req.user.school_id;
  req.saSchoolIds = null;
  next();
};

// First-login guard — blocks access until password is changed
const requirePasswordChanged = (req, res, next) => {
  if (req.user.is_first_login) {
    return res.status(403).json({
      error: 'Password change required',
      code: 'FIRST_LOGIN',
      redirect: '/change-password',
    });
  }
  next();
};

/**
 * Returns a Prisma WHERE filter for school_id based on the current user's scope.
 * Use this in any controller that lists items across schools.
 *   const filter = getSchoolFilter(req);
 *   prisma.bus.findMany({ where: { ...filter, ... } })
 */
const getSchoolFilter = (req) => {
  if (req.schoolId) return { school_id: req.schoolId };
  if (req.saSchoolIds && req.saSchoolIds.length > 0) return { school_id: { in: req.saSchoolIds } };
  if (req.saSchoolIds && req.saSchoolIds.length === 0) return { school_id: '__no_schools__' }; // SA with no schools
  return {}; // dev SA — no restriction
};

module.exports = {
  authenticateToken,
  requireRole,
  requireSchoolScope,
  requirePasswordChanged,
  getSchoolFilter,
};
