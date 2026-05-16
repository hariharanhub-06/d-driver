const { Router } = require('express');
const { login, refresh, logout, changePassword, forgotPassword, resetPassword, switchAccount, getLinkedAccounts } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { validate } = require('../validators');
const { loginSchema, changePasswordSchema, forgotPasswordSchema, resetPasswordSchema } = require('../validators/auth');

const router = Router();

router.post('/login',           validate(loginSchema),          login);
router.post('/refresh',                                         refresh);
router.post('/logout',          authenticateToken,              logout);
router.post('/change-password', authenticateToken, validate(changePasswordSchema), changePassword);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password',  validate(resetPasswordSchema),  resetPassword);
router.post('/switch-account',  authenticateToken,              switchAccount);
router.get('/linked-accounts',  authenticateToken,              getLinkedAccounts);

module.exports = router;
