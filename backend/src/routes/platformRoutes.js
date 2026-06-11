const { Router } = require('express');
const {
  getLandingData, getConfig, updateConfig,
  createPartner, updatePartner, deletePartner, listPartners,
  createFounder, updateFounder, deleteFounder, listFounders,
} = require('../controllers/platformController');
const { authenticateToken, requireRole, requirePasswordChanged } = require('../middleware/authMiddleware');

const router = Router();

const devSaOnly = [
  authenticateToken,
  requirePasswordChanged,
  requireRole('super_admin'),
  (req, res, next) => {
    if (!req.user.is_dev_sa) return res.status(403).json({ error: 'Only the master admin can perform this action' });
    next();
  },
];

// ── Public ────────────────────────────────────────────────────────────────────
router.get('/landing', getLandingData);
router.get('/config', getConfig);

// ── Dev SA — platform config ──────────────────────────────────────────────────
router.put('/config', ...devSaOnly, updateConfig);

// ── Dev SA — partners ─────────────────────────────────────────────────────────
router.get('/partners', ...devSaOnly, listPartners);
router.post('/partners', ...devSaOnly, createPartner);
router.put('/partners/:id', ...devSaOnly, updatePartner);
router.delete('/partners/:id', ...devSaOnly, deletePartner);

// ── Dev SA — founders ─────────────────────────────────────────────────────────
router.get('/founders', ...devSaOnly, listFounders);
router.post('/founders', ...devSaOnly, createFounder);
router.put('/founders/:id', ...devSaOnly, updateFounder);
router.delete('/founders/:id', ...devSaOnly, deleteFounder);

module.exports = router;
