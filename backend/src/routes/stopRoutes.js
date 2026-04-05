const { Router } = require('express');
const multer = require('multer');
const {
    getAllStops,
    createStop,
    bulkImportStops,
    deleteStop
} = require('../controllers/stopController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', authenticateToken, getAllStops);
router.post('/', authenticateToken, requireRole(['admin', 'super_admin']), createStop);
router.post('/bulk-import', authenticateToken, requireRole(['admin', 'super_admin']), upload.single('file'), bulkImportStops);
router.delete('/:id', authenticateToken, requireRole(['admin', 'super_admin']), deleteStop);

module.exports = router;
