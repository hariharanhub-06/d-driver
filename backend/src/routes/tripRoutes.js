const { Router } = require('express');
const { authenticateToken, requireRole, requireSchoolScope, requirePasswordChanged } = require('../middleware/authMiddleware');
const { startTrip, updateStopIndex, completeTrip, getActiveTrips, getTripHistory, getTripProgress } = require('../controllers/tripController');

const router = Router();
router.use(authenticateToken, requirePasswordChanged);

router.post('/',                requireRole('driver'),                                        startTrip);
router.post('/start',           requireRole('driver'),                                        startTrip);
router.patch('/:id/stop-index', requireRole('driver'),                                        updateStopIndex);
router.post('/:id/complete',    requireRole('driver'),                                        completeTrip);
router.get('/active',           requireRole('admin', 'driver', 'super_admin', 'bus_staff'),   requireSchoolScope, getActiveTrips);
router.get('/progress/:routeId', requireRole('parent', 'admin', 'super_admin', 'driver', 'bus_staff'),        getTripProgress);
router.get('/history',          requireRole('admin', 'super_admin'),                          requireSchoolScope, getTripHistory);

module.exports = router;
