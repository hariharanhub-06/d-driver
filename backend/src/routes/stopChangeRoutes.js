const { Router } = require('express');
const { authenticateToken, requireRole, requireSchoolScope, requirePasswordChanged } = require('../middleware/authMiddleware');
const { requestChange, listRequests, approveRequest, rejectRequest, getMyStopChangeRequests } = require('../controllers/stopChangeController');
const { validate, stopChangeSchema } = require('../validators');

const router = Router();
router.use(authenticateToken, requirePasswordChanged);

router.post('/',            requireRole('parent'),                validate(stopChangeSchema), requestChange);
router.get('/my',           requireRole('parent'),                getMyStopChangeRequests);
router.get('/',             requireRole('admin', 'super_admin'), requireSchoolScope, listRequests);
router.put('/:id/approve',  requireRole('admin', 'super_admin'), approveRequest);
router.put('/:id/reject',   requireRole('admin', 'super_admin'), rejectRequest);

module.exports = router;
