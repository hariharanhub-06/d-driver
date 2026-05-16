const { Router } = require('express');
const {
  getAllDrivers, getDriverById, createDriver, updateDriver, deleteDriver,
  getMe, bulkCreateDrivers,
} = require('../controllers/driverController');
const { authenticateToken, requireRole, requireSchoolScope, requirePasswordChanged } = require('../middleware/authMiddleware');

const router = Router();
router.use(authenticateToken, requirePasswordChanged);

router.get('/me', requireRole('driver'), getMe);
router.get('/', requireRole('admin', 'super_admin'), requireSchoolScope, getAllDrivers);
router.get('/:id', requireRole('admin', 'super_admin'), getDriverById);
router.post('/bulk', requireRole('admin', 'super_admin'), bulkCreateDrivers);
router.post('/', requireRole('admin', 'super_admin'), createDriver);
router.put('/:id', requireRole('admin', 'super_admin'), updateDriver);
router.delete('/:id', requireRole('admin', 'super_admin'), deleteDriver);

module.exports = router;
