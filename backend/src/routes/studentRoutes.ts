const { Router } = require('express');
const {
    getAllStudents,
    createStudent,
    getStudentById,
    updateStudent,
    deleteStudent
} = require('../controllers/studentController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

const router = Router();

router.get('/', authenticateToken, getAllStudents);
router.get('/:id', authenticateToken, getStudentById);
router.post('/', authenticateToken, requireRole(['admin', 'super_admin']), createStudent);
router.put('/:id', authenticateToken, requireRole(['admin', 'super_admin']), updateStudent);
router.delete('/:id', authenticateToken, requireRole(['admin', 'super_admin']), deleteStudent);

module.exports = router;
