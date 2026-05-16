const prisma = require('../prisma');

/**
 * Standalone invoice generation utility.
 * Called from both the cron job and the billing controller.
 *
 * @param {string} schoolId
 * @param {string} billingMonth  e.g. "2026-05"
 * @returns {Promise<object>}  the created SchoolInvoice record
 */
async function generateInvoiceForSchool(schoolId, billingMonth) {
  const [year, month] = billingMonth.split('-').map(Number);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1);

  // ── School & Plan ─────────────────────────────────────────────────────────
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { id: true, name: true, plan_id: true },
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
  const [bus_count, student_count, route_count, shift_count] = await Promise.all([
    prisma.bus.count({ where: { school_id: schoolId } }),
    prisma.student.count({ where: { school_id: schoolId } }),
    prisma.route.count({ where: { school_id: schoolId } }),
    prisma.driverShift.count({
      where: { school_id: schoolId, date: { gte: monthStart, lt: monthEnd } },
    }),
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

  const usage = { bus_count, student_count, route_count, gps_hours, total_km, shift_count };

  // ── Line item calculation ──────────────────────────────────────────────────
  const lineItemsCalc = plan.lineItems.map(item => {
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

  const subtotal = lineItemsCalc.reduce((sum, i) => sum + i.charge, 0);

  // ── Overdue penalty ───────────────────────────────────────────────────────
  const billingConfig = await prisma.billingConfig.findUnique({ where: { id: 'singleton' } });
  const graceDays = billingConfig?.overdue_grace_days ?? 7;
  const overdueRateType = billingConfig?.overdue_rate_type ?? 'percentage';
  const overdueRate = billingConfig?.overdue_rate ?? 2;

  const unpaidInvoices = await prisma.schoolInvoice.findMany({
    where: { school_id: schoolId, status: { not: 'paid' } },
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

  const billingCycleDay = billingConfig?.billing_cycle_day ?? 1;
  const due_date = new Date(year, month - 1 + 1, billingCycleDay);

  const snapshot = { usage, line_items: lineItemsCalc, plan_name: plan.name };

  // ── Create invoice record ─────────────────────────────────────────────────
  const invoice = await prisma.schoolInvoice.create({
    data: {
      school_id: schoolId,
      billing_month: billingMonth,
      due_date,
      subtotal,
      overdue_amount,
      total_amount,
      status: 'pending',
      line_items_snapshot: snapshot,
    },
  });

  // ── Notify school admin ───────────────────────────────────────────────────
  const adminUser = await prisma.user.findFirst({
    where: { school_id: schoolId, role: 'admin', is_active: true },
    select: { id: true },
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
  }

  return invoice;
}

module.exports = { generateInvoiceForSchool };
