const { Router } = require('express');
const {
    getFees,
    payFee,
    getRevenue
} = require('../controllers/financeController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

const router = Router();

router.get('/fees/:id', authenticateToken, getFees);
router.post('/pay', authenticateToken, payFee);
router.get('/revenue', authenticateToken, requireRole(['super_admin']), getRevenue);

module.exports = router;
