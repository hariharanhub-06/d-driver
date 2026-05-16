const { Router } = require('express');
const { getStats } = require('../controllers/dashboardController');
const { authenticateToken, requireRole, requirePasswordChanged } = require('../middleware/authMiddleware');

const router = Router();

router.get('/stats', authenticateToken, requirePasswordChanged, requireRole('admin', 'super_admin'), getStats);

module.exports = router;
