const prisma = require('../prisma');
const { decrypt } = require('../utils/encryption');
const Razorpay = require('razorpay');
const crypto = require('crypto');

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function getMonthRange(billing_month) {
  const [year, month] = billing_month.split('-').map(Number);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1);
  return { monthStart, monthEnd };
}

async function getRazorpayInstance() {
  const config = await prisma.platformConfig.findUnique({ where: { id: 'singleton' } });
  let key_id, key_secret;
  if (config && config.razorpay_configured && config.razorpay_key_id && config.razorpay_key_secret) {
    key_id = decrypt(config.razorpay_key_id);
    key_secret = decrypt(config.razorpay_key_secret);
  } else {
    key_id = process.env.RAZORPAY_KEY_ID;
    key_secret = process.env.RAZORPAY_KEY_SECRET;
  }
  return new Razorpay({ key_id, key_secret });
}

async function computeInvoiceForSchool(school_id, billing_month) {
  const { monthStart, monthEnd } = getMonthRange(billing_month);

  const school = await prisma.school.findUnique({
    where: { id: school_id },
    select: { id: true, name: true, plan_id: true, billing_due_day: true },
  });
  if (!school || !school.plan_id) {
    throw new Error('School has no pricing plan assigned');
  }

  const plan = await prisma.pricingPlan.findUnique({
    where: { id: school.plan_id },
    include: { lineItems: true },
  });
  if (!plan) throw new Error('Pricing plan not found');

  const [bus_count, student_count, route_count, shift_count] = await Promise.all([
    prisma.bus.count({ where: { school_id } }),
    prisma.student.count({ where: { school_id } }),
    prisma.route.count({ where: { school_id } }),
    prisma.driverShift.count({
      where: { school_id, date: { gte: monthStart, lt: monthEnd } },
    }),
  ]);

  const completedTrips = await prisma.activeTrip.findMany({
    where: {
      school_id,
      status: 'completed',
      started_at: { gte: monthStart, lt: monthEnd },
      completed_at: { not: null },
    },
    select: { started_at: true, completed_at: true },
  });
  let gps_hours = 0;
  for (const trip of completedTrips) {
    const ms = new Date(trip.completed_at) - new Date(trip.started_at);
    gps_hours += ms / 3600000;
  }

  const shiftsInMonth = await prisma.driverShift.findMany({
    where: { school_id, date: { gte: monthStart, lt: monthEnd } },
    select: { id: true },
  });
  const shiftIds = shiftsInMonth.map(s => s.id);
  let total_km = 0;
  if (shiftIds.length > 0) {
    const kmEntries = await prisma.shiftKmEntry.findMany({
      where: { shift_id: { in: shiftIds } },
      select: { km_reading: true },
    });
    if (kmEntries.length > 0) {
      const readings = kmEntries.map(e => e.km_reading);
      total_km = Math.max(...readings) - Math.min(...readings);
      if (total_km < 0) total_km = 0;
    }
  }

  const usage = { bus_count, student_count, route_count, gps_hours, total_km, shift_count };

  // expense / profit rows are never their own line — the profit target is folded into the
  // billable rates below so the school sees one inclusive price.
  const { splitPlanItems, applyProfitTarget } = require('../utils/planPricing');
  const { billableItems, profitTarget } = splitPlanItems(plan.lineItems);

  const rawLineItems = billableItems.map(item => {
    let quantity = 0;
    switch (item.metric) {
      case 'fixed':        quantity = 1; break;
      case 'per_bus':      quantity = bus_count; break;
      case 'per_student':  quantity = student_count; break;
      case 'per_route':    quantity = route_count; break;
      case 'per_gps_hour': quantity = gps_hours; break;
      case 'per_km':       quantity = total_km; break;
      case 'per_shift':    quantity = shift_count; break;
      case 'custom':       quantity = 1; break;
      default:             quantity = 1;
    }
    let charge = quantity * item.unit_rate;
    if (item.min_value !== null && item.min_value !== undefined && charge < item.min_value) {
      charge = item.min_value;
    }
    return {
      label: item.label,
      description: item.description,
      metric: item.metric,
      unit_rate: item.unit_rate,
      quantity,
      charge,
      is_mandatory: item.is_mandatory,
      min_value: item.min_value,
    };
  });

  const lineItemsCalc = applyProfitTarget(rawLineItems, profitTarget);
  const subtotal = lineItemsCalc.reduce((sum, i) => sum + i.charge, 0);

  const billingConfig = await prisma.billingConfig.findUnique({ where: { id: 'singleton' } });
  const graceDays = billingConfig ? billingConfig.overdue_grace_days : 7;
  const overdueRateType = billingConfig ? billingConfig.overdue_rate_type : 'percentage';
  const overdueRate = billingConfig ? billingConfig.overdue_rate : 2;

  const unpaidInvoices = await prisma.schoolInvoice.findMany({
    where: { school_id, status: { not: 'paid' } },
    select: { id: true, due_date: true, total_amount: true },
  });

  let overdue_amount = 0;
  for (const inv of unpaidInvoices) {
    const daysOverdue = Math.floor((Date.now() - new Date(inv.due_date)) / (24 * 3600 * 1000));
    if (daysOverdue > graceDays) {
      const penalty = overdueRateType === 'percentage'
        ? inv.total_amount * (overdueRate / 100)
        : overdueRate;
      overdue_amount += penalty;
    }
  }

  const total_amount = subtotal + overdue_amount;

  const billingCycleDay = billingConfig ? billingConfig.billing_cycle_day : 1;
  const [year, month] = billing_month.split('-').map(Number);
  const due_date = school.billing_due_day
    ? new Date(year, month - 1, Math.min(school.billing_due_day, 28))
    : new Date(year, month - 1 + 1, billingCycleDay);

  const snapshot = { usage, line_items: lineItemsCalc, plan_name: plan.name };

  return { school, plan, subtotal, overdue_amount, total_amount, due_date, snapshot };
}

// ─── SA PRICING PLANS ─────────────────────────────────────────────────────────

const listPlans = async (req, res) => {
  try {
    const plans = await prisma.pricingPlan.findMany({
      include: { lineItems: true },
      orderBy: { created_at: 'desc' },
    });
    res.json(plans);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching plans' });
  }
};

const createPlan = async (req, res) => {
  try {
    const { name, description, is_template, plan_type, permissions, lineItems = [] } = req.body;
    const plan = await prisma.$transaction(async (tx) => {
      const created = await tx.pricingPlan.create({
        data: {
          name,
          description,
          plan_type: plan_type === 'individual' ? 'individual' : 'school',
          is_template: is_template ?? true,
          permissions: permissions && typeof permissions === 'object' ? permissions : undefined,
          created_by: req.user.id,
          lineItems: {
            create: lineItems.map(item => ({
              label: item.label,
              description: item.description,
              metric: item.metric,
              unit_rate: item.unit_rate,
              is_mandatory: item.is_mandatory ?? true,
              min_value: item.min_value ?? null,
            })),
          },
        },
        include: { lineItems: true },
      });
      return created;
    });
    res.status(201).json(plan);
  } catch (err) {
    res.status(500).json({ error: 'Error creating plan' });
  }
};

const updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, is_template, plan_type, permissions, lineItems = [] } = req.body;
    const plan = await prisma.$transaction(async (tx) => {
      await tx.pricingLineItem.deleteMany({ where: { plan_id: id } });
      const updated = await tx.pricingPlan.update({
        where: { id },
        data: {
          name,
          description,
          is_template,
          ...(plan_type ? { plan_type: plan_type === 'individual' ? 'individual' : 'school' } : {}),
          ...(permissions && typeof permissions === 'object' ? { permissions } : {}),
          lineItems: {
            createMany: {
              data: lineItems.map(item => ({
                label: item.label,
                description: item.description,
                metric: item.metric,
                unit_rate: item.unit_rate,
                is_mandatory: item.is_mandatory ?? true,
                min_value: item.min_value ?? null,
              })),
            },
          },
        },
        include: { lineItems: true },
      });
      return updated;
    });
    res.json(plan);
  } catch (err) {
    res.status(500).json({ error: 'Error updating plan' });
  }
};

const deletePlan = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.$transaction(async (tx) => {
      await tx.pricingLineItem.deleteMany({ where: { plan_id: id } });
      await tx.pricingPlan.delete({ where: { id } });
    });
    res.json({ message: 'Plan deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Error deleting plan' });
  }
};

// ─── SA INVOICE MANAGEMENT ────────────────────────────────────────────────────

const generateInvoice = async (req, res) => {
  try {
    const { school_id, billing_month } = req.body;
    // Guard against generating a duplicate invoice for the same school + month.
    const existing = await prisma.schoolInvoice.findFirst({
      where: { school_id, billing_month }, select: { id: true },
    });
    if (existing) return res.status(400).json({ error: `An invoice for ${billing_month} already exists for this school.` });
    const { generateInvoiceForSchool } = require('../utils/invoiceGenerator');
    const invoice = await generateInvoiceForSchool(school_id, billing_month).catch(err => {
      throw Object.assign(err, { isClientError: true });
    });
    res.status(201).json(invoice);
  } catch (err) {
    if (err.isClientError) return res.status(400).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: 'Error generating invoice' });
  }
};

const generateAllInvoices = async (req, res) => {
  try {
    const now = new Date();
    const billing_month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const schools = await prisma.school.findMany({
      where: { status: 'active', plan_id: { not: null } },
      select: { id: true },
    });

    const { generateInvoiceForSchool } = require('../utils/invoiceGenerator');
    let generated = 0;
    const errors = [];

    for (const school of schools) {
      try {
        await generateInvoiceForSchool(school.id, billing_month);
        generated++;
      } catch (err) {
        errors.push({ school_id: school.id, error: err.message });
      }
    }

    res.json({ generated, errors });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error generating invoices' });
  }
};

const listInvoices = async (req, res) => {
  try {
    const { school_id, month, status } = req.query;
    const where = {};
    if (school_id) where.school_id = school_id;
    if (month) where.billing_month = month;
    if (status) where.status = status;

    const invoices = await prisma.schoolInvoice.findMany({
      where,
      include: { school: { select: { id: true, name: true } } },
      orderBy: { created_at: 'desc' },
    });
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching invoices' });
  }
};

const getInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await prisma.schoolInvoice.findUnique({
      where: { id },
      include: { school: { select: { id: true, name: true } } },
    });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching invoice' });
  }
};

const payInvoiceCash = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;
    const invoice = await prisma.schoolInvoice.update({
      where: { id },
      data: {
        status: 'paid',
        payment_method: 'cash',
        paid_at: new Date(),
      },
    });
    // Re-render so the stored PDF no longer says PENDING.
    const { refreshInvoicePdf } = require('../utils/invoicePdf');
    invoice.pdf_url = (await refreshInvoicePdf(id, 'school')) || invoice.pdf_url;
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: 'Error processing cash payment' });
  }
};

// Resolve the platform Razorpay key_id (publishable — safe to hand to the browser, it is what
// Razorpay Checkout needs to open). Returns null when the platform account isn't configured.
const getPlatformKeyId = async () => {
  const config = await prisma.platformConfig.findUnique({ where: { id: 'singleton' } });
  if (config?.razorpay_configured && config.razorpay_key_id) {
    try { return decrypt(config.razorpay_key_id); } catch { /* fall through to env */ }
  }
  return process.env.RAZORPAY_KEY_ID || null;
};

// The platform key_secret, used to verify the checkout callback signature.
const getPlatformKeySecret = async () => {
  const config = await prisma.platformConfig.findUnique({ where: { id: 'singleton' } });
  if (config?.razorpay_configured && config.razorpay_key_secret) {
    try { return decrypt(config.razorpay_key_secret); } catch { /* fall through to env */ }
  }
  return process.env.RAZORPAY_KEY_SECRET || null;
};

/**
 * Razorpay returns a signature as HMAC_SHA256(order_id + "|" + payment_id, key_secret).
 * timingSafeEqual avoids leaking information through comparison timing.
 */
const isValidPaymentSignature = (orderId, paymentId, signature, keySecret) => {
  if (!orderId || !paymentId || !signature || !keySecret) return false;
  const expected = crypto
    .createHmac('sha256', keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(String(signature), 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const createInvoiceOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await prisma.schoolInvoice.findUnique({ where: { id } });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    // A school admin may only pay their own school's invoice; super admins may pay any.
    if (req.user.role !== 'super_admin' && invoice.school_id !== req.user.school_id) {
      return res.status(403).json({ error: 'Not allowed to pay this invoice' });
    }
    if (invoice.status === 'paid') return res.status(400).json({ error: 'Invoice already paid' });

    const key_id = await getPlatformKeyId();
    if (!key_id) return res.status(400).json({ error: 'Platform Razorpay is not configured' });

    const razorpay = await getRazorpayInstance();
    const order = await razorpay.orders.create({
      amount: Math.round(invoice.total_amount * 100),
      currency: 'INR',
      receipt: `inv_${invoice.id}`,
      notes: { invoice_id: invoice.id, school_id: invoice.school_id },
    });

    await prisma.schoolInvoice.update({
      where: { id },
      data: { razorpay_order_id: order.id },
    });

    // key_id must be returned — Checkout can't open without it, and there is no other API
    // that exposes it to the browser.
    res.json({ order, invoice_id: invoice.id, key_id });
  } catch (err) {
    console.error('createInvoiceOrder error:', err);
    res.status(500).json({ error: 'Error creating Razorpay order' });
  }
};

/**
 * Confirm a school invoice payment from the Checkout callback.
 * This is the PRIMARY confirmation path — previously these orders had no verification
 * endpoint at all and relied solely on a webhook that could never fire, so schools could pay
 * and the invoice would stay unpaid. Idempotent: re-verifying an already-paid invoice is a no-op.
 */
const verifyInvoicePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};

    const invoice = await prisma.schoolInvoice.findUnique({ where: { id } });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    if (req.user.role !== 'super_admin' && invoice.school_id !== req.user.school_id) {
      return res.status(403).json({ error: 'Not allowed' });
    }
    if (invoice.status === 'paid') return res.json({ ok: true, already_paid: true });

    // The order must be the one we created for THIS invoice.
    if (!razorpay_order_id || razorpay_order_id !== invoice.razorpay_order_id) {
      return res.status(400).json({ error: 'Order does not match this invoice' });
    }

    const keySecret = await getPlatformKeySecret();
    if (!isValidPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature, keySecret)) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    await markSchoolInvoicePaid(invoice, razorpay_payment_id);
    res.json({ ok: true });
  } catch (err) {
    console.error('verifyInvoicePayment error:', err);
    res.status(500).json({ error: 'Error verifying payment' });
  }
};

/** Same, for an individual (per-student) invoice. */
const verifyStudentInvoicePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};

    const invoice = await prisma.studentInvoice.findUnique({ where: { id } });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    if (invoice.status === 'paid') return res.json({ ok: true, already_paid: true });

    if (!razorpay_order_id || razorpay_order_id !== invoice.razorpay_order_id) {
      return res.status(400).json({ error: 'Order does not match this invoice' });
    }

    const keySecret = await getPlatformKeySecret();
    if (!isValidPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature, keySecret)) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    await prisma.studentInvoice.update({
      where: { id: invoice.id },
      data: {
        status: 'paid',
        payment_method: 'razorpay',
        razorpay_payment_id,
        paid_at: new Date(),
      },
    });
    // Re-render so the stored PDF reflects the payment instead of still saying PENDING.
    const { refreshInvoicePdf } = require('../utils/invoicePdf');
    await refreshInvoicePdf(invoice.id, 'student');
    res.json({ ok: true });
  } catch (err) {
    console.error('verifyStudentInvoicePayment error:', err);
    res.status(500).json({ error: 'Error verifying payment' });
  }
};

/**
 * Mark a school invoice paid and record any overdue penalty. Shared by the checkout-callback
 * verify path and the webhook so both stay consistent; guarded so a duplicate delivery is a no-op.
 */
const markSchoolInvoicePaid = async (invoice, paymentId) => {
  if (!invoice || invoice.status === 'paid') return;
  await prisma.schoolInvoice.update({
    where: { id: invoice.id },
    data: {
      status: 'paid',
      payment_method: 'razorpay',
      razorpay_payment_id: paymentId,
      paid_at: new Date(),
    },
  });

  // The stored PDF was rendered at creation time with "PENDING" baked in — re-render it so the
  // downloaded/emailed copy reflects the payment. Best-effort; never blocks the payment.
  const { refreshInvoicePdf } = require('../utils/invoicePdf');
  await refreshInvoicePdf(invoice.id, 'school');

  if (invoice.overdue_amount > 0) {
    const billingConfig = await prisma.billingConfig.findUnique({ where: { id: 'singleton' } });
    const months_overdue = Math.floor(
      (Date.now() - new Date(invoice.due_date)) / (30 * 24 * 3600 * 1000)
    );
    await prisma.overdueRecord.create({
      data: {
        invoice_id: invoice.id,
        school_id: invoice.school_id,
        months_overdue,
        penalty_rate: billingConfig ? billingConfig.overdue_rate : 2,
        penalty_amount: invoice.overdue_amount,
      },
    });
  }
};

const handleInvoiceWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];

    // Razorpay's webhook secret is configured per-webhook in their dashboard and is NOT the
    // API key secret. Prefer the dedicated env var; fall back to the key secret for setups
    // where the same value was used.
    let webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      const config = await prisma.platformConfig.findUnique({ where: { id: 'singleton' } });
      if (config?.razorpay_configured && config.razorpay_key_secret) {
        try { webhookSecret = decrypt(config.razorpay_key_secret); } catch { /* ignore */ }
      }
      webhookSecret = webhookSecret || process.env.RAZORPAY_KEY_SECRET;
    }

    // Without a secret, HMAC verification is meaningless — reject rather than risk accepting
    // a forged/unverifiable signature.
    if (!webhookSecret) {
      console.error('handleInvoiceWebhook: no Razorpay webhook secret configured');
      return res.status(400).json({ error: 'Webhook secret not configured' });
    }

    // Verify against the RAW bytes Razorpay signed, not a re-serialised copy of the parsed body.
    const payload = req.rawBody || Buffer.from(JSON.stringify(req.body));
    const expected = crypto.createHmac('sha256', webhookSecret).update(payload).digest('hex');
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(String(signature || ''), 'utf8');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    if (req.body.event === 'payment.captured') {
      const payment = req.body.payload?.payment?.entity;
      const order_id = payment?.order_id;
      const payment_id = payment?.id;

      if (order_id) {
        // The same webhook serves school invoices and individual student invoices — look in both.
        // (Student invoices were previously ignored entirely, so an online student payment could
        // never be recorded.) Both paths are idempotent, so Razorpay's retries are harmless.
        const invoice = await prisma.schoolInvoice.findFirst({ where: { razorpay_order_id: order_id } });
        if (invoice) {
          await markSchoolInvoicePaid(invoice, payment_id);
        } else {
          const studentInvoice = await prisma.studentInvoice.findFirst({ where: { razorpay_order_id: order_id } });
          if (studentInvoice && studentInvoice.status !== 'paid') {
            await prisma.studentInvoice.update({
              where: { id: studentInvoice.id },
              data: {
                status: 'paid',
                payment_method: 'razorpay',
                razorpay_payment_id: payment_id,
                paid_at: new Date(),
              },
            });
            const { refreshInvoicePdf } = require('../utils/invoicePdf');
            await refreshInvoicePdf(studentInvoice.id, 'student');
          }
        }
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('handleInvoiceWebhook error:', err);
    res.status(500).json({ error: 'Webhook processing error' });
  }
};

const updateBillingConfig = async (req, res) => {
  try {
    const { overdue_grace_days, overdue_rate_type, overdue_rate, billing_cycle_day, individual_billing_days } = req.body;
    const data = {};
    // Clamp to >= 0 so a mistaken negative can't turn a late fee into a discount.
    if (overdue_grace_days !== undefined) data.overdue_grace_days = Math.max(0, Number(overdue_grace_days) || 0);
    if (overdue_rate_type !== undefined) data.overdue_rate_type = overdue_rate_type;
    if (overdue_rate !== undefined) data.overdue_rate = Math.max(0, Number(overdue_rate) || 0);
    if (billing_cycle_day !== undefined) data.billing_cycle_day = Math.min(Math.max(Number(billing_cycle_day) || 1, 1), 28);
    if (individual_billing_days !== undefined) {
      const d = parseInt(individual_billing_days, 10);
      if (Number.isFinite(d) && d > 0) data.individual_billing_days = d;
    }

    const config = await prisma.billingConfig.upsert({
      where: { id: 'singleton' },
      update: data,
      create: { id: 'singleton', ...data },
    });
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: 'Error updating billing config' });
  }
};

const getBillingConfig = async (req, res) => {
  try {
    const config = await prisma.billingConfig.findUnique({ where: { id: 'singleton' } });
    res.json(config || {});
  } catch (err) {
    res.status(500).json({ error: 'Error fetching billing config' });
  }
};

const getRevenueDashboard = async (req, res) => {
  try {
    const [allInvoices, activeSchools, studentInvoices] = await Promise.all([
      prisma.schoolInvoice.findMany({
        include: { school: { select: { id: true, name: true, plan_id: true } } },
      }),
      prisma.school.count({ where: { status: 'active' } }),
      // Individual (per-student) invoices count toward platform revenue too.
      prisma.studentInvoice.findMany({
        select: { billing_month: true, subtotal: true, total_amount: true, status: true },
      }).catch(() => []),
    ]);

    const sumPaid = (arr) => arr.filter(i => i.status === 'paid').reduce((s, i) => s + i.total_amount, 0);
    const sumOverdue = (arr) => arr.filter(i => i.status === 'overdue').reduce((s, i) => s + i.total_amount, 0);

    const total_billed = allInvoices.reduce((sum, inv) => sum + inv.subtotal, 0)
      + studentInvoices.reduce((s, i) => s + i.subtotal, 0);
    const total_collected = sumPaid(allInvoices) + sumPaid(studentInvoices);
    const total_overdue = sumOverdue(allInvoices) + sumOverdue(studentInvoices);

    const schoolsWithPlans = await prisma.school.findMany({
      where: { status: 'active' },
      select: {
        id: true,
        name: true,
        plan_id: true,
        pricingPlan: { select: { name: true } },
        _count: { select: { buses: true, students: true } },
      },
    });

    const schoolInvoiceMap = {};
    for (const inv of allInvoices) {
      if (!schoolInvoiceMap[inv.school_id]) schoolInvoiceMap[inv.school_id] = [];
      schoolInvoiceMap[inv.school_id].push(inv);
    }

    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const per_school = schoolsWithPlans.map(school => {
      const invoices = schoolInvoiceMap[school.id] || [];
      const thisMonthInv = invoices.find(inv => inv.billing_month === thisMonth);
      return {
        school_id: school.id,
        name: school.name,
        plan_name: school.pricingPlan ? school.pricingPlan.name : null,
        bus_count: school._count.buses,
        student_count: school._count.students,
        this_month_amount: thisMonthInv ? thisMonthInv.total_amount : 0,
        status: thisMonthInv ? thisMonthInv.status : 'no_invoice',
      };
    });

    const monthly_revenue = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthInvoices = allInvoices.filter(inv => inv.billing_month === month);
      const monthStudent = studentInvoices.filter(inv => inv.billing_month === month);
      monthly_revenue.push({
        month,
        billed: monthInvoices.reduce((sum, inv) => sum + inv.subtotal, 0)
          + monthStudent.reduce((s, i) => s + i.subtotal, 0),
        collected: sumPaid(monthInvoices) + sumPaid(monthStudent),
      });
    }

    res.json({
      total_billed,
      total_collected,
      total_overdue,
      active_schools: activeSchools,
      per_school,
      monthly_revenue,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching revenue dashboard' });
  }
};

// ─── SA → ASSIGN PLAN ─────────────────────────────────────────────────────────

const assignPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { plan_id } = req.body;

    // When the assigned plan carries a permissions set, merge it into the school's
    // permissions so the feature toggles the plan grants are actually enforced (all
    // existing gating reads School.permissions). Keys the plan doesn't define are kept.
    let mergedPermissions;
    if (plan_id) {
      const plan = await prisma.pricingPlan.findUnique({
        where: { id: plan_id }, select: { permissions: true },
      });
      if (plan?.permissions && typeof plan.permissions === 'object') {
        const current = await prisma.school.findUnique({
          where: { id }, select: { permissions: true },
        });
        mergedPermissions = { ...(current?.permissions || {}), ...plan.permissions };
      }
    }

    const school = await prisma.school.update({
      where: { id },
      data: { plan_id, ...(mergedPermissions ? { permissions: mergedPermissions } : {}) },
    });
    res.json(school);
  } catch (err) {
    res.status(500).json({ error: 'Error assigning plan to school' });
  }
};

// ─── SCHOOL ADMIN — OWN INVOICES ──────────────────────────────────────────────

const getMyInvoices = async (req, res) => {
  try {
    const school_id = req.user.school_id;
    const invoices = await prisma.schoolInvoice.findMany({
      where: { school_id },
      orderBy: { created_at: 'desc' },
    });
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching invoices' });
  }
};

// ─── PLATFORM RAZORPAY KEYS ───────────────────────────────────────────────────

const updatePlatformRazorpay = async (req, res) => {
  try {
    const { key_id, key_secret } = req.body;
    if (!key_id || !key_secret) {
      return res.status(400).json({ error: 'key_id and key_secret are required' });
    }
    const { encrypt } = require('../utils/encryption');
    await prisma.platformConfig.upsert({
      where: { id: 'singleton' },
      create: {
        id: 'singleton',
        razorpay_key_id: encrypt(key_id),
        razorpay_key_secret: encrypt(key_secret),
        razorpay_configured: true,
      },
      update: {
        razorpay_key_id: encrypt(key_id),
        razorpay_key_secret: encrypt(key_secret),
        razorpay_configured: true,
      },
    });
    res.json({ message: 'Platform Razorpay keys saved' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error saving keys' });
  }
};

const getPlatformRazorpayStatus = async (req, res) => {
  try {
    const config = await prisma.platformConfig.findUnique({ where: { id: 'singleton' } });

    // Keys can come from EITHER the saved (encrypted) config row OR the environment —
    // getRazorpayInstance falls back to env, so env-only setups are fully functional.
    // Reporting only the DB flag made a working env-based setup read "Not configured".
    const savedInDb = !!(config?.razorpay_configured && config.razorpay_key_id && config.razorpay_key_secret);
    const inEnv = !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

    // Which Razorpay environment the active key belongs to, so the UI can warn that real money
    // moves. Only the mode leaves the server — never the key or secret.
    let mode = 'unknown';
    const keyId = await getPlatformKeyId();
    if (keyId?.startsWith('rzp_live_')) mode = 'live';
    else if (keyId?.startsWith('rzp_test_')) mode = 'test';

    res.json({
      configured: savedInDb || inEnv,
      // 'saved' = entered here and encrypted; 'env' = from the host's environment variables.
      source: savedInDb ? 'saved' : inEnv ? 'env' : 'none',
      mode,
      // Surfaced so a missing webhook secret is visible here instead of only showing up as
      // failed deliveries in the Razorpay dashboard.
      webhook_secret_set: !!process.env.RAZORPAY_WEBHOOK_SECRET,
    });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching config' });
  }
};

// ─── PLATFORM USAGE (for expenses page) ──────────────────────────────────────

const getPlatformUsage = async (req, res) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Each query is independent — a missing table won't crash the whole response.
    // NOTE: EmailLog timestamps the send in `sent_at` (not `created_at`); filtering the
    // wrong column silently returned 0 here, so emails appeared untracked.
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Each query is independent — a missing table won't crash the whole response.
    const [emailBySchoolStatus, paidBySchool, schools, locationsBySchool, emailsToday] = await Promise.all([
      prisma.emailLog.groupBy({
        by: ['school_id', 'status'],
        where: { sent_at: { gte: monthStart, lt: monthEnd } },
        _count: { _all: true },
      }).catch(() => []),
      prisma.schoolInvoice.groupBy({
        by: ['school_id'],
        where: { paid_at: { gte: monthStart, lt: monthEnd }, status: 'paid' },
        _sum: { total_amount: true },
      }).catch(() => []),
      prisma.school.findMany({
        select: { id: true, name: true, _count: { select: { buses: true, students: true } } },
      }).catch(() => []),
      // Neon usage is dominated by the append-only Location table, so count it for
      // real rather than inferring it from bus/student counts. The previous estimate
      // (busCount * 0.1 MB) had no time dimension at all: it reported a flat ~53 MB
      // for a 10-bus school that in fact accumulates ~185 MB every month and never
      // purges, so the gauge read "Safe" right up to the point Neon's 512 MB cap blew.
      prisma.location.groupBy({ by: ['school_id'], _count: { _all: true } }).catch(() => []),
      // Resend's free tier caps at 100/day as well as 3,000/month. The daily limit
      // binds first and was not surfaced anywhere.
      prisma.emailLog.count({ where: { sent_at: { gte: dayStart } } }).catch(() => 0),
    ]);

    const studentCount = schools.reduce((s, sc) => s + (sc._count?.students || 0), 0);
    const busCount = schools.reduce((s, sc) => s + (sc._count?.buses || 0), 0);

    // Email sent/failed per school (school_id null = platform/system emails).
    const emailMap = new Map();
    let totalEmails = 0;
    for (const r of emailBySchoolStatus) {
      const key = r.school_id || 'platform';
      if (!emailMap.has(key)) emailMap.set(key, { sent: 0, failed: 0 });
      const e = emailMap.get(key);
      if (r.status === 'failed') e.failed += r._count._all; else e.sent += r._count._all;
      totalEmails += r._count._all;
    }
    const paidMap = new Map(paidBySchool.map(r => [r.school_id, r._sum.total_amount || 0]));

    const razorpay_fees = paidBySchool.reduce((sum, r) => sum + (r._sum.total_amount || 0) * 0.02, 0);

    // ~200 B per Location row all-in: 2 UUIDs as text, 3 float8, 1 timestamptz,
    // tuple header, and the primary-key btree entry.
    const BYTES_PER_LOCATION_ROW = 200;
    const BASE_SCHEMA_MB = 50; // every other table combined
    const locationRowMap = new Map(locationsBySchool.map(r => [r.school_id, r._count._all]));
    const locationRows = locationsBySchool.reduce((s, r) => s + r._count._all, 0);
    const toMb = (rows) => (rows * BYTES_PER_LOCATION_ROW) / (1024 * 1024);

    const neon_estimated_mb = Math.round(
      BASE_SCHEMA_MB + toMb(locationRows) + studentCount * 0.005
    );
    const imagekit_used_gb = parseFloat((busCount * 0.002 + studentCount * 0.0005 + 0.5).toFixed(2));

    // Per-school usage table: one row per school with every integration as a column.
    // ImageKit storage/bandwidth + Neon are estimated from the school's bus + student footprint.
    const schools_usage = schools.map(s => {
      const e = emailMap.get(s.id) || { sent: 0, failed: 0 };
      return {
        school_id: s.id,
        name: s.name,
        resend_sent: e.sent,
        resend_failed: e.failed,
        imagekit_storage_gb: parseFloat(((s._count.buses * 0.002) + (s._count.students * 0.0005)).toFixed(3)),
        imagekit_bandwidth_gb: parseFloat(((s._count.buses * 0.004) + (s._count.students * 0.001)).toFixed(3)),
        razorpay_fees: Math.round((paidMap.get(s.id) || 0) * 0.02),
        location_rows: locationRowMap.get(s.id) || 0,
        neon_mb: Math.round(toMb(locationRowMap.get(s.id) || 0) + s._count.students * 0.005),
      };
    });
    schools_usage.sort((a, b) =>
      (b.resend_sent + b.resend_failed + b.razorpay_fees) - (a.resend_sent + a.resend_failed + a.razorpay_fees));
    const platformEmail = emailMap.get('platform');
    if (platformEmail && (platformEmail.sent || platformEmail.failed)) {
      schools_usage.unshift({
        school_id: null, name: 'Platform / System',
        resend_sent: platformEmail.sent, resend_failed: platformEmail.failed,
        imagekit_storage_gb: 0, imagekit_bandwidth_gb: 0, razorpay_fees: 0,
        location_rows: 0, neon_mb: 0,
      });
    }

    res.json({
      resend: {
        used: totalEmails, limit: 3000, unit: 'emails',
        used_today: emailsToday, daily_limit: 100,
      },
      imagekit: { used_gb: imagekit_used_gb, limit_gb: 20, unit: 'GB' },
      razorpay: { fees_this_month: Math.round(razorpay_fees), unit: '₹' },
      neon: {
        estimated_mb: neon_estimated_mb, unit: 'MB', limit_mb: 512,
        location_rows: locationRows,
        // Location is append-only; locationRetentionJob purges past this window nightly.
        // Surfaced so the card can say whether the figure is a steady state or still climbing.
        retention_days: parseInt(process.env.LOCATION_RETENTION_DAYS || '90', 10),
      },
      schools_usage,
    });
  } catch (err) {
    console.error('getPlatformUsage error:', err);
    res.status(500).json({ error: 'Error fetching platform usage' });
  }
};

// ─── MANUAL EXPENSES ──────────────────────────────────────────────────────────

const listManualExpenses = async (req, res) => {
  try {
    const expenses = await prisma.manualExpense.findMany({
      orderBy: { month: 'desc' },
    });
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching expenses' });
  }
};

const createManualExpense = async (req, res) => {
  try {
    const { label, category, amount, month, notes } = req.body;
    if (!label || !amount || !month) {
      return res.status(400).json({ error: 'label, amount, and month are required' });
    }
    const expense = await prisma.manualExpense.create({
      data: {
        label,
        category: category || 'misc',
        amount: parseFloat(amount),
        month,
        notes: notes || null,
      },
    });
    res.status(201).json(expense);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creating expense' });
  }
};

const deleteManualExpense = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.manualExpense.delete({ where: { id } });
    res.json({ message: 'Expense deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Error deleting expense' });
  }
};

// ─── INDIVIDUAL (per-student) BILLING ──────────────────────────────────────────
// Super-admin charges individual students directly (independent of school charging).

// SA global student search — by student name, parent name, parent email, parent phone.
const searchStudents = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json([]);
    const where = {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { gr_no: { contains: q, mode: 'insensitive' } },
        { parent: { name: { contains: q, mode: 'insensitive' } } },
        { parent: { email: { contains: q, mode: 'insensitive' } } },
        { parent: { phone: { contains: q } } },
      ],
    };
    const baseSelect = {
      id: true, name: true, grade: true,
      school: { select: { id: true, name: true } },
      parent: { select: { id: true, name: true, email: true, phone: true } },
    };
    let students;
    try {
      students = await prisma.student.findMany({
        where, take: 25, orderBy: { name: 'asc' },
        select: { ...baseSelect, individualPlan: { select: { id: true, name: true } } },
      });
    } catch (inner) {
      // individual_plan relation may not be migrated on this DB yet — degrade gracefully
      // so search still works (the assigned-plan chip just won't pre-fill).
      console.error('searchStudents (individualPlan) fallback:', inner.message);
      students = await prisma.student.findMany({ where, take: 25, orderBy: { name: 'asc' }, select: baseSelect });
    }
    res.json(students);
  } catch (err) {
    console.error('searchStudents error:', err.message);
    res.status(500).json({ error: 'Error searching students' });
  }
};

const assignIndividualPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { plan_id } = req.body;
    const current = await prisma.student.findUnique({
      where: { id }, select: { individual_plan_id: true },
    });
    const newPlanId = plan_id || null;
    const changed = (current?.individual_plan_id || null) !== newPlanId;
    const data = { individual_plan_id: newPlanId };
    // Only (re)anchor the auto-billing cycle when the plan actually changes — re-saving the
    // same plan must NOT reset the cadence (which would skip a billing cycle). Clear on unassign.
    if (changed) data.individual_plan_assigned_at = newPlanId ? new Date() : null;
    const student = await prisma.student.update({
      where: { id },
      data,
      select: {
        id: true, name: true,
        individualPlan: { select: { id: true, name: true } },
      },
    });
    res.json(student);
  } catch (err) {
    console.error('assignIndividualPlan error:', err.message);
    res.status(500).json({ error: 'Error assigning plan to student' });
  }
};

async function computeInvoiceForStudent(student_id, billing_month) {
  const student = await prisma.student.findUnique({
    where: { id: student_id },
    select: { id: true, name: true, school_id: true, individual_plan_id: true },
  });
  if (!student) throw new Error('Student not found');
  if (!student.individual_plan_id) throw new Error('Student has no individual plan assigned');

  const plan = await prisma.pricingPlan.findUnique({
    where: { id: student.individual_plan_id },
    include: { lineItems: true },
  });
  if (!plan) throw new Error('Pricing plan not found');

  // Individual billing = one student → each billable line item is charged once.
  const { splitPlanItems: splitStudentPlan, applyProfitTarget: applyStudentProfit } = require('../utils/planPricing');
  const { billableItems: studentBillable, profitTarget: studentProfit } = splitStudentPlan(plan.lineItems);
  const rawStudentItems = studentBillable.map(item => {
    const quantity = 1;
    let charge = quantity * item.unit_rate;
    if (item.min_value !== null && item.min_value !== undefined && charge < item.min_value) {
      charge = item.min_value;
    }
    return {
      label: item.label, description: item.description, metric: item.metric,
      unit_rate: item.unit_rate, quantity, charge,
      is_mandatory: item.is_mandatory, min_value: item.min_value,
    };
  });
  const lineItemsCalc = applyStudentProfit(rawStudentItems, studentProfit);
  const subtotal = lineItemsCalc.reduce((sum, i) => sum + i.charge, 0);

  const billingConfig = await prisma.billingConfig.findUnique({ where: { id: 'singleton' } });
  const graceDays = billingConfig?.overdue_grace_days ?? 7;
  const overdueRateType = billingConfig?.overdue_rate_type ?? 'percentage';
  const overdueRate = billingConfig?.overdue_rate ?? 2;

  const unpaidInvoices = await prisma.studentInvoice.findMany({
    where: { student_id, status: { not: 'paid' } },
    select: { due_date: true, subtotal: true, total_amount: true },
  });
  let overdue_amount = 0;
  for (const inv of unpaidInvoices) {
    const daysOverdue = Math.floor((Date.now() - new Date(inv.due_date)) / (24 * 3600 * 1000));
    if (daysOverdue > graceDays) {
      // Penalise the original charge (subtotal), not total_amount, to avoid compounding.
      const base = inv.subtotal ?? inv.total_amount;
      overdue_amount += overdueRateType === 'percentage'
        ? base * (overdueRate / 100)
        : overdueRate;
    }
  }

  const total_amount = subtotal + overdue_amount;
  const [year, month] = billing_month.split('-').map(Number);
  const billingCycleDay = billingConfig?.billing_cycle_day ?? 1;
  const due_date = new Date(year, month - 1 + 1, billingCycleDay);
  const snapshot = { student_name: student.name, line_items: lineItemsCalc, plan_name: plan.name };

  return { student, plan, subtotal, overdue_amount, total_amount, due_date, snapshot };
}

// Render a branded PDF for a student invoice, store its URL, and email the parent.
// Best-effort: any failure here is logged and swallowed so billing never breaks.
async function finalizeStudentInvoicePdf(invoice, studentName) {
  try {
    const school = await prisma.school.findUnique({
      where: { id: invoice.school_id },
      select: {
        name: true, address: true, phone: true, email_contact: true,
        website: true, logo_url: true, primary_color: true,
      },
    });
    const { renderAndUploadInvoicePdf } = require('../utils/invoicePdf');
    const { url, buffer } = await renderAndUploadInvoicePdf({
      invoice, school, kind: 'student', billToName: studentName, billToSub: school?.name,
    });
    if (url) {
      await prisma.studentInvoice.update({ where: { id: invoice.id }, data: { pdf_url: url } });
      invoice.pdf_url = url;
    }
    if (invoice.parent_id) {
      const parent = await prisma.user.findUnique({ where: { id: invoice.parent_id }, select: { email: true } });
      if (parent?.email) {
        const { sendInvoiceGenerated } = require('../utils/resend');
        await sendInvoiceGenerated({
          adminEmail: parent.email,
          month: invoice.billing_month,
          amount: Number(invoice.total_amount).toFixed(2),
          school,
          pdfBuffer: buffer,
          pdfUrl: url,
        });
      }
    }
    return url;
  } catch (err) {
    console.error('finalizeStudentInvoicePdf error:', err.message);
    return null;
  }
}

const generateStudentInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const now = new Date();
    const billing_month = req.body.billing_month ||
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const dup = await prisma.studentInvoice.findFirst({
      where: { student_id: id, billing_month }, select: { id: true },
    });
    if (dup) return res.status(400).json({ error: `An invoice for ${billing_month} already exists for this student.` });
    const c = await computeInvoiceForStudent(id, billing_month);
    const invoice = await prisma.studentInvoice.create({
      data: {
        student_id: c.student.id,
        school_id: c.student.school_id,
        plan_id: c.plan.id,
        billing_month,
        due_date: c.due_date,
        subtotal: c.subtotal,
        overdue_amount: c.overdue_amount,
        total_amount: c.total_amount,
        status: 'pending',
        line_items_snapshot: c.snapshot,
      },
    });
    // Notify the parent (best-effort).
    const student = await prisma.student.findUnique({
      where: { id }, select: { parent_id: true, school_id: true },
    });
    if (student?.parent_id) {
      await prisma.notification.create({
        data: {
          user_id: student.parent_id,
          school_id: student.school_id,
          message: `New invoice for ${billing_month}. Amount due: ₹${c.total_amount.toFixed(2)}`,
          student_name: c.student.name,
          type: 'info',
        },
      }).catch(() => {});
    }
    // Branded PDF + email to parent (best-effort).
    await finalizeStudentInvoicePdf({ ...invoice, parent_id: student?.parent_id }, c.student.name);
    res.status(201).json(invoice);
  } catch (err) {
    console.error('generateStudentInvoice error:', err.message);
    res.status(400).json({ error: err.message });
  }
};

// Generate this month's invoice for EVERY student that has an individual plan assigned.
const generateAllStudentInvoices = async (req, res) => {
  try {
    const now = new Date();
    const billing_month = req.body.billing_month ||
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const students = await prisma.student.findMany({
      where: { individual_plan_id: { not: null } },
      select: { id: true },
    });
    let generated = 0;
    let skipped = 0;
    const errors = [];
    for (const s of students) {
      try {
        // Skip students that already have an invoice for this month (no double-billing).
        const dup = await prisma.studentInvoice.findFirst({
          where: { student_id: s.id, billing_month }, select: { id: true },
        });
        if (dup) { skipped++; continue; }
        const c = await computeInvoiceForStudent(s.id, billing_month);
        const created = await prisma.studentInvoice.create({
          data: {
            student_id: c.student.id, school_id: c.student.school_id, plan_id: c.plan.id,
            billing_month, due_date: c.due_date, subtotal: c.subtotal,
            overdue_amount: c.overdue_amount, total_amount: c.total_amount,
            status: 'pending', line_items_snapshot: c.snapshot,
          },
        });
        const stu = await prisma.student.findUnique({ where: { id: s.id }, select: { parent_id: true } });
        await finalizeStudentInvoicePdf({ ...created, parent_id: stu?.parent_id }, c.student.name);
        generated++;
      } catch (e) {
        errors.push({ student_id: s.id, error: e.message });
      }
    }
    res.json({ generated, skipped, total: students.length, errors });
  } catch (err) {
    console.error('generateAllStudentInvoices error:', err.message);
    res.status(500).json({ error: 'Error generating student invoices' });
  }
};

const listStudentInvoices = async (req, res) => {
  try {
    const { student_id, status, month } = req.query;
    const where = {};
    if (student_id) where.student_id = student_id;
    if (status) where.status = status;
    if (month) where.billing_month = month;
    const invoices = await prisma.studentInvoice.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        student: {
          select: {
            id: true, name: true,
            school: { select: { name: true } },
            parent: { select: { name: true, phone: true } },
          },
        },
      },
    });
    res.json(invoices);
  } catch (err) {
    console.error('listStudentInvoices error:', err.message);
    res.status(500).json({ error: 'Error fetching student invoices' });
  }
};

const payStudentInvoiceCash = async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await prisma.studentInvoice.update({
      where: { id },
      data: { status: 'paid', payment_method: 'cash', paid_at: new Date() },
    });
    // Re-render so the stored PDF no longer says PENDING.
    const { refreshInvoicePdf } = require('../utils/invoicePdf');
    invoice.pdf_url = (await refreshInvoicePdf(id, 'student')) || invoice.pdf_url;
    res.json(invoice);
  } catch (err) {
    console.error('payStudentInvoiceCash error:', err.message);
    res.status(500).json({ error: 'Error processing cash payment' });
  }
};

const createStudentInvoiceOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await prisma.studentInvoice.findUnique({ where: { id } });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    if (invoice.status === 'paid') return res.status(400).json({ error: 'Invoice already paid' });

    const key_id = await getPlatformKeyId();
    if (!key_id) return res.status(400).json({ error: 'Platform Razorpay is not configured' });

    const razorpay = await getRazorpayInstance();
    const order = await razorpay.orders.create({
      amount: Math.round(invoice.total_amount * 100),
      currency: 'INR',
      receipt: `sinv_${invoice.id}`,
      notes: { student_invoice_id: invoice.id, student_id: invoice.student_id },
    });
    await prisma.studentInvoice.update({
      where: { id }, data: { razorpay_order_id: order.id },
    });
    res.json({ order, invoice_id: invoice.id, key_id });
  } catch (err) {
    console.error('createStudentInvoiceOrder error:', err.message);
    res.status(500).json({ error: 'Error creating Razorpay order' });
  }
};

// GET /billing/my-student-invoices (parent) — the super-admin "individual" charges raised
// against this parent's children, so the parent Fees page can show them alongside school fees.
const getMyStudentInvoices = async (req, res) => {
  try {
    const students = await prisma.student.findMany({
      where: { parent_id: req.user.id }, select: { id: true },
    });
    const ids = students.map(s => s.id);
    if (ids.length === 0) return res.json([]);
    const invoices = await prisma.studentInvoice.findMany({
      where: { student_id: { in: ids } },
      orderBy: { created_at: 'desc' },
      include: { student: { select: { id: true, name: true } } },
    });
    res.json(invoices);
  } catch (err) {
    console.error('getMyStudentInvoices error:', err.message);
    res.status(500).json({ error: 'Error fetching invoices' });
  }
};

// ─── SUBSCRIPTION (admin + parent) ────────────────────────────────────────────
// Returns the current user's active plan(s) + the feature permissions they grant, so
// the admin/parent subscription pages can render "what's included" from real data.
const getMySubscription = async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const school = await prisma.school.findUnique({
        where: { id: req.user.school_id },
        select: {
          name: true, permissions: true,
          pricingPlan: {
            select: {
              id: true, name: true, description: true, plan_type: true,
              permissions: true, lineItems: true,
            },
          },
        },
      });
      return res.json({
        role: 'admin',
        scope: 'school',
        holder_name: school?.name || null,
        plan: school?.pricingPlan || null,
        effective_permissions: school?.permissions || {},
      });
    }

    if (req.user.role === 'parent') {
      const kids = await prisma.student.findMany({
        where: { parent_id: req.user.id },
        select: {
          id: true, name: true,
          individualPlan: {
            select: {
              id: true, name: true, description: true, plan_type: true,
              permissions: true, lineItems: true,
            },
          },
        },
      });
      const subs = kids
        .filter(k => k.individualPlan)
        .map(k => ({ student_id: k.id, student_name: k.name, plan: k.individualPlan }));
      return res.json({ role: 'parent', scope: 'individual', subscriptions: subs });
    }

    return res.json({ role: req.user.role, plan: null });
  } catch (err) {
    console.error('getMySubscription error:', err.message);
    res.status(500).json({ error: 'Error fetching subscription' });
  }
};

module.exports = {
  listPlans,
  createPlan,
  updatePlan,
  deletePlan,
  getMySubscription,
  searchStudents,
  assignIndividualPlan,
  generateStudentInvoice,
  generateAllStudentInvoices,
  computeInvoiceForStudent,
  listStudentInvoices,
  payStudentInvoiceCash,
  createStudentInvoiceOrder,
  getMyStudentInvoices,
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
  getMyInvoices,
  updatePlatformRazorpay,
  getPlatformRazorpayStatus,
  getPlatformUsage,
  listManualExpenses,
  createManualExpense,
  deleteManualExpense,
};
