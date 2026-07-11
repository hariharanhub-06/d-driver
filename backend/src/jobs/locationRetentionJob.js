const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Location is append-only: the socket handler writes one row per bus per 3 seconds
// while a trip runs (~20 rows/min/bus, ~18.5 MB per bus per month). Nothing purged it
// — the only deleteMany was on school deletion — so the table grew without bound and
// took the cost of every "latest fix for this bus" query up with it.
//
// Live tracking only ever reads the newest row (LIVE_WINDOW_MS is 90 s in
// src/lib/tracking.ts), so history beyond the retention window is dead weight. Keep a
// window long enough to investigate a complaint about last week's trip, and drop the rest.
const RETENTION_DAYS = parseInt(process.env.LOCATION_RETENTION_DAYS || '90', 10);

// Delete in batches: a single unbounded deleteMany over millions of rows takes a long
// lock and can time out on a small Postgres instance.
const BATCH_SIZE = 10000;
const MAX_BATCHES = 200; // safety stop — 2M rows per run, remainder goes next night

async function purgeOldLocations() {
  if (!Number.isFinite(RETENTION_DAYS) || RETENTION_DAYS <= 0) {
    console.warn('[locationRetention] invalid LOCATION_RETENTION_DAYS, skipping purge');
    return;
  }

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  let deleted = 0;

  try {
    for (let i = 0; i < MAX_BATCHES; i++) {
      // Select a page of ids first, then delete by id. deleteMany has no `take`, so
      // without this the whole matching set is deleted in one statement.
      const rows = await prisma.location.findMany({
        where: { timestamp: { lt: cutoff } },
        select: { id: true },
        take: BATCH_SIZE,
      });
      if (rows.length === 0) break;

      const { count } = await prisma.location.deleteMany({
        where: { id: { in: rows.map((r) => r.id) } },
      });
      deleted += count;
      if (rows.length < BATCH_SIZE) break;
    }

    if (deleted > 0) {
      console.log(`[locationRetention] purged ${deleted} location rows older than ${RETENTION_DAYS}d (before ${cutoff.toISOString()})`);
    }
  } catch (err) {
    console.error('[locationRetention] purge failed:', err.message);
  }
}

function startLocationRetentionJob() {
  // 03:15 daily — well clear of the 07:00 billing cron and outside school-run hours.
  cron.schedule('15 3 * * *', purgeOldLocations);
  console.log(`[locationRetention] scheduled daily 03:15, retention ${RETENTION_DAYS}d`);
}

module.exports = { startLocationRetentionJob, purgeOldLocations };
