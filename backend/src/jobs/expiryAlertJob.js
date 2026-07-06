const cron = require('node-cron');
const prisma = require('../prisma');
const { notifyAdmins } = require('../utils/notifications');

const REMIND_WITHIN_DAYS = 5; // start reminding this many days before expiry (and while expired)

const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

// Returns a human phrase if `date` is expired or expiring within the window, else null.
function expiryPhrase(label, date, today, threshold) {
    if (!date) return null;
    const day = startOfDay(new Date(date));
    if (day > threshold) return null; // more than 5 days away — no reminder yet
    return day < today
        ? `${label} expired on ${fmt(date)}`
        : `${label} expires on ${fmt(date)}`;
}

function remindedToday(last, today) {
    if (!last) return false;
    return startOfDay(new Date(last)).getTime() === today.getTime();
}

async function runExpiryCheck() {
    const now = new Date();
    const today = startOfDay(now);
    const threshold = new Date(today);
    threshold.setDate(threshold.getDate() + REMIND_WITHIN_DAYS);

    // ── Buses: insurance + RC ────────────────────────────────────────────────
    const buses = await prisma.bus.findMany({
        where: { OR: [{ insurance_expiry: { not: null } }, { rc_expiry: { not: null } }] },
        select: { id: true, bus_number: true, school_id: true, insurance_expiry: true, rc_expiry: true, last_expiry_reminder_at: true },
    });
    for (const bus of buses) {
        if (remindedToday(bus.last_expiry_reminder_at, today)) continue;
        const parts = [
            expiryPhrase('Insurance', bus.insurance_expiry, today, threshold),
            expiryPhrase('RC', bus.rc_expiry, today, threshold),
        ].filter(Boolean);
        if (parts.length === 0) continue;
        await notifyAdmins(bus.school_id, `Bus ${bus.bus_number}: ${parts.join('; ')}.`, 'alert');
        await prisma.bus.update({ where: { id: bus.id }, data: { last_expiry_reminder_at: now } });
    }

    // ── Drivers: licence ─────────────────────────────────────────────────────
    const drivers = await prisma.driver.findMany({
        where: { license_expiry: { not: null } },
        select: { id: true, school_id: true, license_expiry: true, last_expiry_reminder_at: true, user: { select: { name: true } } },
    });
    for (const drv of drivers) {
        if (remindedToday(drv.last_expiry_reminder_at, today)) continue;
        const phrase = expiryPhrase('Licence', drv.license_expiry, today, threshold);
        if (!phrase) continue;
        await notifyAdmins(drv.school_id, `Driver ${drv.user?.name || ''}: ${phrase}.`, 'alert');
        await prisma.driver.update({ where: { id: drv.id }, data: { last_expiry_reminder_at: now } });
    }
}

// Runs daily at 9:30 AM IST (04:00 UTC). Once-per-day cadence + the per-record
// last_expiry_reminder_at guard together guarantee "once a day".
const startExpiryAlertJob = () => {
    cron.schedule('0 4 * * *', async () => {
        console.log('[ExpiryAlertJob] Running daily insurance/RC/licence expiry check...');
        try {
            await runExpiryCheck();
            console.log('[ExpiryAlertJob] Done.');
        } catch (err) {
            console.error('[ExpiryAlertJob] Error:', err.message);
        }
    }, { timezone: 'Asia/Kolkata' });
    console.log('[ExpiryAlertJob] Scheduled daily at 9:30 AM IST');
};

module.exports = { startExpiryAlertJob, runExpiryCheck };
