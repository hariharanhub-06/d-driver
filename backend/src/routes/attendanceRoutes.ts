import { Router } from 'express';
import { getAttendance, markAttendance } from '../controllers/attendanceController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken);
// Drivers can mark attendance, Admins and parents can view
router.get('/', getAttendance);
router.post('/', requireRole(['super_admin', 'admin', 'driver']), markAttendance);

export default router;
