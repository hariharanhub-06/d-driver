const { Router } = require('express');
const { getConfig, updateConfig } = require('../controllers/platformController');
const { authenticateToken, requireRole, requirePasswordChanged } = require('../middleware/authMiddleware');

const router = Router();

// Public — login page fetches logo
router.get('/config', getConfig);

// Dev SA only — upload logo URL
router.put('/config',
  authenticateToken,
  requirePasswordChanged,
  requireRole('super_admin'),
  (req, res, next) => {
    if (!req.user.is_dev_sa) return res.status(403).json({ error: 'Only the master admin can update platform config' });
    next();
  },
  updateConfig
);

module.exports = router;
