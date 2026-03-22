import { Router } from 'express';
import { getNotifications, createNotification } from '../controllers/notificationController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken);

router.get('/', getNotifications);
router.post('/', requireRole(['super_admin', 'admin']), createNotification);

export default router;
