import { Router } from 'express';
import { getRoutes, createRoute } from '../controllers/routeController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken);
router.use(requireRole(['super_admin', 'admin']));

router.get('/', getRoutes);
router.post('/', createRoute);

export default router;
