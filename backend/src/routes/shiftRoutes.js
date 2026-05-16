const { Router } = require('express');
const { authenticateToken, requireRole, requireSchoolScope, requirePasswordChanged } = require('../middleware/authMiddleware');
const { startShift, addKmEntry, endShift, listShifts, myShifts, getShiftEntries } = require('../controllers/driverShiftController');
const { validate, shiftStartSchema, kmEntrySchema } = require('../validators');

const router = Router();
router.use(authenticateToken, requirePasswordChanged);

router.post('/start',            requireRole('driver'), validate(shiftStartSchema), startShift);
router.post('/km-entry',         requireRole('driver'), validate(kmEntrySchema),    addKmEntry);
router.post('/end',                                                                 endShift);
router.get('/',                  requireRole('admin', 'super_admin'), requireSchoolScope, listShifts);
router.get('/mine',              requireRole('driver'),               myShifts);
router.get('/:id/entries',       requireRole('admin', 'super_admin'), requireSchoolScope, getShiftEntries);

module.exports = router;
