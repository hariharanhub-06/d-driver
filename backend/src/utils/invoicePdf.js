const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
// NOTE: ./imagekit is required lazily inside renderAndUploadInvoicePdf so that
// generateInvoicePdf() works without ImageKit env keys (and never blocks billing).

// Brand palette (matches the OnLIVE web/app theme).
const BRAND = '#2563EB';
const DARK = '#0F172A';
const MUTED = '#64748B';
const LINE = '#E2E8F0';
const LOGO_PATH = path.join(__dirname, '..', '..', 'assets', 'onlive-logo.png');

const inr = (n) => `INR ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d) => {
  if (!d) return '-';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
const fmtMonth = (m) => {
  if (!m) return '-';
  const [y, mo] = String(m).split('-').map(Number);
  return new Date(y, (mo || 1) - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};
const metricLabel = (metric) => ({
  fixed: 'Fixed', per_bus: 'Per bus', per_student: 'Per student', per_route: 'Per route',
  per_gps_hour: 'Per GPS hour', per_km: 'Per km', per_shift: 'Per shift', custom: 'Custom',
}[metric] || (metric ? String(metric).replace(/_/g, ' ') : ''));

/**
 * Render a professional OnLIVE invoice to a PDF Buffer.
 *
 * @param {{
 *   invoice: object,          // SchoolInvoice | StudentInvoice row (with line_items_snapshot)
 *   school?: object,          // { name, address, phone, email_contact, website, logo_url }
 *   kind?: 'school'|'student',
 *   billToName?: string,      // overrides who the invoice is addressed to
 *   billToSub?: string,       // secondary line under the bill-to name
 * }} opts
 * @returns {Promise<Buffer>}
 */
function generateInvoicePdf({ invoice, school = {}, kind = 'school', billToName, billToSub } = {}) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 48 });
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageW = doc.page.width;
      const left = doc.page.margins.left;
      const right = pageW - doc.page.margins.right;
      const contentW = right - left;

      const snap = invoice.line_items_snapshot || {};
      const lineItems = Array.isArray(snap.line_items) ? snap.line_items : [];
      const planName = snap.plan_name || '';

      // ── Header band ──────────────────────────────────────────────────────
      doc.rect(0, 0, pageW, 120).fill(DARK);
      try {
        if (fs.existsSync(LOGO_PATH)) doc.image(LOGO_PATH, left, 34, { height: 44 });
      } catch (_) { /* logo optional */ }
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(22).text('INVOICE', right - 200, 38, { width: 200, align: 'right' });
      doc.font('Helvetica').fontSize(9).fillColor('#CBD5E1')
        .text('OnLIVE — Smart Transport Ecosystem', right - 240, 66, { width: 240, align: 'right' })
        .text('www.onlive.co.in  ·  onliveecosystem@gmail.com', right - 240, 80, { width: 240, align: 'right' });

      // ── Invoice meta + Bill-to ───────────────────────────────────────────
      let y = 150;
      const invNo = `INV-${String(invoice.id || '').slice(0, 8).toUpperCase()}`;
      doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(8).text('BILL TO', left, y);
      doc.fillColor(DARK).font('Helvetica-Bold').fontSize(13)
        .text(billToName || school.name || 'Customer', left, y + 12, { width: contentW / 2 });
      doc.font('Helvetica').fontSize(9).fillColor(MUTED);
      let byY = y + 30;
      const billLines = [
        billToSub || (kind === 'student' ? school.name : null),
        school.address,
        school.phone ? `Phone: ${school.phone}` : null,
        school.email_contact,
        school.website,
      ].filter(Boolean);
      for (const l of billLines) { doc.text(l, left, byY, { width: contentW / 2 - 12 }); byY += 13; }

      // Right column — invoice details
      const metaX = left + contentW / 2 + 12;
      const metaW = contentW / 2 - 12;
      const meta = [
        ['Invoice No.', invNo],
        ['Billing Period', fmtMonth(invoice.billing_month)],
        ['Issue Date', fmtDate(invoice.created_at || new Date())],
        ['Due Date', fmtDate(invoice.due_date)],
        ['Plan', planName || '-'],
        ['Status', String(invoice.status || 'pending').toUpperCase()],
      ];
      let mY = y;
      for (const [k, v] of meta) {
        doc.font('Helvetica').fontSize(9).fillColor(MUTED).text(k, metaX, mY, { width: metaW * 0.45 });
        doc.font('Helvetica-Bold').fontSize(9).fillColor(DARK).text(v, metaX + metaW * 0.45, mY, { width: metaW * 0.55, align: 'right' });
        mY += 15;
      }

      y = Math.max(byY, mY) + 24;

      // ── Line items table ─────────────────────────────────────────────────
      const cols = { desc: left + 8, qty: left + contentW * 0.58, rate: left + contentW * 0.72, amt: right - 8 };
      doc.rect(left, y, contentW, 24).fill(BRAND);
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9);
      doc.text('DESCRIPTION', cols.desc, y + 8, { width: contentW * 0.52 });
      doc.text('QTY', cols.qty - 8, y + 8, { width: contentW * 0.1, align: 'right' });
      doc.text('RATE', cols.rate - 8, y + 8, { width: contentW * 0.14, align: 'right' });
      doc.text('AMOUNT', left, y + 8, { width: contentW - 12, align: 'right' });
      y += 24;

      doc.font('Helvetica').fontSize(9);
      if (lineItems.length === 0) {
        doc.fillColor(MUTED).text('No line items', cols.desc, y + 8);
        y += 26;
      }
      lineItems.forEach((it, i) => {
        const rowH = it.description ? 34 : 24;
        if (i % 2 === 1) doc.rect(left, y, contentW, rowH).fill('#F8FAFC');
        doc.fillColor(DARK).font('Helvetica-Bold').fontSize(9).text(it.label || 'Item', cols.desc, y + 7, { width: contentW * 0.5 });
        if (it.description) doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(it.description, cols.desc, y + 20, { width: contentW * 0.5 });
        else if (it.metric) doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(metricLabel(it.metric), cols.desc, y + 20, { width: contentW * 0.5 });
        doc.font('Helvetica').fontSize(9).fillColor(DARK);
        doc.text(String(it.quantity ?? 1), cols.qty - 8, y + 7, { width: contentW * 0.1, align: 'right' });
        doc.text(inr(it.unit_rate), cols.rate - 8, y + 7, { width: contentW * 0.14, align: 'right' });
        doc.font('Helvetica-Bold').text(inr(it.charge), left, y + 7, { width: contentW - 12, align: 'right' });
        y += rowH;
        doc.strokeColor(LINE).lineWidth(0.5).moveTo(left, y).lineTo(right, y).stroke();
      });

      // ── Totals ───────────────────────────────────────────────────────────
      y += 12;
      const totX = left + contentW * 0.58;
      const totW = contentW * 0.42;
      const totRow = (label, value, opts = {}) => {
        doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(opts.big ? 12 : 9)
          .fillColor(opts.bold ? DARK : MUTED).text(label, totX, y, { width: totW * 0.5 });
        doc.font('Helvetica-Bold').fontSize(opts.big ? 12 : 9).fillColor(opts.big ? BRAND : DARK)
          .text(value, totX + totW * 0.5, y, { width: totW * 0.5, align: 'right' });
        y += opts.big ? 22 : 16;
      };
      totRow('Subtotal', inr(invoice.subtotal));
      if (Number(invoice.overdue_amount) > 0) totRow('Late fee', inr(invoice.overdue_amount));
      doc.strokeColor(LINE).lineWidth(1).moveTo(totX, y + 2).lineTo(right, y + 2).stroke();
      y += 8;
      totRow('Total Due', inr(invoice.total_amount), { bold: true, big: true });

      // ── Footer ───────────────────────────────────────────────────────────
      const footY = doc.page.height - 96;
      doc.strokeColor(LINE).lineWidth(0.5).moveTo(left, footY).lineTo(right, footY).stroke();
      doc.font('Helvetica-Bold').fontSize(9).fillColor(DARK).text('Payment & Support', left, footY + 10);
      doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(
        'Pay securely from your OnLIVE portal. For billing queries contact onliveecosystem@gmail.com or +91 91509 50444.',
        left, footY + 24, { width: contentW * 0.62 }
      );
      doc.font('Helvetica-Oblique').fontSize(8).fillColor(MUTED).text(
        'This is a computer-generated invoice and does not require a signature.',
        left, footY + 24, { width: contentW, align: 'right' }
      );
      doc.font('Helvetica-Bold').fontSize(9).fillColor(BRAND).text('OnLIVE Ecosystem', left, footY + 52, { width: contentW, align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Render the invoice PDF and upload it to ImageKit.
 * Returns { url, buffer } (buffer is reused for the email attachment). On failure
 * returns { url: null, buffer } if the PDF rendered but upload failed, or { url: null,
 * buffer: null } if rendering failed — billing must never break because of the PDF.
 */
async function renderAndUploadInvoicePdf(opts) {
  let buffer = null;
  try {
    buffer = await generateInvoicePdf(opts);
  } catch (err) {
    console.error('generateInvoicePdf error:', err.message);
    return { url: null, buffer: null };
  }
  try {
    const { uploadImage } = require('./imagekit');
    const inv = opts.invoice || {};
    const name = `invoice-${(inv.billing_month || 'na')}-${String(inv.id || '').slice(0, 8)}.pdf`;
    const { url } = await uploadImage(buffer, name, 'invoices');
    return { url, buffer };
  } catch (err) {
    console.error('uploadInvoicePdf error:', err.message);
    return { url: null, buffer };
  }
}

module.exports = { generateInvoicePdf, renderAndUploadInvoicePdf };
