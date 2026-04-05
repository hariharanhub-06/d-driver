const { Router } = require('express');
const { getDashboardStats } = require('../controllers/dashboardController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

const router = Router();

router.get('/stats', authenticateToken, requireRole(['super_admin']), getDashboardStats);

module.exports = router;
