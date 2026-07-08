const webpush = require('web-push');
const prisma = require('../prisma');

// VAPID keys identify this server to the browser push services. Generate once with
// `npx web-push generate-vapid-keys` and set them as env vars on the backend host.
// If they're missing we simply no-op, so the app runs fine without web push configured.
const PUBLIC = process.env.VAPID_PUBLIC_KEY;
const PRIVATE = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@onlive.co.in';

let configured = false;
if (PUBLIC && PRIVATE) {
  try {
    webpush.setVapidDetails(SUBJECT, PUBLIC, PRIVATE);
    configured = true;
  } catch (e) {
    console.error('web-push VAPID configuration failed:', e.message);
  }
} else {
  console.warn('web-push disabled: VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY not set.');
}

const isConfigured = () => configured;
const getPublicKey = () => PUBLIC || null;

/**
 * Send a browser/PWA push notification to every subscription a user has registered.
 * Fire-and-forget — never throws. Expired subscriptions (404/410) are pruned.
 */
const sendWebPush = async (userId, title, body, data = {}) => {
  if (!configured || !userId) return;
  try {
    const subs = await prisma.pushSubscription.findMany({ where: { user_id: userId } });
    if (subs.length === 0) return;
    const payload = JSON.stringify({ title, body, ...data });
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload,
          );
        } catch (err) {
          // 404 / 410 mean the browser dropped the subscription — remove it so we
          // don't keep trying. Other errors are logged but non-fatal.
          if (err.statusCode === 404 || err.statusCode === 410) {
            await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
          } else {
            console.error('sendWebPush error:', err.statusCode, err.body || err.message);
          }
        }
      }),
    );
  } catch (err) {
    console.error('sendWebPush lookup error:', err.message);
  }
};

module.exports = { sendWebPush, isConfigured, getPublicKey };
