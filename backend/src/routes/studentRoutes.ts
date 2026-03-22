import { Router } from 'express';
import { getStudents, createStudent } from '../controllers/studentController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken);
// Parents should be able to get their own students, but for simplicity here we restrict to admins,
// and create a specific parent endpoint if needed later.
router.use(requireRole(['super_admin', 'admin']));

router.get('/', getStudents);
router.post('/', createStudent);

export default router;
