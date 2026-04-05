const { Router } = require('express');
const {
    getAllRoutes,
    createRoute,
    getRouteById,
    updateRoute,
    deleteRoute
} = require('../controllers/routeController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

const router = Router();

router.get('/', authenticateToken, getAllRoutes);
router.get('/:id', authenticateToken, getRouteById);
router.post('/', authenticateToken, requireRole(['admin', 'super_admin']), createRoute);
router.put('/:id', authenticateToken, requireRole(['admin', 'super_admin']), updateRoute);
router.delete('/:id', authenticateToken, requireRole(['admin', 'super_admin']), deleteRoute);

module.exports = router;
