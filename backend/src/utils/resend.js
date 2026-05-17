const { Resend } = require('resend');
const prisma = require('../prisma');

// Lazy init — only fails when actually sending, not at server boot
let client = null;
const getClient = () => {
  if (!client) {
    if (!process.env.RESEND_API_KEY) return null;
    client = new Resend(process.env.RESEND_API_KEY);
  }
  return client;
};

/**
 * Send a branded email and log it.
 *
 * @param {{
 *   to: string,
 *   subject: string,
 *   html: string,
 *   template: string,
 *   school_id?: string,
 *   from?: string,
 * }} opts
 */
const sendEmail = async ({ to, subject, html, template, school_id, from }) => {
  let fromAddress = from || process.env.RESEND_FROM_DEFAULT || 'noreply@ddriver.app';

  // Use school's configured notification email if available
  if (school_id && !from) {
    try {
      const school = await prisma.school.findUnique({
        where: { id: school_id },
        select: { notification_email: true },
      });
      if (school?.notification_email) fromAddress = school.notification_email;
    } catch (_) {
      // Non-fatal — fall back to default sender
    }
  }

  let status = 'sent';
  const resendClient = getClient();
  if (!resendClient) {
    console.warn('Resend skipped: RESEND_API_KEY not set');
    status = 'failed';
  } else {
    try {
      await resendClient.emails.send({ from: fromAddress, to, subject, html });
    } catch (err) {
      status = 'failed';
      console.error('Resend error:', err.message);
    }
  }

  try {
    await prisma.emailLog.create({
      data: { to, subject, template, school_id: school_id || null, status },
    });
  } catch (err) {
    console.error('EmailLog write error:', err.message);
  }
};

// ─── EMAIL TEMPLATES ──────────────────────────────────────────────────────────

const brandedHtml = (schoolName, color, logoUrl, bodyHtml) => {
  const safeColor = color || '#2dbc75';
  const safeName = schoolName || 'D-Driver';
  const logo = logoUrl
    ? `<img src="${logoUrl}" alt="${safeName}" style="height:48px;margin-bottom:16px;">`
    : '';
  return `
    <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;">
      <div style="text-align:center;">${logo}<h2 style="color:${safeColor};margin:0 0 8px;">${safeName}</h2></div>
      <div style="margin-top:24px;">${bodyHtml}</div>
      <p style="margin-top:32px;font-size:12px;color:#94a3b8;">This is an automated message from ${safeName} Bus Portal.</p>
    </div>`;
};

// ─── sendPasswordReset ────────────────────────────────────────────────────────
// Supports two call patterns:
//   New: { email, name, resetUrl, schoolName }
//   Old: { to, resetUrl, school }  (school is a Prisma School object)
const sendPasswordReset = async ({ to, email, name, resetUrl, school, schoolName }) => {
  try {
    const recipient = email || to;
    const sName = schoolName || school?.name || 'D-Driver';
    const color = school?.primary_color || '#2dbc75';
    const logoUrl = school?.logo_url || null;
    const school_id = school?.id || null;

    const html = brandedHtml(sName, color, logoUrl, `
      <p>${name ? `Hi ${name},` : 'Hello,'}</p>
      <p>You requested a password reset.</p>
      <p><a href="${resetUrl}" style="background:${color};color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">Reset Password</a></p>
      <p style="color:#64748b;font-size:13px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
    `);

    await sendEmail({
      to: recipient,
      subject: `Reset your password — ${sName}`,
      html,
      template: 'password_reset',
      school_id,
    });
  } catch (err) {
    console.error('sendPasswordReset error:', err.message);
  }
};

// ─── sendWelcomeAdmin ─────────────────────────────────────────────────────────
// Supports two call patterns:
//   New: { adminEmail, adminName, schoolName, slug, tempPassword }
//   Old: { to, name, loginUrl, password, schoolName, school }
const sendWelcomeAdmin = async ({ to, adminEmail, name, adminName, loginUrl, password, tempPassword, schoolName, slug, school }) => {
  try {
    const recipient = adminEmail || to;
    const displayName = adminName || name || 'Admin';
    const sName = schoolName || school?.name || 'D-Driver';
    const color = school?.primary_color || '#2dbc75';
    const logoUrl = school?.logo_url || null;
    const school_id = school?.id || null;

    const baseDomain = process.env.BASE_DOMAIN || 'localhost:3000';
    const resolvedLoginUrl = loginUrl || (slug ? `http://${slug}.${baseDomain}` : `http://${baseDomain}`);
    const resolvedPassword = tempPassword || password || '(see your portal)';

    const html = brandedHtml(sName, color, logoUrl, `
      <p>Hi ${displayName},</p>
      <p>Your school <strong>${sName}</strong> has been set up on D-Driver.</p>
      <p>
        Login at: <a href="${resolvedLoginUrl}">${resolvedLoginUrl}</a><br>
        Temporary password: <code style="background:#f1f5f9;padding:4px 8px;border-radius:4px;">${resolvedPassword}</code>
      </p>
      <p style="color:#64748b;font-size:13px;">You will be asked to change your password on first login.</p>
    `);

    await sendEmail({
      to: recipient,
      subject: `Welcome to ${sName} Bus Portal — your login`,
      html,
      template: 'welcome_admin',
      school_id,
    });
  } catch (err) {
    console.error('sendWelcomeAdmin error:', err.message);
  }
};

// ─── sendParentWelcome ────────────────────────────────────────────────────────
// Supports two call patterns:
//   New: { parentEmail, parentName, studentName, schoolName, slug, tempPassword }
//   Old: { to, name, childName, loginUrl, password, school }
const sendParentWelcome = async ({ to, parentEmail, name, parentName, childName, studentName, loginUrl, password, tempPassword, schoolName, slug, school }) => {
  try {
    const recipient = parentEmail || to;
    const displayName = parentName || name || 'Parent';
    const childDisplayName = studentName || childName || 'your child';
    const sName = schoolName || school?.name || 'D-Driver';
    const color = school?.primary_color || '#2dbc75';
    const logoUrl = school?.logo_url || null;
    const school_id = school?.id || null;

    const baseDomain = process.env.BASE_DOMAIN || 'localhost:3000';
    const resolvedLoginUrl = loginUrl || (slug ? `http://${slug}.${baseDomain}` : `http://${baseDomain}`);
    const resolvedPassword = tempPassword || password || '(see your portal)';

    const html = brandedHtml(sName, color, logoUrl, `
      <p>Hi ${displayName},</p>
      <p>Your child <strong>${childDisplayName}</strong>'s bus tracking account is ready.</p>
      <p>
        Login at: <a href="${resolvedLoginUrl}">${resolvedLoginUrl}</a><br>
        Password: <code style="background:#f1f5f9;padding:4px 8px;border-radius:4px;">${resolvedPassword}</code>
      </p>
      <p style="color:#64748b;font-size:13px;">You will be asked to change your password on first login.</p>
    `);

    await sendEmail({
      to: recipient,
      subject: `${childDisplayName}'s bus tracking account is ready`,
      html,
      template: 'welcome_parent',
      school_id,
    });
  } catch (err) {
    console.error('sendParentWelcome error:', err.message);
  }
};

// ─── sendInvoiceGenerated ─────────────────────────────────────────────────────
// Supports two call patterns:
//   New: { adminEmail, schoolName, month, amount }
//   Old: { to, month, amount, school }
const sendInvoiceGenerated = async ({ to, adminEmail, month, amount, school, schoolName }) => {
  try {
    const recipient = adminEmail || to;
    const sName = schoolName || school?.name || 'D-Driver';
    const color = school?.primary_color || '#2dbc75';
    const logoUrl = school?.logo_url || null;
    const school_id = school?.id || null;

    const html = brandedHtml(sName, color, logoUrl, `
      <p>Invoice for <strong>${month}</strong> has been generated.</p>
      <p style="font-size:24px;font-weight:700;">₹${Number(amount).toLocaleString('en-IN')}</p>
      <p>Please log in to your portal to view and pay.</p>
    `);

    await sendEmail({
      to: recipient,
      subject: `Invoice for ${month} ready — ₹${amount}`,
      html,
      template: 'invoice',
      school_id,
    });
  } catch (err) {
    console.error('sendInvoiceGenerated error:', err.message);
  }
};

module.exports = {
  sendEmail,
  sendPasswordReset,
  sendWelcomeAdmin,
  sendParentWelcome,
  sendInvoiceGenerated,
};
