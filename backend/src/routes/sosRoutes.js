const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole, requirePasswordChanged } = require('../middleware/authMiddleware');
const { triggerSOS, cancelSOS, resolveSOS, getSOSAlerts, getMyActiveSOS } = require('../controllers/sosController');

const auth = [authenticateToken, requirePasswordChanged];

router.post('/trigger', ...auth, requireRole('driver'), triggerSOS);
router.put('/:id/cancel', ...auth, requireRole('driver'), cancelSOS);
router.put('/:id/resolve', ...auth, requireRole('admin', 'super_admin'), resolveSOS);
router.get('/', ...auth, requireRole('admin', 'super_admin'), getSOSAlerts);
router.get('/mine', ...auth, requireRole('driver'), getMyActiveSOS);

module.exports = router;
