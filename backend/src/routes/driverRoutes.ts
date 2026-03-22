import { Router } from 'express';
import { getDrivers, assignBusToDriver } from '../controllers/driverController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken);
router.use(requireRole(['super_admin', 'admin']));

router.get('/', getDrivers);
router.put('/:id/assign-bus', assignBusToDriver);

export default router;
