const { Router } = require('express');
const { getAllParents, getParentById } = require('../controllers/parentController');
const { authenticateToken, requireRole, requireSchoolScope, requirePasswordChanged } = require('../middleware/authMiddleware');

const router = Router();

router.use(authenticateToken, requirePasswordChanged);
router.get('/', requireRole('admin', 'super_admin'), requireSchoolScope, getAllParents);
router.get('/:id', requireRole('admin', 'super_admin'), getParentById);

module.exports = router;
