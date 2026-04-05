const { Router } = require('express');
const {
    getAttendance,
    markAttendance
} = require('../controllers/attendanceController');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = Router();

router.get('/:schoolId', authenticateToken, getAttendance);
router.post('/mark', authenticateToken, markAttendance);

module.exports = router;
