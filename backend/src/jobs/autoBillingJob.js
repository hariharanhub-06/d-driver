const prisma = require('../prisma');
const cron = require('node-cron');
const { generateInvoiceForSchool } = require('../utils/invoiceGenerator');
const { computeInvoiceForStudent } = require('../controllers/billingController');

const DAY_MS = 24 * 3600 * 1000;
const monthStr = (now) => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

// ── Schools: generate the monthly invoice 5 days before each school's due day ──
async function runSchoolAutoBilling(now) {
  const [schools, config] = await Promise.all([
    prisma.school.findMany({
      where: { status: 'active', plan_id: { not: null } },
      select: { id: true, billing_due_day: true },
    }),
    prisma.billingConfig.findUnique({ where: { id: 'singleton' } }),
  ]);
  const fallbackDay = config?.billing_cycle_day || 1;

  for (const school of schools) {
    try {
      const dueDay = Math.min(Math.max(school.billing_due_day || fallbackDay, 1), 28);
      let dueDate = new Date(now.getFullYear(), now.getMonth(), dueDay);
      let billingMonth = monthStr(now);
      // If this month's due day has already passed, bill for NEXT month instead of issuing an
      // invoice that's already overdue the moment it's created.
      if (now > dueDate) {
        const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        dueDate = new Date(next.getFullYear(), next.getMonth(), dueDay);
        billingMonth = monthStr(next);
      }
      const daysUntilDue = Math.ceil((dueDate - now) / DAY_MS);
      // Generate once we're within 5 days of the due date.
      if (daysUntilDue > 5) continue;
      const existing = await prisma.schoolInvoice.findFirst({
        where: { school_id: school.id, billing_month: billingMonth },
        select: { id: true },
      });
      if (existing) continue;
      // generateInvoiceForSchool also notifies the school admin.
      await generateInvoiceForSchool(school.id, billingMonth);
      console.log(`[auto-billing] school invoice generated: ${school.id} (${billingMonth})`);
    } catch (e) {
      console.error(`[auto-billing] school ${school.id}:`, e.message);
    }
  }
}

// ── Individual students: generate every N days from the plan-assignment anchor ──
async function runIndividualAutoBilling(now) {
  const billingMonth = monthStr(now);
  const config = await prisma.billingConfig.findUnique({ where: { id: 'singleton' } });
  const cycleDays = config?.individual_billing_days || 30;

  const students = await prisma.student.findMany({
    where: { individual_plan_id: { not: null }, individual_plan_assigned_at: { not: null } },
    select: { id: true, parent_id: true, school_id: true, individual_plan_assigned_at: true },
  });

  for (const s of students) {
    try {
      // Anchor on the last generated invoice, else the plan-assignment date.
      const last = await prisma.studentInvoice.findFirst({
        where: { student_id: s.id }, orderBy: { created_at: 'desc' }, select: { created_at: true },
      });
      const anchor = last ? new Date(last.created_at) : new Date(s.individual_plan_assigned_at);
      const nextDue = new Date(anchor.getTime() + cycleDays * DAY_MS);
      if (now < nextDue) continue;

      const c = await computeInvoiceForStudent(s.id, billingMonth);
      await prisma.studentInvoice.create({
        data: {
          student_id: c.student.id, school_id: c.student.school_id, plan_id: c.plan.id,
          billing_month: billingMonth, due_date: c.due_date, subtotal: c.subtotal,
          overdue_amount: c.overdue_amount, total_amount: c.total_amount,
          status: 'pending', line_items_snapshot: c.snapshot,
        },
      });
      if (s.parent_id) {
        await prisma.notification.create({
          data: {
            user_id: s.parent_id, school_id: s.school_id, type: 'info',
            student_name: c.student.name,
            message: `New invoice generated. Amount due: ₹${c.total_amount.toFixed(2)}`,
          },
        }).catch(() => {});
      }
      console.log(`[auto-billing] student invoice generated: ${s.id}`);
    } catch (e) {
      console.error(`[auto-billing] student ${s.id}:`, e.message);
    }
  }
}

// ── Reminders: unpaid individual invoices more than 5 days past due ──
async function runOverdueReminders(now) {
  const cutoff = new Date(now.getTime() - 5 * DAY_MS);
  const overdue = await prisma.studentInvoice.findMany({
    where: { status: { not: 'paid' }, due_date: { lt: cutoff } },
    select: {
      id: true, total_amount: true, reminder_sent_at: true,
      student: { select: { parent_id: true, school_id: true, name: true } },
    },
  });
  for (const inv of overdue) {
    try {
      // Don't re-nag within 5 days of the last reminder.
      if (inv.reminder_sent_at && (now - new Date(inv.reminder_sent_at)) < 5 * DAY_MS) continue;
      if (inv.student?.parent_id) {
        await prisma.notification.create({
          data: {
            user_id: inv.student.parent_id, school_id: inv.student.school_id, type: 'alert',
            student_name: inv.student.name,
            message: `Payment overdue for ${inv.student.name}: ₹${inv.total_amount.toFixed(2)}. Please pay at the earliest.`,
          },
        }).catch(() => {});
      }
      await prisma.studentInvoice.update({ where: { id: inv.id }, data: { reminder_sent_at: new Date() } });
    } catch (e) {
      console.error(`[auto-billing] reminder ${inv.id}:`, e.message);
    }
  }
}

async function runAutoBilling() {
  const now = new Date();
  await runSchoolAutoBilling(now);
  await runIndividualAutoBilling(now);
  await runOverdueReminders(now);
}

function startAutoBillingJob() {
  // Daily at 07:00 server time.
  cron.schedule('0 7 * * *', () => {
    console.log('[auto-billing] daily run starting…');
    runAutoBilling().catch(e => console.error('[auto-billing] run error:', e.message));
  });
  console.log('✓ Auto-billing job scheduled (daily 07:00)');
}

module.exports = { startAutoBillingJob, runAutoBilling };
