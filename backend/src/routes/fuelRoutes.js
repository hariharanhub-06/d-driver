const { Router } = require('express');
const { authenticateToken, requireRole, requireSchoolScope, requirePasswordChanged } = require('../middleware/authMiddleware');
const { recordFuelFill, requestFuel, listRequests, updateRequest, myRequests, listFills, busSummary } = require('../controllers/fuelController');
const { validate, fuelFillSchema, fuelRequestSchema } = require('../validators');

const router = Router();
router.use(authenticateToken, requirePasswordChanged);

router.post('/fill',             requireRole('driver'),                validate(fuelFillSchema),    recordFuelFill);
router.post('/request',          requireRole('driver'),                validate(fuelRequestSchema), requestFuel);
router.get('/requests',          requireRole('admin', 'super_admin'), requireSchoolScope, listRequests);
router.put('/requests/:id',      requireRole('admin', 'super_admin'), updateRequest);
router.get('/requests/mine',     requireRole('driver'),               myRequests);
router.get('/fills',             requireRole('admin', 'super_admin'), requireSchoolScope, listFills);
router.get('/bus-summary',       requireRole('admin', 'super_admin'), requireSchoolScope, busSummary);

module.exports = router;
