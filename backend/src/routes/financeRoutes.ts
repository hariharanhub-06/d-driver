import { Router } from 'express';
import { getFees, createFee, recordPayment } from '../controllers/financeController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken);

router.get('/', getFees);
router.post('/', requireRole(['super_admin', 'admin']), createFee);
router.post('/pay', recordPayment);

export default router;
