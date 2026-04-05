const { Router } = require('express');
const {
    getAllBuses,
    createBus,
    getBusById,
    updateBus,
    deleteBus
} = require('../controllers/busController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

const router = Router();

router.get('/', authenticateToken, getAllBuses);
router.get('/:id', authenticateToken, getBusById);
router.post('/', authenticateToken, requireRole(['admin', 'super_admin']), createBus);
router.put('/:id', authenticateToken, requireRole(['admin', 'super_admin']), updateBus);
router.delete('/:id', authenticateToken, requireRole(['admin', 'super_admin']), deleteBus);

module.exports = router;
