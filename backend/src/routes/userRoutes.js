
const { Router } = require('express');
const {
    getAllUsers,
    createUser,
    updateUser,
    getCurrentUser,
    deleteUser
} = require('../controllers/userController');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = Router();

router.get('/me', authenticateToken, getCurrentUser);
router.get('/', authenticateToken, getAllUsers);
router.post('/', authenticateToken, createUser);
router.put('/:id', authenticateToken, updateUser);
router.delete('/:id', authenticateToken, deleteUser);

module.exports = router;
