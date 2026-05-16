const { Router } = require('express');
const { authenticateToken, requireRole, requireSchoolScope, requirePasswordChanged } = require('../middleware/authMiddleware');
const { requestSwitch, assignNewBus, listSwitchLogs } = require('../controllers/busSwitchController');
const { validate, busSwitchSchema } = require('../validators');

const router = Router();
router.use(authenticateToken, requirePasswordChanged);

router.post('/',           requireRole('driver'),                validate(busSwitchSchema), requestSwitch);
router.put('/:id/assign',  requireRole('admin', 'super_admin'), assignNewBus);
router.get('/',            requireRole('admin', 'super_admin'), requireSchoolScope, listSwitchLogs);

module.exports = router;
