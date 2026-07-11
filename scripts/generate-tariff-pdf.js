/**
 * Generates the Onlive tariff schedule as two PDFs:
 *   Onlive_Tariff_2026.pdf           — customer-facing, safe to send to schools
 *   Onlive_Tariff_2026_INTERNAL.pdf  — adds infra cost + margin sections
 *
 * Re-run after changing any figure in the TARIFF block below.
 *   node scripts/generate-tariff-pdf.js
 *
 * Segoe UI is embedded rather than a built-in font because the PDF standard
 * fonts are WinAnsi-encoded and have no glyph for the rupee sign (U+20B9).
 */
const fs = require('fs');
const path = require('path');
const PDFDocument = require(path.join(__dirname, '..', 'backend', 'node_modules', 'pdfkit'));

// ---------------------------------------------------------------------------
// Tariff figures — single source of truth
// ---------------------------------------------------------------------------
const EFFECTIVE = '11 July 2026';
const VERSION = 'v1.0';

// Flat tariff — no plans, no packs. One base fee, one per-bus rate, for everyone.
const BASE_FEE = 799;          // ₹ / month, per school
const PER_BUS = 299;           // ₹ / bus / month
// No minimum commitment. A floor above base+(1×bus) would mean small schools are
// quoted one number and billed another — e.g. at a ₹1,999 floor a 2-bus school
// works the tariff out to ₹1,397 and then gets an invoice for ₹1,999.
const MIN_COMMIT = 0;          // maps to PricingLineItem.min_value
const ANNUAL_DISCOUNT = 0.10;  // prepay 12 months, save 10%
const GST = 0.18;

const monthlyFor = (buses) => Math.max(BASE_FEE + buses * PER_BUS, MIN_COMMIT);
const annualFor = (buses) => Math.round(monthlyFor(buses) * 12 * (1 - ANNUAL_DISCOUNT));

const BUS_COUNTS = [2, 3, 5, 8, 10, 12, 15, 20, 25, 30, 40, 50, 75, 100];

// Mobile app charges — billed at setup AND again every year.
const ANDROID_FEE = 4500;
const IOS_FEE = 12000;

// Infra cost per month at scale (INTERNAL) — from the codebase audit, post-fix.
const SCALE_LADDER = [
    { schools: 1,   busesEach: 10, infra: 2300 },
    { schools: 5,   busesEach: 10, infra: 2300 },
    { schools: 10,  busesEach: 10, infra: 3900 },
    { schools: 20,  busesEach: 10, infra: 5600 },
    { schools: 50,  busesEach: 10, infra: 10500 },
    { schools: 100, busesEach: 10, infra: 23200 },
];
const RAZORPAY_PCT = 0.0236; // 2% + 18% GST on the gateway fee

// Every school gets every feature — there are no packs to gate them behind.
const INCLUDED = [
    'Live GPS Tracking',        'Parent Portal & App',
    'Route Management',         'Attendance',
    'Absence Reporting',        'Stop Change Requests',
    'Fee Management',           'Online Payments (Razorpay)',
    'Student Photos',           'Reports & Analytics',
    'Fuel Management',          'Shift & Kilometre Tracking',
    'Bus Switching',            'Bulk Import (CSV)',
    'SOS / Emergency Alerts',   'Unlimited Parents & Trips',
];

const CHARGES = [
    ['Onboarding & setup — up to 10 buses',        '₹15,000',            '—'],
    ['Onboarding & setup — 11 to 40 buses',        '₹25,000',            '—'],
    ['Onboarding & setup — 40+ buses',             '₹35,000',            '—'],
    ['Android app — branded, on Play Store',       `₹${ANDROID_FEE.toLocaleString('en-IN')}`, `₹${ANDROID_FEE.toLocaleString('en-IN')} / yr`],
    ['iOS app — branded, on App Store',            `₹${IOS_FEE.toLocaleString('en-IN')}`,     `₹${IOS_FEE.toLocaleString('en-IN')} / yr`],
    ['Annual platform licence (AMC)',              '—',                  '₹14,999 / yr'],
    ["School's own custom domain",                 '₹2,500',             '₹1,500 / yr'],
    ['Priority support / SLA',                     '—',                  '₹12,000 / yr'],
    ['History retention beyond 90 days',           '—',                  '₹3,000 / yr per extra year'],
    ['On-site driver training (refresh visit)',    '₹5,000',             '—'],
];

const PLATFORM_OVERHEAD = [
    ['Google Play Console',        '$25 (~₹2,100)', 'None — one-time fee, never renews'],
    ['Apple Developer Program',    '—',             '$99 / yr (~₹8,400) — app delisted if lapsed'],
    ['Domain (onlive.co.in)',      '—',             '~₹1,200 / yr'],
    ['SSL certificates',           '—',             '₹0 — auto-provisioned by Vercel + Render'],
    ['EAS Build (Expo)',           '—',             '₹0 — Android APK built free on GitHub Actions'],
    ['Self-hosted OSRM (advised)', '—',             '~₹6,000 / yr'],
];

// ---------------------------------------------------------------------------
// Rendering helpers
// ---------------------------------------------------------------------------
const FONTS = 'C:/Windows/Fonts';
const INK = '#1a1f2e';
const MUTED = '#6b7280';
const RULE = '#dfe3e9';
const BRAND = '#0f766e';
const BRAND_SOFT = '#e6f2f0';
const ALT = '#f7f9fa';
const M = 50;

const rs = (n) => '₹' + Number(n).toLocaleString('en-IN');

function reg(doc) {
    doc.registerFont('r', `${FONTS}/segoeui.ttf`);
    doc.registerFont('b', `${FONTS}/segoeuib.ttf`);
    doc.registerFont('sb', `${FONTS}/seguisb.ttf`);
}

/** Start a new page if fewer than `need` points remain. */
function room(doc, need) {
    if (doc.y + need > doc.page.height - 60) {
        doc.addPage();
        return true;
    }
    return false;
}

function h1(doc, text, sub) {
    room(doc, 70);
    doc.font('b').fontSize(17).fillColor(INK).text(text, M, doc.y);
    if (sub) doc.font('r').fontSize(9.5).fillColor(MUTED).text(sub, M, doc.y + 2);
    doc.moveDown(0.1);
    const y = doc.y + 4;
    doc.moveTo(M, y).lineTo(doc.page.width - M, y).lineWidth(2).strokeColor(BRAND).stroke();
    doc.y = y + 12;
}

function note(doc, text) {
    const w = doc.page.width - 2 * M;
    const h = doc.font('r').fontSize(9).heightOfString(text, { width: w, lineGap: 2 });
    room(doc, h + 10); // measure first — a flat reserve lets PDFKit split the note across pages
    const y = doc.y;
    doc.fillColor(MUTED).text(text, M, y, { width: w, lineGap: 2 });
    doc.y = y + h + 8;
}

/**
 * Table renderer.
 * cols: [{ label, width, align }]   rows: string[][]
 * opts.highlight: row index to tint with the brand colour
 */
function table(doc, cols, rows, opts = {}) {
    const total = cols.reduce((a, c) => a + c.width, 0);
    const scale = (doc.page.width - 2 * M) / total;
    cols.forEach((c) => (c.w = c.width * scale));

    const PAD = 6;
    const drawHead = () => {
        const y = doc.y;
        doc.rect(M, y, doc.page.width - 2 * M, 22).fill(BRAND);
        let x = M;
        cols.forEach((c) => {
            doc.font('b').fontSize(8.5).fillColor('#ffffff')
                .text(c.label.toUpperCase(), x + PAD, y + 6.5, {
                    width: c.w - 2 * PAD, align: c.align || 'left', lineBreak: false,
                });
            x += c.w;
        });
        doc.y = y + 22;
    };

    drawHead();

    rows.forEach((row, i) => {
        const hgt = Math.max(...row.map((cell, j) =>
            doc.font('r').fontSize(9).heightOfString(String(cell), { width: cols[j].w - 2 * PAD })
        ));
        const rowH = Math.max(hgt + 9, 20);

        if (doc.y + rowH > doc.page.height - 60) {
            doc.addPage();
            drawHead();
        }

        const y = doc.y;
        const isHi = opts.highlight === i;
        if (isHi) doc.rect(M, y, doc.page.width - 2 * M, rowH).fill(BRAND_SOFT);
        else if (i % 2) doc.rect(M, y, doc.page.width - 2 * M, rowH).fill(ALT);

        let x = M;
        row.forEach((cell, j) => {
            doc.font(isHi || j === 0 ? 'sb' : 'r').fontSize(9).fillColor(INK)
                .text(String(cell), x + PAD, y + 5, {
                    width: cols[j].w - 2 * PAD, align: cols[j].align || 'left',
                });
            x += cols[j].w;
        });

        doc.moveTo(M, y + rowH).lineTo(doc.page.width - M, y + rowH)
            .lineWidth(0.5).strokeColor(RULE).stroke();
        doc.y = y + rowH;
    });

    doc.moveDown(1.1);
}

function cover(doc, internal) {
    doc.rect(0, 0, doc.page.width, 200).fill(BRAND);
    doc.font('b').fontSize(34).fillColor('#ffffff').text('Onlive', M, 58);
    doc.font('r').fontSize(11).fillColor('#c3e5e0')
        .text('School Bus Tracking & Transport Management', M, 100);
    doc.font('b').fontSize(19).fillColor('#ffffff').text('Tariff & Pricing Schedule', M, 132);
    doc.font('r').fontSize(10).fillColor('#c3e5e0')
        .text(`Effective ${EFFECTIVE}  ·  ${VERSION}`, M, 160);

    doc.y = 235;

    if (internal) {
        doc.rect(M, doc.y, doc.page.width - 2 * M, 30).fill('#fef2f2');
        doc.font('b').fontSize(10).fillColor('#b91c1c')
            .text('INTERNAL — contains infrastructure cost and margin data. Do not send to schools.',
                M + 10, doc.y + 9, { width: doc.page.width - 2 * M - 20 });
        doc.y += 46;
    }

    doc.font('r').fontSize(10.5).fillColor(INK).text(
        'Onlive tracks school buses live using the driver\'s own smartphone — no GPS hardware to buy, ' +
        'install, or maintain. Parents follow the bus in real time, get arrival alerts, and pay transport ' +
        'fees online. Schools manage routes, stops, attendance, fuel and driver shifts from one dashboard.',
        M, doc.y, { width: doc.page.width - 2 * M, lineGap: 3, align: 'justify' }
    );
    doc.moveDown(0.8);
    doc.font('sb').fontSize(10.5).fillColor(BRAND).text(
        'One tariff. No plans, no packs, no feature tiers — every school gets every feature.',
        { width: doc.page.width - 2 * M, lineGap: 3 }
    );
    doc.moveDown(1.4);

    const boxes = [
        ['Base fee', rs(BASE_FEE), 'per school / month'],
        ['Per bus', rs(PER_BUS), 'per bus / month'],
        ['Hardware cost', rs(0), 'always'],
    ];
    const bw = (doc.page.width - 2 * M - 20) / 3;
    let bx = M;
    const by = doc.y;
    boxes.forEach(([lab, val, sub]) => {
        doc.roundedRect(bx, by, bw, 66, 5).fill(ALT);
        doc.font('r').fontSize(8.5).fillColor(MUTED).text(lab.toUpperCase(), bx, by + 11, { width: bw, align: 'center' });
        doc.font('b').fontSize(18).fillColor(BRAND).text(val, bx, by + 25, { width: bw, align: 'center' });
        doc.font('r').fontSize(8).fillColor(MUTED).text(sub, bx, by + 48, { width: bw, align: 'center' });
        bx += bw + 10;
    });
    doc.y = by + 84;
}

// ---------------------------------------------------------------------------
// Document body
// ---------------------------------------------------------------------------
function build(internal) {
    const out = path.join(__dirname, '..',
        internal ? 'Onlive_Tariff_2026_INTERNAL.pdf' : 'Onlive_Tariff_2026.pdf');
    const doc = new PDFDocument({ size: 'A4', margin: M, bufferPages: true });
    doc.pipe(fs.createWriteStream(out));
    reg(doc);

    cover(doc, internal);

    // -- 1. THE CHART --------------------------------------------------------
    doc.addPage();
    h1(doc, '1.  Tariff Chart',
        `Base fee ${rs(BASE_FEE)}/month + ${rs(PER_BUS)} per bus/month. Same rate for every school, whatever the fleet size.`);
    table(doc,
        [
            { label: 'Buses', width: 10, align: 'center' },
            { label: 'Base fee', width: 15, align: 'right' },
            { label: 'Bus charges', width: 20, align: 'right' },
            { label: 'Monthly', width: 15, align: 'right' },
            { label: 'Monthly + GST', width: 17, align: 'right' },
            { label: 'Annual (prepaid)', width: 23, align: 'right' },
        ],
        BUS_COUNTS.map((n) => [
            String(n),
            rs(BASE_FEE),
            `${n} × ${rs(PER_BUS)} = ${rs(n * PER_BUS)}`,
            rs(monthlyFor(n)),
            rs(Math.round(monthlyFor(n) * (1 + GST))),
            rs(annualFor(n)),
        ]),
        { highlight: BUS_COUNTS.indexOf(10) }
    );
    note(doc,
        `All figures exclusive of GST except where stated; GST is charged at ${GST * 100}%. ` +
        `The annual column reflects the ${ANNUAL_DISCOUNT * 100}% prepayment discount (12 months paid in advance). ` +
        `There is no minimum commitment — you pay the base fee plus only the buses you actually run. ` +
        `Bus count is read from your live dashboard each billing cycle, so adding or removing a bus is ` +
        `reflected on the next invoice automatically.`);
    note(doc,
        `Worked example — a 10-bus school: ${rs(BASE_FEE)} base + (10 × ${rs(PER_BUS)}) = ` +
        `${rs(monthlyFor(10))} per month (${rs(Math.round(monthlyFor(10) * (1 + GST)))} with GST), ` +
        `or ${rs(annualFor(10))} prepaid for the year. For a 400-student school that is about ` +
        `${rs(Math.round(annualFor(10) / 400))} per student per year.`);
    note(doc,
        'Alternative — per-student billing: ₹10 per student per month (₹100 per student per year). ' +
        'Available on request where a school prefers to pass the cost through transport fees directly. ' +
        'A school is billed on the per-bus tariff or the per-student tariff, not both.');

    // -- 2. Included ---------------------------------------------------------
    doc.addPage();
    h1(doc, '2.  What Is Included', 'Everything. There are no plans, no packs and no locked features.');
    const colW = (doc.page.width - 2 * M) / 2;
    const startY = doc.y;
    INCLUDED.forEach((f, i) => {
        const col = i % 2;
        const rowIdx = Math.floor(i / 2);
        const y = startY + rowIdx * 21;
        const x = M + col * colW;
        doc.font('b').fontSize(10).fillColor(BRAND).text('✓', x, y, { width: 14, lineBreak: false });
        doc.font('r').fontSize(9.5).fillColor(INK).text(f, x + 15, y + 0.5, { width: colW - 20, lineBreak: false });
    });
    doc.y = startY + Math.ceil(INCLUDED.length / 2) * 21 + 14;
    note(doc,
        'Unlimited parent accounts, unlimited routes and stops, unlimited trips per day, and unlimited ' +
        'location history within the 90-day retention window. No per-seat charges.');

    // -- 3. One-time & annual ------------------------------------------------
    h1(doc, '3.  One-Time & Annual Charges', 'Billed separately from the monthly tariff. All amounts exclusive of GST.');
    table(doc,
        [
            { label: 'Item', width: 46 },
            { label: 'One-time', width: 24, align: 'right' },
            { label: 'Every year', width: 30, align: 'right' },
        ],
        CHARGES,
        { highlight: 3 }
    );
    note(doc,
        `Mobile apps: the Android app is ${rs(ANDROID_FEE)} + GST at setup and ${rs(ANDROID_FEE)} + GST every year ` +
        `thereafter. The iOS app is ${rs(IOS_FEE)} + GST at setup and ${rs(IOS_FEE)} + GST every year thereafter. ` +
        `The annual charge covers store listing renewal, OS compatibility updates, and republishing on each release. ` +
        `iOS costs more because Apple charges a mandatory annual developer fee and the app is removed from the App ` +
        `Store if it is not renewed. Schools may take Android only, iOS only, or both — the web app works on any ` +
        `phone browser at no extra charge.`);
    note(doc,
        'Onboarding covers route and stop mapping, bulk student import, staff training and go-live support. ' +
        'The annual platform licence (AMC) covers version upgrades, security patches and unlimited support tickets; ' +
        'it is optional in year one and renews each academic year.');

    // -- 4 & 5. Internal -----------------------------------------------------
    if (internal) {
        doc.addPage();
        h1(doc, '4.  Infrastructure Cost & Margin', 'INTERNAL — derived from the codebase audit, post-optimisation.');
        table(doc,
            [
                { label: 'Schools', width: 12, align: 'center' },
                { label: 'Buses', width: 11, align: 'center' },
                { label: 'Revenue / mo', width: 19, align: 'right' },
                { label: 'Infra / mo', width: 15, align: 'right' },
                { label: 'Razorpay 2.36%', width: 17, align: 'right' },
                { label: 'Net / mo', width: 16, align: 'right' },
                { label: 'Margin', width: 10, align: 'right' },
            ],
            SCALE_LADDER.map((r) => {
                const rev = r.schools * monthlyFor(r.busesEach);
                const rp = Math.round(rev * RAZORPAY_PCT);
                const net = rev - r.infra - rp;
                return [
                    String(r.schools), String(r.schools * r.busesEach), rs(rev), rs(r.infra), rs(rp), rs(net),
                    Math.round((net / rev) * 100) + '%',
                ];
            })
        );
        note(doc,
            'Assumes an average school of 10 buses with 300+ concurrent live viewers and ~1.75-hour trips. ' +
            'True marginal infrastructure cost is ₹20–40 per bus per month, so gross margin exceeds 90% from the ' +
            'fifth school onward. A single 10-bus school already covers the entire fixed platform cost of ~₹2,300/mo.');
        note(doc,
            'IMPORTANT — these infra figures assume three fixes are shipped: (a) add @@index([bus_id, timestamp]) ' +
            'to the Location model, (b) switch Socket.IO broadcasts from school-wide to per-bus rooms, and ' +
            '(c) throttle the web driver location emit to 3 seconds. Without them, a single 10-bus school with 300 ' +
            'viewers requires roughly 7.5 vCPU of Postgres and 158 GB/month of egress, and the margins above do not hold.');
        note(doc,
            `App fee margin — Android: we charge ${rs(ANDROID_FEE)}/yr against a one-time $25 (~₹2,100) Play Console ` +
            `fee that never renews, so year two onward is effectively all margin. iOS: we charge ${rs(IOS_FEE)}/yr ` +
            `against Apple's $99/yr (~₹8,400) recurring developer fee, leaving ~₹3,600/yr per school. Both cover ` +
            `real rebuild and resubmission effort on each OS release.`);

        h1(doc, '5.  Platform Annual Overhead', 'INTERNAL — fixed costs Onlive carries regardless of school count.');
        table(doc,
            [
                { label: 'Item', width: 34 },
                { label: 'One-time', width: 22, align: 'right' },
                { label: 'Renewal', width: 44, align: 'right' },
            ],
            PLATFORM_OVERHEAD
        );
        note(doc,
            'Total fixed annual overhead: about ₹3,300 in year one for Android only (Play Console is a one-time $25 ' +
            'fee that never renews), then ~₹1,200/yr. Adding iOS raises it by $99/yr, which does renew — the app is ' +
            'delisted if it lapses. Play Store note: school transport is a real-world service and is therefore exempt ' +
            'from mandatory Play Billing, so collecting fees via Razorpay is compliant.');
    }

    // -- Terms ---------------------------------------------------------------
    const n = internal ? 6 : 4;
    room(doc, 200);
    h1(doc, `${n}.  Billing Terms`);
    const terms = [
        `All amounts are in Indian Rupees and exclusive of GST. GST is charged at the prevailing rate (currently ${GST * 100}%).`,
        'The monthly tariff is billed in arrears. Invoices are raised five days before the due date.',
        'Bus counts are taken from your live dashboard at the time the invoice is generated.',
        'Payment is due on your nominated billing day. A grace period of 7 days applies, after which a late fee of 2% per month accrues on the outstanding amount.',
        'There is no minimum monthly commitment. The bill is the base fee plus the number of buses in service that cycle.',
        `Annual prepayment attracts a ${ANNUAL_DISCOUNT * 100}% discount and is non-refundable on early termination.`,
        `Mobile app charges (Android ${rs(ANDROID_FEE)}, iOS ${rs(IOS_FEE)}, each plus GST) are payable at setup and again on each anniversary. Non-renewal results in the app being removed from the store; the web app remains available.`,
        'Online fee collection from parents runs on the school\'s own Razorpay account; gateway charges (approx. 2% plus GST) are levied by Razorpay directly and are not part of this tariff.',
        'Location history is retained for 90 days. Longer retention is available as a paid add-on.',
        'Either party may terminate with 30 days\' written notice. Data is exported on request within 14 days of termination.',
        'Onlive may revise this tariff with 60 days\' notice. Prices are held for the duration of any prepaid annual term.',
    ];
    const tw = doc.page.width - 2 * M - 18;
    terms.forEach((t, i) => {
        const h = doc.font('r').fontSize(9).heightOfString(t, { width: tw, lineGap: 1.5 });
        room(doc, h + 8);
        const y = doc.y;
        doc.font('sb').fontSize(9).fillColor(BRAND).text(`${i + 1}.`, M, y, { width: 16, lineBreak: false });
        doc.font('r').fontSize(9).fillColor(INK).text(t, M + 18, y, { width: tw, lineGap: 1.5 });
        doc.y = y + h + 6;
    });

    // -- Footers -------------------------------------------------------------
    // Zero the bottom margin first: text drawn below it pushes doc.y past the
    // page end, and PDFKit responds by appending a fresh page — one per footer.
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
        doc.switchToPage(i);
        doc.page.margins.bottom = 0;
        const y = doc.page.height - 38;
        doc.moveTo(M, y - 8).lineTo(doc.page.width - M, y - 8).lineWidth(0.5).strokeColor(RULE).stroke();
        doc.font('r').fontSize(7.5).fillColor(MUTED)
            .text(`Onlive  ·  Tariff Schedule ${VERSION}  ·  Effective ${EFFECTIVE}` +
                (internal ? '  ·  INTERNAL' : ''), M, y, { lineBreak: false });
        doc.text(`${i + 1} / ${range.count}`, doc.page.width - M - 60, y, { width: 60, align: 'right', lineBreak: false });
    }

    doc.flushPages();
    doc.end();
    return out;
}

const a = build(false);
const b = build(true);
console.log('Wrote:\n  ' + a + '\n  ' + b);
