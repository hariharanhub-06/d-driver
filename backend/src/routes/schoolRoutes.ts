const { Router } = require('express');
const {
    getAllSchools,
    registerSchool,
    getSchoolBySlug,
    updateSchool,
    deleteSchool
} = require('../controllers/schoolController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

const router = Router();

router.get('/', getAllSchools);
router.get('/:slug', getSchoolBySlug);
router.post('/', authenticateToken, requireRole(['super_admin']), registerSchool);
router.put('/:id', authenticateToken, requireRole(['super_admin']), updateSchool);
router.delete('/:id', authenticateToken, requireRole(['super_admin']), deleteSchool);

module.exports = router;
