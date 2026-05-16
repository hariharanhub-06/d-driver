const { Router } = require('express');
const { updateLocation, getBusLocation, getAllActiveBusLocations } = require('../controllers/locationController');
const { authenticateToken, requireRole, requireSchoolScope, requirePasswordChanged } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');

const router = Router();
router.use(authenticateToken, requirePasswordChanged);

router.post('/update', requireRole('driver'), requirePermission('gps_tracking'), updateLocation);
router.get('/bus/:busId', requireRole('admin', 'super_admin', 'parent', 'driver'), getBusLocation);
router.get('/active', requireRole('admin', 'super_admin'), requireSchoolScope, getAllActiveBusLocations);

module.exports = router;
