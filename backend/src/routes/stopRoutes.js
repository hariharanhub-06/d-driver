const { Router } = require('express');
const multer = require('multer');
const {
  getAllStops, createStop, updateStop, bulkCreateStops, bulkImportStops, deleteStop, getNearbyStops,
} = require('../controllers/stopController');
const { authenticateToken, requireRole, requireSchoolScope, requirePasswordChanged } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticateToken, requirePasswordChanged);

router.get('/nearby', requireRole('parent'), getNearbyStops);
router.get('/', requireRole('admin', 'super_admin', 'driver'), requireSchoolScope, getAllStops);
router.post('/bulk', requireRole('admin', 'super_admin'), requirePermission('route_management'), bulkCreateStops);
router.post('/bulk-import', requireRole('admin'), requirePermission('route_management'), upload.single('file'), bulkImportStops);
router.post('/', requireRole('admin'), requirePermission('route_management'), createStop);
router.put('/:id', requireRole('admin', 'super_admin'), requirePermission('route_management'), updateStop);
router.delete('/:id', requireRole('admin'), requirePermission('route_management'), deleteStop);

module.exports = router;
