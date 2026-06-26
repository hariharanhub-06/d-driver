const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { execSync } = require('child_process');

const prisma = new PrismaClient();

// Ensure the DB schema matches prisma/schema.prisma before seeding. This makes the
// deploy self-healing even if the build command doesn't run `prisma db push`
// (adds new nullable columns like User.expo_push_token). Idempotent & safe.
function syncSchema() {
  try {
    console.log('Syncing database schema (prisma db push)...');
    execSync('npx prisma db push --accept-data-loss --skip-generate', { stdio: 'inherit' });
  } catch (err) {
    console.error('prisma db push failed:', err.message);
    throw err;
  }
}

async function main() {
  syncSchema();

  const email = process.env.SA_EMAIL?.toLowerCase().trim();
  const password = process.env.SA_PASSWORD;

  // ─── DEV SA ACCOUNT ──────────────────────────────────────────────────────────
  // Non-fatal: if the env vars aren't set on this host, skip (don't fail the build).
  if (email && password) {
    const hashed = await bcrypt.hash(password, 12);
    const devSa = await prisma.user.upsert({
      where: { email },
      update: { password: hashed, is_dev_sa: true, is_active: true, is_first_login: false },
      create: {
        name: 'Dev Super Admin',
        email,
        password: hashed,
        role: 'super_admin',
        is_dev_sa: true,
        is_active: true,
        is_first_login: false,
      },
    });
    console.log(`✓ DEV SA: ${devSa.email} (is_dev_sa=true, role=super_admin, password set from SA_PASSWORD)`);
  } else {
    console.warn('⚠ SA_EMAIL/SA_PASSWORD not set on this host — skipping dev SA seed (login password unchanged).');
  }

  // ─── PLATFORM CONFIG SINGLETON ───────────────────────────────────────────────
  await prisma.platformConfig.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      razorpay_configured: false,
      default_from_email: process.env.RESEND_FROM_DEFAULT || 'noreply@ddriver.app',
    },
  });

  console.log('✓ PlatformConfig singleton ready');

  // ─── BILLING CONFIG SINGLETON ────────────────────────────────────────────────
  await prisma.billingConfig.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      overdue_grace_days: 7,
      overdue_rate_type: 'percentage',
      overdue_rate: 2,
      billing_cycle_day: 1,
    },
  });

  console.log('✓ BillingConfig singleton (7-day grace, 2% penalty, billing on 1st)');

  // ─── DEFAULT PLATFORM SERVICE CONFIGS ────────────────────────────────────────
  const services = [
    { service_name: 'resend',   display_name: 'Resend',          free_tier_limit: 3000, free_tier_unit: 'emails', current_plan: 'free' },
    { service_name: 'imagekit', display_name: 'ImageKit',        free_tier_limit: 20,   free_tier_unit: 'GB',     current_plan: 'free' },
    { service_name: 'neon',     display_name: 'Neon PostgreSQL', free_tier_limit: 0.5,  free_tier_unit: 'GB',     current_plan: 'free' },
    { service_name: 'render',   display_name: 'Render',          current_plan: 'free' },
    { service_name: 'razorpay', display_name: 'Razorpay',        current_plan: 'paid',  paid_cost_per_unit: 0.02, notes: '2% per transaction' },
  ];

  for (const svc of services) {
    await prisma.platformServiceConfig.upsert({
      where: { service_name: svc.service_name },
      update: {},
      create: svc,
    });
  }

  console.log('✓ Platform service configs seeded (Resend, ImageKit, Neon, Render, Razorpay)');
  console.log('\nSeed complete. Login with DEV SA credentials and change password on first login.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
