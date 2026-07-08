const { Router } = require('express');
const {
    getNotifications, markRead, markAllRead, getUnreadCount, savePushToken,
    getVapidPublicKey, saveWebPushSubscription, deleteWebPushSubscription,
} = require('../controllers/notificationController');
const { authenticateToken, requirePasswordChanged } = require('../middleware/authMiddleware');

const router = Router();
router.use(authenticateToken, requirePasswordChanged);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.put('/:id/read', markRead);
router.post('/mark-all-read', markAllRead);
router.post('/push-token', savePushToken);

// Web Push (browser / installed PWA)
router.get('/vapid-public-key', getVapidPublicKey);
router.post('/web-push/subscribe', saveWebPushSubscription);
router.post('/web-push/unsubscribe', deleteWebPushSubscription);

module.exports = router;
