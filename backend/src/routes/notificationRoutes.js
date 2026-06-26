const { Router } = require('express');
const { getNotifications, markRead, markAllRead, getUnreadCount, savePushToken } = require('../controllers/notificationController');
const { authenticateToken, requirePasswordChanged } = require('../middleware/authMiddleware');

const router = Router();
router.use(authenticateToken, requirePasswordChanged);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.put('/:id/read', markRead);
router.post('/mark-all-read', markAllRead);
router.post('/push-token', savePushToken);

module.exports = router;
