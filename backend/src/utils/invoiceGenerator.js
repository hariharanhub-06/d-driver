const prisma = require('../prisma');

/**
 * Standalone invoice generation utility.
 * Called from both the cron job and the billing controller.
 *
 * @param {string} schoolId
 * @param {string} billingMonth  e.g. "2026-05"
 * @returns {Promise<object>}  the created SchoolInvoice record
 */
/**
 * @param {string} schoolId
 * @param {string} billingMonth  YYYY-MM
 * @param {{force?: boolean}} opts  force replaces an existing UNPAID invoice for that month
 */
async function generateInvoiceForSchool(schoolId, billingMonth, { force = false } = {}) {
  // One invoice per school per month. The guard lives here rather than in each caller because
  // generateAllInvoices had none — clicking "Generate All" twice produced duplicate invoices for
  // the same month. Errors carry a code so callers can skip vs fail.
  const existing = await prisma.schoolInvoice.findFirst({
    where: { school_id: schoolId, billing_month: billingMonth },
    select: { id: true, status: true },
  });
  if (existing) {
    if (!force) {
      throw Object.assign(
        new Error(`An invoice for ${billingMonth} already exists for this school.`),
        { code: 'INVOICE_EXISTS' },
      );
    }
    if (existing.status === 'paid') {
      // Never destroy a paid invoice — it is the record of a real payment.
      throw Object.assign(
        new Error('This invoice is already paid and cannot be regenerated.'),
        { code: 'INVOICE_PAID' },
      );
    }
    // Regenerating recomputes from current usage, so the superseded row is removed.
    await prisma.schoolInvoice.delete({ where: { id: existing.id } });
  }

  const [year, month] = billingMonth.split('-').map(Number);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1);

  // ── School & Plan ─────────────────────────────────────────────────────────
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: {
      id: true, name: true, plan_id: true, billing_due_day: true,
      address: true, phone: true, email_contact: true, website: true,
      logo_url: true, primary_color: true,
    },
  });
  if (!school || !school.plan_id) {
    throw new Error('School has no pricing plan assigned');
  }

  const plan = await prisma.pricingPlan.findUnique({
    where: { id: school.plan_id },
    include: { lineItems: true },
  });
  if (!plan) throw new Error('Pricing plan not found');

  // ── Usage metrics ─────────────────────────────────────────────────────────
  const [bus_count, student_count, route_count, shift_count, driver_count] = await Promise.all([
    prisma.bus.count({ where: { school_id: schoolId } }),
    prisma.student.count({ where: { school_id: schoolId } }),
    prisma.route.count({ where: { school_id: schoolId } }),
    prisma.driverShift.count({
      where: { school_id: schoolId, date: { gte: monthStart, lt: monthEnd } },
    }),
    // Needed by the per_driver metric, which the plan editor offers.
    prisma.driver.count({ where: { school_id: schoolId } }),
  ]);

  const completedTrips = await prisma.activeTrip.findMany({
    where: {
      school_id: schoolId,
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
    where: { school_id: schoolId, date: { gte: monthStart, lt: monthEnd } },
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

  const usage = { bus_count, student_count, route_count, gps_hours, total_km, shift_count, driver_count };

  // ── Line item calculation ──────────────────────────────────────────────────
  // 'expense' and 'profit' rows are internal planning inputs and are never shown as their own
  // line — the profit target is folded into the billable rates below instead, so the school sees
  // one inclusive price and not our margin.
  const { splitPlanItems, applyProfitTarget } = require('./planPricing');
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
      // The plan editor offers these two; without them they fell to the default and billed
      // ONCE instead of per driver, silently undercharging every per_driver plan.
      case 'per_driver':   quantity = driver_count; break;
      case 'flat_fee':     quantity = 1; break; // synonym of 'fixed'
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

  // Spread the profit target across the billable rates (1 profit over 2 buses at 1/bus makes
  // each bus 1.50). Nothing on the invoice reveals it.
  const lineItemsCalc = applyProfitTarget(rawLineItems, profitTarget);

  const subtotal = lineItemsCalc.reduce((sum, i) => sum + i.charge, 0);

  // ── Overdue penalty ───────────────────────────────────────────────────────
  const billingConfig = await prisma.billingConfig.findUnique({ where: { id: 'singleton' } });
  const graceDays = billingConfig?.overdue_grace_days ?? 7;
  const overdueRateType = billingConfig?.overdue_rate_type ?? 'percentage';
  const overdueRate = billingConfig?.overdue_rate ?? 2;

  const unpaidInvoices = await prisma.schoolInvoice.findMany({
    where: { school_id: schoolId, status: { not: 'paid' } },
    select: { id: true, due_date: true, subtotal: true, total_amount: true },
  });

  let overdue_amount = 0;
  for (const inv of unpaidInvoices) {
    const daysOverdue = Math.floor((Date.now() - new Date(inv.due_date)) / (24 * 3600 * 1000));
    if (daysOverdue > graceDays) {
      // Penalise the original charge (subtotal), NOT total_amount — otherwise prior penalties
      // baked into total_amount get re-penalised and the late fee compounds month over month.
      const base = inv.subtotal ?? inv.total_amount;
      const penalty = overdueRateType === 'percentage'
        ? base * (overdueRate / 100)
        : overdueRate;
      overdue_amount += penalty;
    }
  }

  // GST on the service value only — a late-payment penalty is not a supply of service.
  const { getGstConfig, computeGst } = require('./gst');
  const gstCfg = await getGstConfig(prisma);
  const gst = computeGst(subtotal, gstCfg.rate);
  const total_amount = subtotal + gst.amount + overdue_amount;

  const billingCycleDay = billingConfig?.billing_cycle_day ?? 1;
  // Honour the school's configured billing due day within the billing month. Fall back to the
  // legacy "due on the global cycle day of the following month" only when no per-school day is set.
  const due_date = school.billing_due_day
    ? new Date(year, month - 1, Math.min(school.billing_due_day, 28))
    : new Date(year, month - 1 + 1, billingCycleDay);

  const snapshot = { usage, line_items: lineItemsCalc, plan_name: plan.name };

  // ── Create invoice record ─────────────────────────────────────────────────
  const invoice = await prisma.schoolInvoice.create({
    data: {
      school_id: schoolId,
      billing_month: billingMonth,
      due_date,
      subtotal,
      overdue_amount,
      tax_rate: gst.rate,
      tax_amount: gst.amount,
      total_amount,
      status: 'pending',
      line_items_snapshot: snapshot,
    },
  });

  // ── Branded PDF (best-effort; never blocks billing) ────────────────────────
  let pdfUrl = null;
  let pdfBuffer = null;
  try {
    const { renderAndUploadInvoicePdf } = require('./invoicePdf');
    const res = await renderAndUploadInvoicePdf({ invoice, school, kind: 'school' });
    pdfUrl = res.url;
    pdfBuffer = res.buffer;
    if (pdfUrl) {
      await prisma.schoolInvoice.update({ where: { id: invoice.id }, data: { pdf_url: pdfUrl } });
      invoice.pdf_url = pdfUrl;
    }
  } catch (err) {
    console.error('invoice pdf (school) error:', err.message);
  }

  // ── Notify school admin (in-app + email with PDF) ──────────────────────────
  const adminUser = await prisma.user.findFirst({
    where: { school_id: schoolId, role: 'admin', is_active: true },
    select: { id: true, email: true },
  });
  if (adminUser) {
    await prisma.notification.create({
      data: {
        user_id: adminUser.id,
        school_id: schoolId,
        message: `Invoice generated for ${billingMonth}. Amount due: ₹${total_amount.toFixed(2)}`,
        type: 'info',
      },
    });
    if (adminUser.email) {
      try {
        const { sendInvoiceGenerated } = require('./resend');
        await sendInvoiceGenerated({
          adminEmail: adminUser.email,
          month: billingMonth,
          amount: total_amount.toFixed(2),
          school,
          pdfBuffer,
          pdfUrl,
        });
      } catch (err) {
        console.error('sendInvoiceGenerated (school) error:', err.message);
      }
    }
  }

  return invoice;
}

module.exports = { generateInvoiceForSchool };
