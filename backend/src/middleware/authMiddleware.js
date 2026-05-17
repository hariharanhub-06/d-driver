const jwt = require('jsonwebtoken');
const prisma = require('../prisma');

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
        return res.status(403).json({ error: 'Account inactive. Contact your service provider.' });
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
// SA bypasses this if they pass ?school_id=X (for drill-in access)
const requireSchoolScope = (req, res, next) => {
  if (req.user.role === 'super_admin') {
    // SA can target any school via query param, or all schools if omitted
    req.schoolId = req.query.school_id || null;
    return next();
  }
  if (!req.user.school_id) {
    return res.status(403).json({ error: 'No school context for this user' });
  }
  req.schoolId = req.user.school_id;
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

module.exports = {
  authenticateToken,
  requireRole,
  requireSchoolScope,
  requirePasswordChanged,
};
