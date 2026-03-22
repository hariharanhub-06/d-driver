import { Router } from 'express';
import { getLatestLocation, updateLocation } from '../controllers/locationController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken);

// Anyone can view location (parent, admin, etc.) but only drivers push updates
router.get('/:bus_id', getLatestLocation);
router.post('/', requireRole(['driver']), updateLocation);

export default router;
