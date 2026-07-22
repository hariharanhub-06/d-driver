const { Router } = require('express');
const {
  listPlans,
  createPlan,
  updatePlan,
  deletePlan,
  searchStudents,
  assignIndividualPlan,
  generateStudentInvoice,
  generateAllStudentInvoices,
  listStudentInvoices,
  payStudentInvoiceCash,
  createStudentInvoiceOrder,
  generateInvoice,
  generateAllInvoices,
  listInvoices,
  getInvoice,
  payInvoiceCash,
  createInvoiceOrder,
  verifyInvoicePayment,
  verifyStudentInvoicePayment,
  handleInvoiceWebhook,
  updateBillingConfig,
  getBillingConfig,
  getRevenueDashboard,
  assignPlan,
  getMySubscription,
  getMyInvoices,
  getMyStudentInvoices,
  updatePlatformRazorpay,
  getPlatformRazorpayStatus,
  getPlatformUsage,
  listManualExpenses,
  createManualExpense,
  deleteManualExpense,
} = require('../controllers/billingController');
const {
  authenticateToken,
  requireRole,
  requirePasswordChanged,
} = require('../middleware/authMiddleware');

const router = Router();

// ── PUBLIC: Razorpay webhook ─────────────────────────────────────────────────
// MUST be registered before the router-wide authenticateToken below. Razorpay sends no JWT,
// so when this sat after the auth middleware every webhook delivery got a 401 and school
// invoices paid online were never marked paid. Authenticity comes from the HMAC signature
// check inside the handler, not from a token.
router.post('/webhook', handleInvoiceWebhook);

router.use(authenticateToken, requirePasswordChanged);

// SA — pricing plans
router.get('/plans',        requireRole('super_admin'), listPlans);
router.post('/plans',       requireRole('super_admin'), createPlan);
router.put('/plans/:id',    requireRole('super_admin'), updatePlan);
router.delete('/plans/:id', requireRole('super_admin'), deletePlan);

// SA — invoice generation
router.post('/generate',     requireRole('super_admin'), generateInvoice);
router.post('/generate-all', requireRole('super_admin'), generateAllInvoices);

// SA — invoice management
router.get('/invoices',               requireRole('super_admin'), listInvoices);
router.get('/invoices/:id',           requireRole('super_admin'), getInvoice);
router.post('/invoices/:id/pay-cash', requireRole('super_admin'), payInvoiceCash);
// School admins pay their OWN school's invoice; the controller scopes by req.user.school_id.
// (Was super_admin-only, so the "Pay Online" button on the admin billing page always 403'd.)
router.post('/invoices/:id/pay-online', requireRole('admin', 'super_admin'), createInvoiceOrder);
router.post('/invoices/:id/verify',     requireRole('admin', 'super_admin'), verifyInvoicePayment);

// SA — billing config
router.get('/config', requireRole('super_admin'), getBillingConfig);
router.put('/config', requireRole('super_admin'), updateBillingConfig);

// SA — revenue dashboard
router.get('/revenue', requireRole('super_admin'), getRevenueDashboard);

// SA — assign plan to school
router.put('/schools/:id/plan', requireRole('super_admin'), assignPlan);

// SA — individual (per-student) billing
router.get('/students/search',              requireRole('super_admin'), searchStudents);
router.put('/students/:id/plan',            requireRole('super_admin'), assignIndividualPlan);
router.post('/students/generate-all',        requireRole('super_admin'), generateAllStudentInvoices);
router.post('/students/:id/generate',        requireRole('super_admin'), generateStudentInvoice);
router.get('/student-invoices',             requireRole('super_admin'), listStudentInvoices);
router.post('/student-invoices/:id/pay-cash',   requireRole('super_admin'), payStudentInvoiceCash);
router.post('/student-invoices/:id/pay-online', requireRole('super_admin'), createStudentInvoiceOrder);
router.post('/student-invoices/:id/verify',     requireRole('super_admin'), verifyStudentInvoicePayment);

// Admin + parent — current subscription plan & included features
router.get('/my-subscription', requireRole('admin', 'parent'), getMySubscription);

// School admin — own invoices
router.get('/my-invoices', requireRole('admin'), getMyInvoices);

// Parent — their children's individual (super-admin) invoices
router.get('/my-student-invoices', requireRole('parent'), getMyStudentInvoices);

// SA — platform Razorpay keys
router.get('/platform-razorpay', requireRole('super_admin'), getPlatformRazorpayStatus);
router.put('/platform-razorpay', requireRole('super_admin'), updatePlatformRazorpay);

// SA — platform usage metrics (expenses page)
router.get('/platform-usage', requireRole('super_admin'), getPlatformUsage);

// SA — manual expenses
router.get('/manual-expenses',      requireRole('super_admin'), listManualExpenses);
router.post('/manual-expenses',     requireRole('super_admin'), createManualExpense);
router.delete('/manual-expenses/:id', requireRole('super_admin'), deleteManualExpense);

module.exports = router;
