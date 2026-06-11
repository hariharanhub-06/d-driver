const { Router } = require('express');
const { authenticateToken, requireRole, requireSchoolScope, requirePasswordChanged } = require('../middleware/authMiddleware');
const { reportAbsence, getTodayAbsences, cancelAbsence, getMyAbsences } = require('../controllers/absenceController');
const { validate, absenceReportSchema } = require('../validators');

const router = Router();
router.use(authenticateToken, requirePasswordChanged);

router.post('/',      requireRole('parent'),                              validate(absenceReportSchema), reportAbsence);
router.get('/my',     requireRole('parent'),                              getMyAbsences);
router.get('/',       requireRole('admin', 'driver', 'super_admin', 'bus_staff'), requireSchoolScope, getTodayAbsences);
router.delete('/:id', requireRole('parent'),                             cancelAbsence);

module.exports = router;
