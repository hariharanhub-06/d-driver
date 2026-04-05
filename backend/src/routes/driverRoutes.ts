const { Router } = require('express');
const {
    getAllDrivers,
    createDriver,
    getDriverById,
    updateDriver,
    deleteDriver
} = require('../controllers/driverController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

const router = Router();

router.get('/', authenticateToken, getAllDrivers);
router.get('/:id', authenticateToken, getDriverById);
router.post('/', authenticateToken, requireRole(['admin', 'super_admin']), createDriver);
router.put('/:id', authenticateToken, requireRole(['admin', 'super_admin']), updateDriver);
router.delete('/:id', authenticateToken, requireRole(['admin', 'super_admin']), deleteDriver);

module.exports = router;
