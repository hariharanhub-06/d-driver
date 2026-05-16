const { Router } = require('express');
const { getAttendanceReport, getFeeReport, getKmReport } = require('../controllers/reportController');
const {
  authenticateToken,
  requireRole,
  requirePasswordChanged,
  requireSchoolScope,
} = require('../middleware/authMiddleware');

const router = Router();

router.use(authenticateToken, requirePasswordChanged);

router.get('/attendance', requireRole('admin', 'super_admin'), requireSchoolScope, getAttendanceReport);
router.get('/fees',       requireRole('admin', 'super_admin'), requireSchoolScope, getFeeReport);
router.get('/km-log',     requireRole('admin', 'super_admin'), requireSchoolScope, getKmReport);

module.exports = router;
