const { Router } = require('express');
const {
  getPublicSchool, getAllSchools, getSchoolById,
  registerSchool, updateSchool, deleteSchool,
  toggleSchoolStatus, updatePermissions,
  updateSchoolRazorpay, getMySchool, dismissOnboarding,
  assignSAToSchool,
} = require('../controllers/schoolController');
const { authenticateToken, requireRole, requirePasswordChanged } = require('../middleware/authMiddleware');
const { validate } = require('../validators');
const { createSchoolSchema, updateSchoolSchema, updatePermissionsSchema } = require('../validators/school');

const router = Router();

// Public — no auth
router.get('/public/:slug', getPublicSchool);

// Admin — own school
router.get('/my', authenticateToken, requirePasswordChanged, requireRole('admin'), getMySchool);
router.put('/my/razorpay', authenticateToken, requirePasswordChanged, requireRole('admin'), updateSchoolRazorpay);
router.post('/my/dismiss-onboarding', authenticateToken, requirePasswordChanged, requireRole('admin'), dismissOnboarding);

// SA only
router.use(authenticateToken, requirePasswordChanged, requireRole('super_admin'));
router.get('/', getAllSchools);
router.get('/:id', getSchoolById);
router.post('/', validate(createSchoolSchema), registerSchool);
router.put('/:id', validate(updateSchoolSchema), updateSchool);
router.patch('/:id/status', toggleSchoolStatus);
router.put('/:id/permissions', validate(updatePermissionsSchema), updatePermissions);
router.delete('/:id', deleteSchool);
router.put('/:id/assign-sa', assignSAToSchool);

module.exports = router;
