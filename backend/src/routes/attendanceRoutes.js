const { Router } = require('express');
const { markAttendance, getAttendance, getTodayAttendance } = require('../controllers/attendanceController');
const { authenticateToken, requireRole, requireSchoolScope, requirePasswordChanged } = require('../middleware/authMiddleware');

const router = Router();
router.use(authenticateToken, requirePasswordChanged);

router.post('/mark', requireRole('driver', 'admin', 'super_admin', 'bus_staff'), markAttendance);
router.get('/today', requireRole('admin', 'super_admin', 'driver'), requireSchoolScope, getTodayAttendance);
router.get('/', requireRole('admin', 'super_admin', 'driver', 'parent'), requireSchoolScope, getAttendance);

module.exports = router;
