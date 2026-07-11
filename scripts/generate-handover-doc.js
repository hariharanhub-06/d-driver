/* Generates the OnLIVE product handover agreement as an editable .docx.
   Run: node scripts/generate-handover-doc.js  →  handover/OnLIVE-Delivery-Support-NDA.docx */
const fs = require('fs');
const path = require('path');
const {
    Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
    Table, TableRow, TableCell, WidthType, BorderStyle,
} = require('docx');

const BRAND = '1D4ED8';
const DARK = '0F172A';
const MUTED = '64748B';

// ── helpers ──────────────────────────────────────────────────────────────────
const T = (text, o = {}) => new TextRun({ text, font: 'Calibri', size: 21, ...o }); // 21 half-pt = 10.5pt
const P = (children, o = {}) => new Paragraph({ spacing: { after: 120, line: 276 }, children: Array.isArray(children) ? children : [T(children)], ...o });
const H1 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 120 }, children: [new TextRun({ text, bold: true, color: DARK, font: 'Calibri', size: 26 })] });
const clauseHead = (text) => new Paragraph({ spacing: { before: 200, after: 80 }, children: [new TextRun({ text, bold: true, color: BRAND, font: 'Calibri', size: 23 })] });
// A numbered clause line: bold "n.n" then the text.
const clause = (num, text) => new Paragraph({ spacing: { after: 100, line: 276 }, children: [new TextRun({ text: num + '  ', bold: true, font: 'Calibri', size: 21 }), T(text)] });
const bullet = (children) => new Paragraph({ bullet: { level: 0 }, spacing: { after: 60, line: 264 }, children: Array.isArray(children) ? children : [T(children)] });
const blank = (n = 30) => new TextRun({ text: '_'.repeat(n), font: 'Calibri', size: 21 });
const featureItem = (title, body) => new Paragraph({ bullet: { level: 0 }, spacing: { after: 90, line: 264 }, children: [new TextRun({ text: title + ' — ', bold: true, font: 'Calibri', size: 21 }), T(body)] });

const doc = new Document({
    creator: 'OnLIVE',
    title: 'Software Delivery, Support & Non-Disclosure Agreement — OnLIVE',
    styles: { default: { document: { run: { font: 'Calibri', size: 21 } } } },
    sections: [{
        properties: { page: { margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 } } },
        children: [
            // ── Letterhead ──
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [
                new TextRun({ text: 'OnLIVE', bold: true, color: DARK, font: 'Calibri', size: 40 }),
                new TextRun({ text: '  —  Smart Transport Ecosystem', color: BRAND, font: 'Calibri', size: 28 }),
            ] }),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BRAND } }, children: [
                new TextRun({ text: 'SOFTWARE DELIVERY, SUPPORT & NON-DISCLOSURE AGREEMENT', bold: true, color: DARK, font: 'Calibri', size: 24 }),
            ] }),

            P([T('This Software Delivery, Support & Non-Disclosure Agreement (the '), T('"Agreement"', { bold: true }), T(') is made and entered into on '), blank(26), T('  (the '), T('"Effective Date"', { bold: true }), T(', also the '), T('"NDA Sign Date"', { bold: true }), T(').')]),

            P([T('BETWEEN:', { bold: true })]),
            P([blank(48), T('  ('), T('"the Developer"', { bold: true }), T(') — the party that designed, developed, tested and delivered the Software,')]),
            P([T('of  '), blank(50), T('  (address).')]),
            P([T('AND:', { bold: true })]),
            P([blank(48), T('  ('), T('"the Vendor"', { bold: true }), T(') — the party receiving, owning and operating the Software,')]),
            P([T('of  '), blank(50), T('  (address).')]),
            P([T('The Developer and the Vendor are each a '), T('"Party"', { bold: true }), T(' and together the '), T('"Parties"', { bold: true }), T('.')]),

            clauseHead('Recitals'),
            clause('A.', 'The Developer has designed and developed the software product known as "OnLIVE — Smart Transport Ecosystem" (the "Software"), comprising a Backend API, a Web Application (Progressive Web App) and a Native Mobile Application.'),
            clause('B.', "The Software has been fully built and tested by the Developer's team and independently reviewed and tested by the Vendor. All queries, defects and issues identified during this period have, as of the Effective Date, been addressed and resolved."),
            clause('C.', 'The Parties now wish to record the formal delivery (handover / "surrender") of the Software to the Vendor, the post-delivery support terms, ownership, and confidentiality obligations.'),

            clauseHead('1. Definitions'),
            clause('1.1', '"Software" — the OnLIVE platform and the features listed in Schedule A.'),
            clause('1.2', '"Effective Date" / "NDA Sign Date" — the date this Agreement is signed.'),
            clause('1.3', '"Support Period" — the six (6) months beginning on the Effective Date.'),
            clause('1.4', '"Bug / Defect" — a failure of the Software to perform materially in accordance with the features described in Schedule A.'),
            clause('1.5', '"Change Request" — any redesign, restyle, new feature or enhancement not in Schedule A.'),
            clause('1.6', '"Confidential Information" — as defined in Clause 7.'),

            clauseHead('2. Delivery & Acceptance'),
            clause('2.1', 'The Developer hereby delivers the Software to the Vendor as described in Schedule A (Features Delivered).'),
            new Paragraph({ spacing: { after: 100, line: 276 }, children: [new TextRun({ text: '2.2  ', bold: true, font: 'Calibri', size: 21 }), T('The Software has been developed and tested by the Developer and reviewed/tested by the Vendor. '), new TextRun({ text: 'As of the Effective Date, all issues and queries raised have been identified and resolved, and every item in Schedule A is present and operational at the point of delivery.', bold: true, font: 'Calibri', size: 21 })] }),
            clause('2.3', 'The Vendor acknowledges receipt and acceptance of the Software in working condition. The handover materials in Schedule B are provided to the Vendor.'),

            clauseHead('3. Post-Delivery Support — 6 Months, No Cost'),
            new Paragraph({ spacing: { after: 100, line: 276 }, children: [new TextRun({ text: '3.1  ', bold: true, font: 'Calibri', size: 21 }), T('During the '), new TextRun({ text: 'Support Period (6 months from the Effective Date)', bold: true, font: 'Calibri', size: 21 }), T(", the Developer's team will support the Vendor for any Bugs, defects or issues in the delivered Software "), new TextRun({ text: 'at no additional cost', bold: true, font: 'Calibri', size: 21 }), T(', rectifying and re-delivering fixes within a reasonable time.')] }),
            clause('3.2', 'Free support covers correction of defects in the delivered features (Schedule A) only.'),
            clause('3.3', 'Excluded from free support and quoted/charged separately: (a) redesign or restyling; (b) new features or enhancements outside Schedule A; (c) changes to scope, integrations or third-party services; (d) issues caused by Vendor modifications, misuse, third-party outages, or changes to servers/hosting/keys outside the Developer’s control; (e) data entry, content or day-to-day operational tasks.'),
            clause('3.4', 'After the Support Period, all support, maintenance or changes are by separate paid engagement.'),

            clauseHead('4. Change Requests (Chargeable)'),
            new Paragraph({ spacing: { after: 100, line: 276 }, children: [new TextRun({ text: '4.1  ', bold: true, font: 'Calibri', size: 21 }), new TextRun({ text: 'Any redesign or new feature', bold: true, font: 'Calibri', size: 21 }), T(' requested by the Vendor — during or after the Support Period — is a Change Request, quoted and charged separately, and begins only after the Parties agree scope and fees in writing.')] }),

            clauseHead('5. Intellectual Property & Ownership'),
            clause('5.1', '[Upon delivery [and full payment of all agreed fees], all right, title and interest in the delivered Software and its source code transfer to the Vendor.]  (Alternative: the Developer grants the Vendor a perpetual licence to use the Software.)'),
            clause('5.2', 'Pre-existing frameworks, open-source libraries and third-party components remain under their respective licences. The Developer retains general know-how, techniques and non-Vendor-specific components for reuse.'),

            clauseHead('6. Third-Party Services & Credentials'),
            clause('6.1', 'The Software integrates third-party services — Razorpay (payments), Resend (email), ImageKit (media/uploads), and map/tile providers. After delivery the Vendor is responsible for maintaining its own accounts, API keys, subscriptions and fees for these services.'),

            clauseHead('7. Confidentiality (Non-Disclosure)'),
            clause('7.1', '"Confidential Information" means all non-public information of either Party, including the Software source code and architecture, credentials/keys, business and pricing information, personal data of schools/parents/students/drivers, and this Agreement.'),
            clause('7.2', "Each Party shall keep the other's Confidential Information strictly confidential, use it only for the purposes of this Agreement, and not disclose it to any third party without prior written consent."),
            clause('7.3', 'These obligations survive termination and continue for [three (3)] years, and indefinitely for source code and personal data.'),
            clause('7.4', 'Exclusions: information that is or becomes public (other than by breach), is independently developed, or must be disclosed by law.'),
            clause('7.5', 'Data protection: both Parties will handle personal data in accordance with applicable data-protection laws.'),

            clauseHead('8. Warranties & Liability'),
            clause('8.1', 'The Developer warrants the Software materially performs per Schedule A at delivery and will remedy Bugs during the Support Period per Clause 3.'),
            clause('8.2', 'Save as expressly stated, the Software is provided "as is" for matters outside Schedule A. To the maximum extent permitted by law, the Developer’s total liability is limited to the fees paid under this engagement, and neither Party is liable for indirect or consequential loss.'),

            clauseHead('9. Term & Termination'),
            clause('9.1', 'This Agreement takes effect on the Effective Date. Support obligations end on expiry of the Support Period; the confidentiality obligations survive per Clause 7.'),

            clauseHead('10. General'),
            clause('10.1', 'This Agreement is the entire agreement between the Parties on its subject matter and supersedes prior discussions.'),
            clause('10.2', 'Amendments must be in writing and signed by both Parties.'),
            new Paragraph({ spacing: { after: 100, line: 276 }, children: [new TextRun({ text: '10.3  ', bold: true, font: 'Calibri', size: 21 }), T('Governing law: '), blank(22), T('; courts of '), blank(22), T(' have jurisdiction.')] }),
            clause('10.4', "Neither Party may assign this Agreement without the other's written consent."),
            clause('10.5', 'If any clause is unenforceable, the remainder stays in effect.'),

            // ── Schedule A ──
            H1('Schedule A — Features Delivered'),
            new Paragraph({ spacing: { after: 140 }, children: [new TextRun({ text: 'All present and operational at the point of delivery.', italics: true, color: MUTED, font: 'Calibri', size: 20 })] }),
            featureItem('Platform & Roles', 'Five roles (Super-admin, School Admin, Driver, Parent, Bus-staff), each with its own dashboard; multi-tenant per-school data isolation; per-school feature subscription toggles (403-gated); white-label branding per school (logo, colour, contact, website) + public school microsite.'),
            featureItem('Live Tracking & Safety', 'Real-time GPS bus tracking (Socket.io) for parents/admin/super-admin; SOS emergency alerts (driver- and parent-triggered) with realtime admin resolution; bus-switch handling.'),
            featureItem('Attendance & Trips', 'Student attendance (pickup/drop) by driver & bus-staff; trip start/track/end; parent absence reporting with admin review; attendance reports/exports.'),
            featureItem('Students, Routes & Stops', 'Student CRUD with photos & plan assignment; route management & routing/optimization; stop management, map-based stop placement (lat/long), nearby-stops for parents; parent stop-change requests with admin approval; student "passport" transport view.'),
            featureItem('Fleet (Bus / Driver / Fuel / Maintenance / Shifts)', 'Bus management with RC & insurance expiry; driver management with licence expiry; fuel requests & GPS-based consumption; maintenance logging/requests; driver shift tracking & logs; bus-staff assignment.'),
            featureItem('Billing, Subscriptions & Payments', 'Super-admin pricing plans with feature permissions; per-school and per-student (individual) invoices; branded PDF invoices; Razorpay online payments (platform + per-school) with webhooks; school fee management (structures, cash recording, reminders, fee-delay requests); super-admin revenue dashboard, expenses & reports; automated billing & fee cron jobs.'),
            featureItem('Communication & Notifications', 'In-app notifications (realtime) for all roles; Resend branded email; push/realtime alerts for location, SOS, maintenance, billing and expiries.'),
            featureItem('Automated Reminders', 'Daily jobs: insurance/RC & driver-licence expiry reminders to admins (from 5 days before / while expired), auto-billing & overdue reminders, fee generation.'),
            featureItem('Authentication & Security', 'Login by email or mobile number; forgot/reset password (via email or mobile); forced first-login change-password; JWT access+refresh with logout blocklist; multi-account switching; rate limiting, Helmet, CORS allow-list, field encryption, audit logging; password policy.'),
            featureItem('Landing / Marketing Site', 'Public OnLIVE landing page with super-admin-editable content (hero, solutions, features, challenges, partners, founders, socials, contact), installable PWA; public per-school microsite.'),
            featureItem('Apps & Platforms', 'Web PWA (installable, offline shell) + Native Mobile App (Expo, all 5 roles) + Capacitor shell; bilingual English/Tamil; media uploads via ImageKit.'),
            featureItem('Admin / Super-admin Management', 'Full school-admin console (buses, drivers, staff, routes, stops, students, parents, users, attendance, tracking, fuel, maintenance, shifts, leave/stop-change/bus-switch requests, fees, reports, subscriptions, notifications, settings) and super-admin console (schools + drill-down, users, plans, billing/individual, revenue, expenses, permissions, reports, activity, audit, logs, tracking, settings), with mobile parity.'),

            // ── Schedule B ──
            H1('Schedule B — Handover Materials'),
            bullet('Source-code repositories (Backend API, Web App, Mobile App).'),
            bullet('Deployment / configuration files.'),
            bullet('Super-admin & platform credentials / keys setup.'),
            bullet('Third-party integration notes (Razorpay, Resend, ImageKit).'),
            bullet('User / role documentation.'),

            // ── Signatures ──
            H1('Signatures'),
            P([T('The Parties confirm the delivery, support, ownership and confidentiality terms above as of the Effective Date.')]),
            new Paragraph({ spacing: { after: 200 }, children: [] }),
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE } },
                rows: [
                    new TableRow({ children: [
                        new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, children: [
                            new Paragraph({ spacing: { after: 300 }, children: [new TextRun({ text: 'For the Developer / Agency', bold: true, font: 'Calibri', size: 21 })] }),
                            P([T('Name: '), blank(24)]),
                            P([T('Title: '), blank(24)]),
                            P([T('Signature: '), blank(20)]),
                            P([T('Date: '), blank(24)]),
                        ] }),
                        new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, children: [
                            new Paragraph({ spacing: { after: 300 }, children: [new TextRun({ text: 'For the Vendor', bold: true, font: 'Calibri', size: 21 })] }),
                            P([T('Name: '), blank(24)]),
                            P([T('Title: '), blank(24)]),
                            P([T('Signature: '), blank(20)]),
                            P([T('Date: '), blank(24)]),
                        ] }),
                    ] }),
                ],
            }),
            new Paragraph({ spacing: { before: 240 }, children: [new TextRun({ text: 'Witness (optional):  Name ', font: 'Calibri', size: 21 }), blank(22), new TextRun({ text: '   Signature ', font: 'Calibri', size: 21 }), blank(18), new TextRun({ text: '   Date ', font: 'Calibri', size: 21 }), blank(16)] }),
        ],
    }],
});

Packer.toBuffer(doc).then((buf) => {
    const out = path.join(__dirname, '..', 'handover', 'OnLIVE-Delivery-Support-NDA.docx');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, buf);
    console.log('Wrote', out, '(' + Math.round(buf.length / 1024) + ' KB)');
});
