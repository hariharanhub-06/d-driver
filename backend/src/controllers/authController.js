const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../prisma');
const { sendPasswordReset } = require('../utils/resend');
const { logAction } = require('../utils/auditLog');

const JWT_SECRET         = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_TTL         = '15m';
const REFRESH_TTL        = '7d';
const REFRESH_TTL_MS     = 7 * 24 * 60 * 60 * 1000;

// ─── TOKEN HELPERS ───────────────────────────────────────────────────────────

const signAccess = (user) =>
  jwt.sign({ id: user.id, role: user.role, school_id: user.school_id }, JWT_SECRET, { expiresIn: ACCESS_TTL });

const signRefresh = (user) =>
  jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TTL });

// ─── LOGIN ───────────────────────────────────────────────────────────────────

const login = async (req, res) => {
  const { email: rawEmail, password } = req.body;
  const email = rawEmail?.toLowerCase().trim();

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  if (!user.is_active) {
    return res.status(403).json({ error: 'Account deactivated. Contact your administrator.' });
  }

  // Check school status for non-SA users
  if (user.school_id && user.role !== 'super_admin') {
    const school = await prisma.school.findUnique({ where: { id: user.school_id }, select: { status: true } });
    if (!school || school.status !== 'active') {
      return res.status(403).json({ error: 'Account inactive. Contact your service provider.' });
    }
  }

  const accessToken  = signAccess(user);
  const refreshToken = signRefresh(user);

  await logAction({ req: { ...req, user: { id: user.id, role: user.role, school_id: user.school_id } }, action: 'login', targetType: 'auth', targetId: user.id });

  res.json({
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: 15 * 60,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      school_id: user.school_id,
      is_first_login: user.is_first_login,
    },
  });
};

// ─── REFRESH TOKEN ───────────────────────────────────────────────────────────

const refresh = async (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token) return res.status(401).json({ error: 'Refresh token required' });

  let payload;
  try {
    payload = jwt.verify(refresh_token, JWT_REFRESH_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }

  const user = await prisma.user.findUnique({ where: { id: payload.id } });
  if (!user || !user.is_active) return res.status(401).json({ error: 'User not found or deactivated' });

  if (user.school_id && user.role !== 'super_admin') {
    const school = await prisma.school.findUnique({ where: { id: user.school_id }, select: { status: true } });
    if (!school || school.status !== 'active') {
      return res.status(403).json({ error: 'Account inactive. Contact your service provider.' });
    }
  }

  res.json({ access_token: signAccess(user), expires_in: 15 * 60 });
};

// ─── LOGOUT ──────────────────────────────────────────────────────────────────

const logout = async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];
  if (token) {
    // Add token to blocklist until its natural expiry
    const decoded = jwt.decode(token);
    const expiresAt = decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 15 * 60 * 1000);
    await prisma.blockedToken.upsert({
      where: { token },
      update: {},
      create: { token, expires_at: expiresAt },
    });
  }
  res.json({ message: 'Logged out' });
};

// ─── CHANGE PASSWORD (first login + regular change) ──────────────────────────

const changePassword = async (req, res) => {
  const { current_password, new_password } = req.body;
  const userId = req.user.id;

  const user = await prisma.user.findUnique({ where: { id: userId } });

  // On first login, current_password check is skipped if it matches the temp password
  const currentMatches = await bcrypt.compare(current_password, user.password);
  if (!currentMatches) return res.status(400).json({ error: 'Current password is incorrect' });

  const hashed = await bcrypt.hash(new_password, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashed, is_first_login: false },
  });

  res.json({ message: 'Password changed successfully' });
};

// ─── FORGOT PASSWORD ─────────────────────────────────────────────────────────

const forgotPassword = async (req, res) => {
  const { value, method } = req.body; // value = email or phone

  const user = method === 'email'
    ? await prisma.user.findUnique({ where: { email: value } })
    : await prisma.user.findUnique({ where: { phone: value } });

  // Always return success to prevent user enumeration
  if (!user) return res.json({ message: 'If an account exists, a reset link has been sent.' });

  // Invalidate any existing active tokens for this user
  await prisma.passwordResetToken.updateMany({
    where: { user_id: user.id, used: false },
    data: { used: true },
  });

  // Generate and hash a new secure token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.passwordResetToken.create({
    data: { user_id: user.id, token: hashedToken, expires_at: expiresAt },
  });

  // Determine school for branding
  let school = null;
  if (user.school_id) {
    school = await prisma.school.findUnique({ where: { id: user.school_id } });
  }

  const baseDomain = process.env.BASE_DOMAIN || 'localhost:3000';
  const slug = school?.slug;
  const baseUrl = slug ? `http://${slug}.${baseDomain}` : `http://${baseDomain}`;
  const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;

  // Send to user's registered email (even if they used phone to request)
  await sendPasswordReset({ to: user.email, resetUrl, school });

  res.json({ message: 'If an account exists, a reset link has been sent.' });
};

// ─── RESET PASSWORD ───────────────────────────────────────────────────────────

const resetPassword = async (req, res) => {
  const { token, new_password } = req.body;

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const record = await prisma.passwordResetToken.findUnique({ where: { token: hashedToken } });

  if (!record || record.used || record.expires_at < new Date()) {
    return res.status(400).json({ error: 'Reset link is invalid or has expired' });
  }

  const hashed = await bcrypt.hash(new_password, 12);
  await prisma.user.update({
    where: { id: record.user_id },
    data: { password: hashed, is_first_login: false },
  });

  await prisma.passwordResetToken.update({
    where: { id: record.id },
    data: { used: true },
  });

  res.json({ message: 'Password reset successfully. You can now log in.' });
};

// ─── SWITCH ACCOUNT (parent multi-child) ─────────────────────────────────────

const switchAccount = async (req, res) => {
  const { target_user_id } = req.body;
  const currentUser = await prisma.user.findUnique({ where: { id: req.user.id } });
  const targetUser  = await prisma.user.findUnique({ where: { id: target_user_id } });

  if (!targetUser || targetUser.role !== 'parent') {
    return res.status(404).json({ error: 'Target account not found' });
  }

  // Verify same phone number (account linking)
  if (!currentUser.phone || currentUser.phone !== targetUser.phone) {
    return res.status(403).json({ error: 'Accounts are not linked' });
  }

  const accessToken  = signAccess(targetUser);
  const refreshToken = signRefresh(targetUser);

  res.json({
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: 15 * 60,
    user: {
      id: targetUser.id,
      name: targetUser.name,
      email: targetUser.email,
      role: targetUser.role,
      school_id: targetUser.school_id,
      is_first_login: targetUser.is_first_login,
    },
  });
};

// ─── GET LINKED ACCOUNTS (parent) ────────────────────────────────────────────

const getLinkedAccounts = async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user.phone) return res.json({ accounts: [] });

  const linked = await prisma.user.findMany({
    where: { phone: user.phone, role: 'parent', is_active: true },
    select: {
      id: true, name: true, email: true,
      children: { select: { id: true, name: true, route: { select: { name: true } } } },
    },
  });

  res.json({ accounts: linked });
};

module.exports = { login, refresh, logout, changePassword, forgotPassword, resetPassword, switchAccount, getLinkedAccounts };
