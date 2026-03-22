import { Router } from 'express';
import { getUsers, createUser } from '../controllers/userController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken);
router.use(requireRole(['super_admin', 'admin']));

router.get('/', getUsers);
router.post('/', createUser);

export default router;
