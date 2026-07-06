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
const sendEmail = async ({ to, subject, html, template, school_id, from, attachments }) => {
  // Default to the verified domain (onlive.co.in). ddriver.app is NOT verified in Resend,
  // so any send from it 403s. Falls back here only if RESEND_FROM_DEFAULT isn't set.
  let fromAddress = from || process.env.RESEND_FROM_DEFAULT || 'noreply@onlive.co.in';

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

  // Hard guard: ddriver.app is no longer a verified Resend domain, so any send from it
  // 403s. Force the verified onlive.co.in sender no matter where the address came from
  // (env override, school notification_email, or a stale default).
  if (/@ddriver\.app$/i.test(fromAddress.trim())) {
    fromAddress = 'noreply@onlive.co.in';
  }

  let status = 'sent';
  let errorMessage = null;
  const resendClient = getClient();
  if (!resendClient) {
    errorMessage = 'RESEND_API_KEY not set';
    console.warn('Resend skipped: RESEND_API_KEY not set');
    status = 'failed';
  } else {
    try {
      // The Resend SDK returns { data, error } — it does NOT throw on API errors
      // (e.g. unverified domain / invalid from). Must inspect `error` explicitly.
      const payload = { from: fromAddress, to, subject, html };
      if (Array.isArray(attachments) && attachments.length) payload.attachments = attachments;
      const { error } = await resendClient.emails.send(payload);
      if (error) {
        status = 'failed';
        errorMessage = error.message || error.name || 'send failed';
        console.error('Resend error:', errorMessage, '(from:', fromAddress + ')');
      }
    } catch (err) {
      status = 'failed';
      errorMessage = err.message;
      console.error('Resend exception:', err.message);
    }
  }

  try {
    await prisma.emailLog.create({
      data: { to, subject, template, school_id: school_id || null, status },
    });
  } catch (err) {
    console.error('EmailLog write error:', err.message);
  }

  return { status, error: errorMessage };
};

// ─── EMAIL TEMPLATES ──────────────────────────────────────────────────────────

const brandedHtml = (schoolName, color, logoUrl, bodyHtml) => {
  const safeColor = color || '#3B82F6';
  const safeName = schoolName || 'Onlive';
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
    const sName = schoolName || school?.name || 'Onlive';
    const color = school?.primary_color || '#3B82F6';
    const logoUrl = school?.logo_url || null;
    const school_id = school?.id || null;

    const html = brandedHtml(sName, color, logoUrl, `
      <p>${name ? `Hi ${name},` : 'Hello,'}</p>
      <p>You requested a password reset.</p>
      <p><a href="${resetUrl}" style="background:${color};color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">Reset Password</a></p>
      <p style="color:#64748b;font-size:13px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
    `);

    return await sendEmail({
      to: recipient,
      subject: `Reset your password — ${sName}`,
      html,
      template: 'password_reset',
      school_id,
    });
  } catch (err) {
    console.error('sendPasswordReset error:', err.message);
    return { status: 'failed', error: err.message };
  }
};

// ─── sendWelcomeAdmin ─────────────────────────────────────────────────────────
// Supports two call patterns:
//   New: { adminEmail, adminName, schoolName, slug, tempPassword }
//   Old: { to, name, loginUrl, password, schoolName, school }
// Disabled by request: the platform only sends password-reset emails. New admins receive
// their credentials in-app (shown to whoever creates the school) and set a password via the
// forgot/reset flow — so no welcome email is sent (and none is logged against usage).
const sendWelcomeAdmin = async () => {
  return { status: 'skipped', reason: 'welcome emails disabled' };
};

// ─── sendParentWelcome ────────────────────────────────────────────────────────
// Supports two call patterns:
//   New: { parentEmail, parentName, studentName, schoolName, slug, tempPassword }
//   Old: { to, name, childName, loginUrl, password, school }
// Disabled by request — see sendWelcomeAdmin. Only password-reset emails are sent.
const sendParentWelcome = async () => {
  return { status: 'skipped', reason: 'welcome emails disabled' };
};

// ─── sendInvoiceGenerated ─────────────────────────────────────────────────────
// Supports two call patterns:
//   New: { adminEmail, schoolName, month, amount }
//   Old: { to, month, amount, school }
const sendInvoiceGenerated = async ({ to, adminEmail, month, amount, school, schoolName, pdfBuffer, pdfUrl }) => {
  try {
    const recipient = adminEmail || to;
    const sName = schoolName || school?.name || 'Onlive';
    const color = school?.primary_color || '#3B82F6';
    const logoUrl = school?.logo_url || null;
    const school_id = school?.id || null;

    const downloadLink = pdfUrl
      ? `<p><a href="${pdfUrl}" style="background:${color};color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">Download Invoice (PDF)</a></p>`
      : '';

    const html = brandedHtml(sName, color, logoUrl, `
      <p>Invoice for <strong>${month}</strong> has been generated.</p>
      <p style="font-size:24px;font-weight:700;">₹${Number(amount).toLocaleString('en-IN')}</p>
      ${downloadLink}
      <p>Please log in to your portal to view and pay${pdfBuffer ? ', or see the attached PDF' : ''}.</p>
    `);

    const attachments = pdfBuffer
      ? [{ filename: `invoice-${month}.pdf`, content: pdfBuffer }]
      : undefined;

    await sendEmail({
      to: recipient,
      subject: `Invoice for ${month} ready — ₹${amount}`,
      html,
      template: 'invoice',
      school_id,
      attachments,
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
