const { Router } = require('express');
const {
    getAllRoutes,
    createRoute,
    getRouteById,
    updateRoute,
    deleteRoute,
    getRouteWithStops,
    bulkCreateRoutes,
} = require('../controllers/routeController');
const { authenticateToken, requireRole, requireSchoolScope, requirePasswordChanged } = require('../middleware/authMiddleware');

const router = Router();
router.use(authenticateToken, requirePasswordChanged);

router.get('/', requireRole('admin', 'super_admin', 'driver'), requireSchoolScope, getAllRoutes);
router.get('/:id/stops', requireRole('admin', 'super_admin', 'driver'), getRouteWithStops);
router.get('/:id', requireRole('admin', 'super_admin', 'driver'), getRouteById);
router.post('/bulk', requireRole('admin', 'super_admin'), bulkCreateRoutes);
router.post('/', requireRole('admin', 'super_admin'), createRoute);
router.put('/:id', requireRole('admin', 'super_admin'), updateRoute);
router.delete('/:id', requireRole('admin', 'super_admin'), deleteRoute);

module.exports = router;
