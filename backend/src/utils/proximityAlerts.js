const prisma = require('../prisma');
const { distanceMeters } = require('./haversine');
const { notifyUser } = require('./notifications');
const { orderStopsForTrip } = require('../controllers/tripController');

// In-memory dedup for proximity/arrival alerts, keyed by `${tripId}:${stopId}:${type}`.
// Types: "approaching" (1 km), "arrived" (100 m). Entries older than the TTL are ignored so
// an alert can re-fire on the next trip the same day (e.g. morning pickup then evening drop).
// Module-scoped: the socket server is a single process, so this map is shared across buses.
// NOTE: this is a SEPARATE map from the one in locationController.js — that controller serves a
// REST path no client calls; this util powers the live Socket.IO path.
const alertedStops = new Map();
const ALERT_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

const joinNames = (names) =>
  names.length === 1
    ? names[0]
    : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

/**
 * Notify parents when the bus approaches (≤1 km) or arrives at (≤100 m) their child's stop.
 *
 * This is the live-path port of the logic that previously lived only in the dead REST handler
 * locationController.updateLocation. It routes each alert through notifyUser, which is the ONLY
 * path that fires Expo + Web push — the old code wrote the notification row and emitted a socket
 * event but never pushed, so parents got nothing on their phone.
 *
 * Best-effort and self-contained: never throws (caller wraps in try/catch anyway), so a failure
 * here can never affect the location broadcast or the fuel/DB write.
 *
 * @param io           Socket.IO server instance
 * @param busId        bus being tracked
 * @param schoolId     school owning the bus (parents share it, so notifyUser's guard passes)
 * @param lat,lng      current bus position
 */
async function checkProximityAlerts(io, { busId, schoolId, lat, lng }) {
  if (!busId || !schoolId || lat == null || lng == null) return;

  const busLat = parseFloat(lat);
  const busLng = parseFloat(lng);

  try {
    const activeTrip = await prisma.activeTrip.findFirst({
      where: { bus_id: busId, status: 'running' },
      include: { route: { include: { stops: { orderBy: { sequence: 'asc' } } } } },
    });
    if (!activeTrip) return;

    const isEvening = activeTrip.trip_type === 'evening';
    // Order stops the SAME way the driver/parent views do (reversed for evening) so
    // current_stop_index — a position in visit order — lines up. Only stops still ahead
    // of the bus are candidates.
    const ordered = orderStopsForTrip(activeTrip.route.stops, isEvening ? 'evening' : 'morning');
    const remainingStops = ordered.slice(activeTrip.current_stop_index);

    const now = Date.now();
    const fresh = (key) => {
      const t = alertedStops.get(key);
      return t && now - t < ALERT_TTL_MS;
    };

    for (const stop of remainingStops) {
      if (stop.latitude == null || stop.longitude == null) continue;
      const dist = distanceMeters(busLat, busLng, stop.latitude, stop.longitude);

      const approachingKey = `${activeTrip.id}:${stop.id}:approaching`;
      const arrivedKey = `${activeTrip.id}:${stop.id}:arrived`;
      const shouldApproach = dist <= 1000 && !fresh(approachingKey);
      const shouldArrived = dist <= 100 && !fresh(arrivedKey);
      if (!shouldApproach && !shouldArrived) continue;

      // Students at this stop, grouped by parent — one notification per parent.
      const students = await prisma.student.findMany({
        where: { stop_id: stop.id, school_id: schoolId },
        select: { parent_id: true, name: true },
      });
      const parentMap = new Map();
      for (const s of students) {
        if (!s.parent_id) continue;
        if (!parentMap.has(s.parent_id)) parentMap.set(s.parent_id, []);
        parentMap.get(s.parent_id).push(s.name);
      }
      if (parentMap.size === 0) continue;

      if (shouldApproach) {
        alertedStops.set(approachingKey, now);
        for (const [parentId, names] of parentMap) {
          const nameStr = joinNames(names);
          const message = `Bus is 1 km away from ${stop.name}. ${nameStr} — please be ready!`;
          // notifyUser creates the notification row, emits 'new-notification', and fires push.
          const notification = await notifyUser(parentId, message, 'alert', schoolId);
          // Also emit the live tracking-page event so any open map updates immediately.
          io.to(`parent-${parentId}`).emit('bus-approaching', {
            stopName: stop.name,
            studentNames: names,
            distanceKm: (dist / 1000).toFixed(1),
            notification,
          });
        }
      }

      if (shouldArrived) {
        alertedStops.set(arrivedKey, now);
        for (const [parentId, names] of parentMap) {
          const nameStr = joinNames(names);
          const message = isEvening
            ? `Bus has arrived at ${stop.name} to drop off ${nameStr}.`
            : `Bus has arrived at ${stop.name} to pick up ${nameStr}.`;
          const notification = await notifyUser(parentId, message, 'info', schoolId);
          io.to(`parent-${parentId}`).emit('bus-arrived-stop', {
            stopName: stop.name,
            studentNames: names,
            notification,
          });
        }
      }
    }
  } catch (err) {
    console.error('[proximityAlerts] error:', err.message);
  }
}

module.exports = { checkProximityAlerts };
