const { Router } = require('express');
const { getAllBuses, getBusById, createBus, updateBus, deleteBus, bulkCreateBuses } = require('../controllers/busController');
const { authenticateToken, requireRole, requireSchoolScope, requirePasswordChanged } = require('../middleware/authMiddleware');
const { validate, busSchema } = require('../validators');

const router = Router();
router.use(authenticateToken, requirePasswordChanged);

router.get('/', requireRole('admin', 'super_admin', 'driver'), requireSchoolScope, getAllBuses);
router.get('/:id', requireRole('admin', 'super_admin', 'driver'), requireSchoolScope, getBusById);
router.post('/bulk', requireRole('admin', 'super_admin'), bulkCreateBuses);
router.post('/', requireRole('admin', 'super_admin'), validate(busSchema), createBus);
router.put('/:id', requireRole('admin', 'super_admin'), updateBus);
router.delete('/:id', requireRole('admin', 'super_admin'), deleteBus);

module.exports = router;
