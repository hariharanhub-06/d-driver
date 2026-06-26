const { Router } = require('express');
const { getStats, getFinancials, getPendingCounts } = require('../controllers/dashboardController');
const { authenticateToken, requireRole, requireSchoolScope, requirePasswordChanged } = require('../middleware/authMiddleware');

const router = Router();

router.use(authenticateToken, requirePasswordChanged);

router.get('/stats',       requireRole('admin', 'super_admin'), requireSchoolScope, getStats);
router.get('/financials',  requireRole('admin', 'super_admin'), requireSchoolScope, getFinancials);
router.get('/pending-counts', requireRole('admin', 'super_admin'), requireSchoolScope, getPendingCounts);

module.exports = router;
