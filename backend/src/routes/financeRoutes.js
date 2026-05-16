const { Router } = require('express');
const {
  getFees, createFee, createFeeStructure,
  createOrder, handleWebhook, recordManualPayment,
  getRevenue, getMyFees, generateFees,
} = require('../controllers/financeController');
const { authenticateToken, requireRole, requireSchoolScope, requirePasswordChanged } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');

const router = Router();

// Razorpay webhook — no auth (Razorpay calls this directly)
router.post('/payment/webhook', handleWebhook);

router.use(authenticateToken, requirePasswordChanged);

// Parent
router.get('/my-fees', requireRole('parent'), requirePermission('fee_management'), getMyFees);
router.post('/payment/create-order', requireRole('parent'), requirePermission('razorpay_payments'), createOrder);

// Admin
router.get('/fees', requireRole('admin', 'super_admin'), requireSchoolScope, requirePermission('fee_management'), getFees);
router.post('/fees', requireRole('admin'), requirePermission('fee_management'), createFee);
router.post('/fees/fee-structure', requireRole('admin'), requirePermission('fee_management'), createFeeStructure);
router.post('/fees/generate', requireRole('admin'), requirePermission('fee_management'), generateFees);
router.post('/payment/manual', requireRole('admin'), requirePermission('fee_management'), recordManualPayment);
router.get('/revenue', requireRole('super_admin'), getRevenue);

module.exports = router;
