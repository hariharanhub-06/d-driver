const { Router } = require('express');
const { getAllBuses, getBusById, createBus, updateBus, deleteBus, bulkCreateBuses } = require('../controllers/busController');
const { authenticateToken, requireRole, requireSchoolScope, requirePasswordChanged } = require('../middleware/authMiddleware');
const { validate, busSchema } = require('../validators');

const router = Router();
router.use(authenticateToken, requirePasswordChanged);

router.get('/', requireRole('admin', 'super_admin', 'driver'), requireSchoolScope, getAllBuses);
router.get('/:id', requireRole('admin', 'super_admin', 'driver'), getBusById);
router.post('/bulk', requireRole('admin'), bulkCreateBuses);
router.post('/', requireRole('admin'), validate(busSchema), createBus);
router.put('/:id', requireRole('admin'), updateBus);
router.delete('/:id', requireRole('admin'), deleteBus);

module.exports = router;
