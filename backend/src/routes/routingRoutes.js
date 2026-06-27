const { Router } = require('express');
const { authenticateToken } = require('../middleware/authMiddleware');
const { getPath } = require('../controllers/routingController');

const router = Router();
router.use(authenticateToken);

// GET /api/v1/routing/path?from=lng,lat&to=lng,lat
router.get('/path', getPath);

module.exports = router;
