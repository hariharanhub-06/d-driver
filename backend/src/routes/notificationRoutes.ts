const { Router } = require('express');
const {
    getNotifications,
    markRead
} = require('../controllers/notificationController');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = Router();

router.get('/', authenticateToken, getNotifications);
router.put('/:id/read', authenticateToken, markRead);

module.exports = router;
