import { Router } from 'express';
import { getSchools, createSchool, updateSchool, deleteSchool } from '../controllers/schoolController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const router = Router();

// Only Super Admin can manage schools
router.use(authenticateToken);
router.use(requireRole(['super_admin']));

router.get('/', getSchools);
router.post('/', createSchool);
router.put('/:id', updateSchool);
router.delete('/:id', deleteSchool);

export default router;
