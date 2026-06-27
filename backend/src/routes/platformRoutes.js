const { Router } = require('express');
const {
  getLandingData, getConfig, updateConfig,
  createPartner, updatePartner, deletePartner, listPartners,
  createFounder, updateFounder, deleteFounder, listFounders,
} = require('../controllers/platformController');
const { authenticateToken, requireRole, requirePasswordChanged } = require('../middleware/authMiddleware');

const router = Router();

// Landing-page editing is open to ALL super-admins (regular SA + dev/master SA).
const superAdminOnly = [
  authenticateToken,
  requirePasswordChanged,
  requireRole('super_admin'),
];

// ── Public ────────────────────────────────────────────────────────────────────
router.get('/landing', getLandingData);
router.get('/config', getConfig);

// ── Super-admin — platform config ─────────────────────────────────────────────
router.put('/config', ...superAdminOnly, updateConfig);

// ── Super-admin — partners ────────────────────────────────────────────────────
router.get('/partners', ...superAdminOnly, listPartners);
router.post('/partners', ...superAdminOnly, createPartner);
router.put('/partners/:id', ...superAdminOnly, updatePartner);
router.delete('/partners/:id', ...superAdminOnly, deletePartner);

// ── Super-admin — founders ────────────────────────────────────────────────────
router.get('/founders', ...superAdminOnly, listFounders);
router.post('/founders', ...superAdminOnly, createFounder);
router.put('/founders/:id', ...superAdminOnly, updateFounder);
router.delete('/founders/:id', ...superAdminOnly, deleteFounder);

module.exports = router;
