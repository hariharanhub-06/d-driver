const { Router } = require('express');
const {
    getAllUsers,
    updateUser,
    getCurrentUser
} = require('../controllers/userController');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = Router();

router.get('/me', authenticateToken, getCurrentUser);
router.get('/', authenticateToken, getAllUsers);
router.put('/:id', authenticateToken, updateUser);

module.exports = router;
