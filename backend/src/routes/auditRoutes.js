const { Router } = require('express');
const { getAuditLogs, getLoginActivity } = require('../controllers/auditController');
const { authenticateToken, requireRole, requirePasswordChanged } = require('../middleware/authMiddleware');

const router = Router();
router.use(authenticateToken, requirePasswordChanged);

router.get('/logs', requireRole('super_admin', 'admin'), getAuditLogs);
router.get('/login-activity', requireRole('super_admin', 'admin'), getLoginActivity);

module.exports = router;
