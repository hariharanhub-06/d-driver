const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole, requireSchoolScope, requirePasswordChanged } = require('../middleware/authMiddleware');
const { createMaintenance, getMaintenance, getMyMaintenance, updateMaintenance } = require('../controllers/maintenanceController');

const auth = [authenticateToken, requirePasswordChanged];

router.post('/', ...auth, requireRole('driver'), createMaintenance);
router.get('/mine', ...auth, requireRole('driver'), getMyMaintenance);
router.get('/', ...auth, requireSchoolScope, requireRole('admin', 'super_admin'), getMaintenance);
router.put('/:id', ...auth, requireRole('admin', 'super_admin'), updateMaintenance);

module.exports = router;
