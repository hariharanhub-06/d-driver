import { Router } from 'express';
import { getBuses, createBus, updateBus, deleteBus } from '../controllers/busController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken);
router.use(requireRole(['super_admin', 'admin']));

router.get('/', getBuses);
router.post('/', createBus);
router.put('/:id', updateBus);
router.delete('/:id', deleteBus);

export default router;
