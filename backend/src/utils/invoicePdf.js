const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
// NOTE: ./imagekit is required lazily inside renderAndUploadInvoicePdf so that
// generateInvoicePdf() works without ImageKit env keys (and never blocks billing).

// Brand palette (matches the OnLIVE web/app theme).
const BRAND = '#2563EB';
const DARK = '#0F172A';
const BODY = '#334155';
const MUTED = '#64748B';
const LINE = '#E2E8F0';
const ZEBRA = '#F1F6FE';
const LOGO_PATH = path.join(__dirname, '..', '..', 'assets', 'onlive-logo.png');

// Issuer details printed in the "from" block.
const ISSUER = {
  name: 'OnLIVE — Smart Transport Ecosystem',
  lines: [
    'Coimbatore, Tamil Nadu, India',
    'Mobile: +91 91509 50444',
    'Email: onliveecosystem@gmail.com',
    'Web: www.onlive.co.in',
  ],
};

// Helvetica is WinAnsi-encoded and has no rupee glyph, so amounts are prefixed "INR".
const inr = (n) => `INR ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d) => {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
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
 * Layout: issuer block + logo, Bill-To against invoice meta, a numbered line-item table,
 * totals with paid/balance, payment instructions and a signatory block.
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
      // bufferPages so the footer can be stamped onto every page after layout completes.
      const doc = new PDFDocument({ size: 'A4', margin: 44, bufferPages: true });
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageW = doc.page.width;
      const left = doc.page.margins.left;
      const right = pageW - doc.page.margins.right;
      const contentW = right - left;

      const snap = invoice.line_items_snapshot || {};
      // Defensive: 'expense'/'profit' rows are internal planning aids. invoiceGenerator now
      // filters them, but older invoices have them frozen into line_items_snapshot — strip
      // them here too so a reprint of an old invoice never discloses internal margins.
      const lineItems = (Array.isArray(snap.line_items) ? snap.line_items : [])
        .filter(it => !['expense', 'profit'].includes(it.metric));
      const planName = snap.plan_name || '';

      const isPaid = String(invoice.status || '').toLowerCase() === 'paid';
      const total = Number(invoice.total_amount) || 0;
      const paidAmount = isPaid ? total : 0;
      const balanceDue = total - paidAmount;

      // ── Header: title + logo ─────────────────────────────────────────────
      let y = 40;
      doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(30).text('INVOICE', left, y, { characterSpacing: 1 });
      try {
        if (fs.existsSync(LOGO_PATH)) doc.image(LOGO_PATH, right - 96, y - 6, { fit: [96, 52], align: 'right' });
      } catch (_) { /* logo optional */ }

      // ── Issuer ("from") block ────────────────────────────────────────────
      y += 42;
      doc.fillColor(DARK).font('Helvetica-Bold').fontSize(11).text(ISSUER.name, left, y, { width: contentW * 0.6 });
      y += 16;
      doc.font('Helvetica').fontSize(8.5).fillColor(MUTED);
      for (const l of ISSUER.lines) { doc.text(l, left, y, { width: contentW * 0.6 }); y += 11.5; }

      // Divider under the issuer block
      y += 6;
      doc.strokeColor(BRAND).lineWidth(1.5).moveTo(left, y).lineTo(right, y).stroke();
      y += 16;

      // ── Bill-to (left) vs invoice meta (right) ───────────────────────────
      const colW = contentW / 2 - 10;
      const metaX = left + contentW / 2 + 10;
      const blockTop = y;

      doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(10).text('Bill To', left, y);
      doc.fillColor(DARK).font('Helvetica-Bold').fontSize(12)
        .text(billToName || school.name || 'Customer', left, y + 15, { width: colW });
      let byY = y + 32;
      doc.font('Helvetica').fontSize(9).fillColor(BODY);
      const billLines = [
        billToSub || (kind === 'student' ? school.name : null),
        school.address,
        school.phone ? `Mobile: ${school.phone}` : null,
        school.email_contact,
      ].filter(Boolean);
      for (const l of billLines) {
        const h = doc.heightOfString(l, { width: colW });
        doc.text(l, left, byY, { width: colW });
        byY += h + 2;
      }

      // Right column — invoice details, label left / value right
      const invNo = `INV-${String(invoice.id || '').slice(0, 8).toUpperCase()}`;
      const meta = [
        ['Invoice No', invNo],
        ['Billing Period', fmtMonth(invoice.billing_month)],
        ['Invoice Date', fmtDate(invoice.created_at || new Date())],
        ['Due Date', fmtDate(invoice.due_date)],
      ];
      if (planName) meta.push(['Plan', planName]);
      meta.push(['Status', String(invoice.status || 'pending').toUpperCase()]);

      let mY = blockTop;
      for (const [k, v] of meta) {
        doc.font('Helvetica').fontSize(9).fillColor(MUTED).text(k, metaX, mY, { width: colW * 0.45 });
        doc.font('Helvetica-Bold').fontSize(9).fillColor(isPaid && k === 'Status' ? '#059669' : DARK)
          .text(v, metaX + colW * 0.45, mY, { width: colW * 0.55, align: 'right' });
        mY += 15;
      }

      y = Math.max(byY, mY) + 20;

      // ── Line items ───────────────────────────────────────────────────────
      // Column x-positions; each cell is drawn with an explicit width so nothing collides.
      const cSl = left + 6;
      const wSl = 26;
      const cDesc = cSl + wSl;
      const wDesc = contentW * 0.46;
      const cQty = cDesc + wDesc;
      const wQty = contentW * 0.10;
      const cRate = cQty + wQty;
      const wRate = contentW * 0.19;
      const cAmt = cRate + wRate;
      const wAmt = right - cAmt - 6;

      const drawHead = () => {
        doc.rect(left, y, contentW, 22).fill(BRAND);
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8.5);
        doc.text('SL.', cSl, y + 7, { width: wSl, lineBreak: false });
        doc.text('DESCRIPTION', cDesc, y + 7, { width: wDesc, lineBreak: false });
        doc.text('QTY', cQty, y + 7, { width: wQty, align: 'right', lineBreak: false });
        doc.text('RATE', cRate, y + 7, { width: wRate, align: 'right', lineBreak: false });
        doc.text('AMOUNT', cAmt, y + 7, { width: wAmt, align: 'right', lineBreak: false });
        y += 22;
      };
      drawHead();

      if (lineItems.length === 0) {
        doc.font('Helvetica').fontSize(9).fillColor(MUTED).text('No line items', cDesc, y + 8, { width: wDesc });
        y += 28;
      }

      lineItems.forEach((it, i) => {
        const label = it.label || 'Item';
        const sub = it.description || metricLabel(it.metric);
        // Measure before drawing so a long description never overlaps the next row.
        const labelH = doc.font('Helvetica-Bold').fontSize(9).heightOfString(label, { width: wDesc });
        const subH = sub ? doc.font('Helvetica').fontSize(8).heightOfString(sub, { width: wDesc }) : 0;
        const rowH = Math.max(labelH + subH + 12, 26);

        // Start a new page (with a repeated header) rather than spilling past the footer.
        if (y + rowH > doc.page.height - 210) {
          doc.addPage();
          y = doc.page.margins.top;
          drawHead();
        }

        if (i % 2 === 1) doc.rect(left, y, contentW, rowH).fill(ZEBRA);

        doc.fillColor(MUTED).font('Helvetica').fontSize(9).text(String(i + 1), cSl, y + 7, { width: wSl });
        doc.fillColor(DARK).font('Helvetica-Bold').fontSize(9).text(label, cDesc, y + 7, { width: wDesc });
        if (sub) doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(sub, cDesc, y + 7 + labelH + 1, { width: wDesc });

        doc.font('Helvetica').fontSize(9).fillColor(BODY);
        doc.text(String(it.quantity ?? 1), cQty, y + 7, { width: wQty, align: 'right' });
        doc.text(inr(it.unit_rate), cRate, y + 7, { width: wRate, align: 'right' });
        doc.font('Helvetica-Bold').fillColor(DARK).text(inr(it.charge), cAmt, y + 7, { width: wAmt, align: 'right' });

        y += rowH;
        doc.strokeColor(LINE).lineWidth(0.5).moveTo(left, y).lineTo(right, y).stroke();
      });

      // ── Payment instructions (left) + totals (right) ─────────────────────
      y += 18;
      const totalsX = left + contentW * 0.55;
      const totalsW = right - totalsX;
      const payX = left;
      const payW = contentW * 0.5 - 12;
      const sectionTop = y;

      doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(10).text('Payment Instructions', payX, y);
      doc.font('Helvetica').fontSize(8.5).fillColor(BODY).text(
        isPaid
          ? 'Payment received in full. Thank you.'
          : 'Pay securely online from your OnLIVE portal (Billing → Pay Online), or by bank transfer/UPI using the invoice number as reference.',
        payX, y + 15, { width: payW, lineGap: 1.5 }
      );
      // Reference the Razorpay payment so the PDF reconciles against the gateway.
      if (invoice.razorpay_payment_id) {
        doc.font('Helvetica').fontSize(8).fillColor(MUTED)
          .text(`Payment ID: ${invoice.razorpay_payment_id}`, payX, doc.y + 6, { width: payW });
      }
      if (isPaid && invoice.paid_at) {
        doc.font('Helvetica').fontSize(8).fillColor(MUTED)
          .text(`Paid on: ${fmtDate(invoice.paid_at)}`, payX, doc.y + 2, { width: payW });
      }
      const payBottom = doc.y;

      // Totals stack
      let tY = sectionTop;
      const totRow = (label, value, opts = {}) => {
        doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(opts.big ? 11.5 : 9.5)
          .fillColor(opts.bold ? DARK : MUTED)
          .text(label, totalsX, tY, { width: totalsW * 0.52 });
        doc.font('Helvetica-Bold').fontSize(opts.big ? 11.5 : 9.5)
          .fillColor(opts.accent ? BRAND : DARK)
          .text(value, totalsX + totalsW * 0.52, tY, { width: totalsW * 0.48, align: 'right' });
        tY += opts.big ? 20 : 16;
      };

      totRow('Subtotal', inr(invoice.subtotal ?? total));
      if (Number(invoice.overdue_amount) > 0) totRow('Late fee', inr(invoice.overdue_amount));
      doc.strokeColor(LINE).lineWidth(0.8).moveTo(totalsX, tY + 1).lineTo(right, tY + 1).stroke();
      tY += 7;
      totRow('Total', inr(total), { bold: true });
      if (paidAmount > 0) totRow(`Paid (${fmtDate(invoice.paid_at)})`, inr(paidAmount));
      doc.strokeColor(LINE).lineWidth(0.8).moveTo(totalsX, tY + 1).lineTo(right, tY + 1).stroke();
      tY += 7;
      totRow(balanceDue > 0 ? 'Balance Due' : 'Balance', inr(balanceDue), { bold: true, big: true, accent: true });

      y = Math.max(payBottom, tY) + 30;

      // ── Signatory ────────────────────────────────────────────────────────
      // Keep it above the footer; if the page is nearly full, push to a new one.
      if (y > doc.page.height - 150) { doc.addPage(); y = doc.page.margins.top + 20; }
      const sigW = 170;
      const sigX = right - sigW;
      doc.strokeColor(MUTED).lineWidth(0.7).moveTo(sigX, y + 26).lineTo(right, y + 26).stroke();
      doc.font('Helvetica-Bold').fontSize(9).fillColor(DARK)
        .text('Authorized Signatory', sigX, y + 32, { width: sigW, align: 'center' });
      doc.font('Helvetica').fontSize(8).fillColor(MUTED)
        .text('OnLIVE Ecosystem', sigX, y + 45, { width: sigW, align: 'center' });

      // ── Footer on every page ─────────────────────────────────────────────
      const range = doc.bufferedPageRange ? doc.bufferedPageRange() : { start: 0, count: 1 };
      for (let i = 0; i < range.count; i++) {
        try { doc.switchToPage(range.start + i); } catch (_) { break; }
        // Text drawn below the bottom margin makes PDFKit append a blank page — zero it first.
        doc.page.margins.bottom = 0;
        const fY = doc.page.height - 58;
        doc.strokeColor(LINE).lineWidth(0.5).moveTo(left, fY).lineTo(right, fY).stroke();
        doc.font('Helvetica').fontSize(7.5).fillColor(MUTED).text(
          'This is a computer-generated invoice and does not require a physical signature.  ·  Billing queries: onliveecosystem@gmail.com  ·  +91 91509 50444',
          left, fY + 8, { width: contentW, align: 'center', lineBreak: false }
        );
        doc.font('Helvetica-Bold').fontSize(8).fillColor(BRAND)
          .text('www.onlive.co.in', left, fY + 22, { width: contentW, align: 'center', lineBreak: false });
      }

      doc.flushPages();
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
