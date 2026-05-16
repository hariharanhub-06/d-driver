const { Router } = require('express');
const {
    getMe,
    listSchoolUsers,
    createUser,
    updateUser,
    deleteUser,
    listSAUsers,
    createSAUser,
    toggleUserActive,
} = require('../controllers/userController');
const {
    authenticateToken,
    requireRole,
    requireSchoolScope,
    requirePasswordChanged,
} = require('../middleware/authMiddleware');

const router = Router();

// /me is outside requirePasswordChanged so a first-login user can still fetch their own profile
router.get('/me', authenticateToken, getMe);

router.use(authenticateToken, requirePasswordChanged);

// SA user management — must be before /:id routes to avoid param capture
router.get('/sa',           requireRole('super_admin'), listSAUsers);
router.post('/sa',          requireRole('super_admin'), createSAUser);

// School-scoped user list
router.get('/',             requireRole('admin', 'super_admin'), requireSchoolScope, listSchoolUsers);

// Legacy admin endpoints
router.post('/',            requireRole('admin', 'super_admin'), createUser);
router.put('/:id',          requireRole('admin', 'super_admin'), updateUser);

// Toggle active / delete
router.patch('/:id/active', requireRole('admin', 'super_admin'), toggleUserActive);
router.delete('/:id',       requireRole('super_admin'), deleteUser);

module.exports = router;
