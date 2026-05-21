const { Router } = require('express');
const {
  getAllStudents, getStudentById, createStudent, updateStudent,
  deleteStudent, uploadStudentPhoto, bulkCreateStudents, getMyStudents,
} = require('../controllers/studentController');
const { authenticateToken, requireRole, requireSchoolScope, requirePasswordChanged } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');
const { validate, studentSchema } = require('../validators');
const multer = require('multer');

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(authenticateToken, requirePasswordChanged);

router.get('/', requireRole('admin', 'super_admin', 'driver'), requireSchoolScope, getAllStudents);
router.get('/my', requireRole('parent'), getMyStudents);
router.get('/my-children', requireRole('parent'), getMyStudents);
router.get('/:id', requireRole('admin', 'super_admin', 'driver'), requireSchoolScope, getStudentById);
router.post('/upload-photo', requireRole('admin', 'super_admin'), upload.single('photo'), uploadStudentPhoto);
router.post('/bulk', requireRole('admin', 'super_admin'), bulkCreateStudents);
router.post('/', requireRole('admin', 'super_admin'), validate(studentSchema), createStudent);
router.put('/:id', requireRole('admin', 'super_admin'), updateStudent);
router.delete('/:id', requireRole('admin', 'super_admin'), deleteStudent);

module.exports = router;
