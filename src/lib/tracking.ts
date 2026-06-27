// Shared bus-tracking logic: distance, OSRM ETA, "trip started" recency, and
// human formatting. Pure TypeScript (no React / no DOM) so the exact same rules
// are reused by the Next.js web app, the PWA, and the React Native (Expo) app.
//
// Mirrors the existing web/driver behaviour but replaces the fake progress bar
// with a real OSRM road-distance + duration, with a Haversine fallback.

export const OSRM_BASE = 'https://router.project-osrm.org';

/** A bus is considered "live / trip started" only if its last location is this fresh. */
export const LIVE_WINDOW_MS = 90_000; // 90s — driver pings often; server DB-throttles to 3s

/** Don't hammer the public OSRM server: recompute at most this often... */
export const ETA_MIN_INTERVAL_MS = 15_000;
/** ...and only after the bus has moved at least this far. */
export const ETA_MIN_MOVE_M = 75;

/** Assumed average urban speed used for the Haversine ETA fallback. */
const FALLBACK_SPEED_KMH = 25;

export type LatLng = { lat: number; lng: number };

export interface EtaResult {
    distanceM: number;
    durationS: number;
    source: 'osrm' | 'haversine';
}

const EARTH_RADIUS_M = 6_371_000;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in metres between two points. */
export function haversineMeters(a: LatLng, b: LatLng): number {
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const s =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

/** True when a location timestamp is recent enough to treat the trip as started/live. */
export function isLocationFresh(timestamp: string | number | Date | null | undefined, now = Date.now()): boolean {
    if (!timestamp) return false;
    const t = timestamp instanceof Date ? timestamp.getTime() : new Date(timestamp).getTime();
    if (Number.isNaN(t)) return false;
    return now - t <= LIVE_WINDOW_MS;
}

/** Decide whether an OSRM recompute is warranted given throttle + movement gates. */
export function shouldRecomputeEta(
    busPos: LatLng,
    lastCallPos: LatLng | null,
    lastCallAt: number,
    now = Date.now(),
): boolean {
    if (!lastCallPos) return true;
    const moved = haversineMeters(busPos, lastCallPos);
    if (now - lastCallAt >= ETA_MIN_INTERVAL_MS) return true;
    return moved >= ETA_MIN_MOVE_M;
}

/**
 * Fetch road distance + duration from OSRM, falling back to a Haversine estimate
 * on any failure (network, bogus detour, abort handled by caller).
 * Coordinate order for OSRM is {lng},{lat}.
 */
export async function fetchEta(busPos: LatLng, stopPos: LatLng, signal?: AbortSignal): Promise<EtaResult> {
    const straight = haversineMeters(busPos, stopPos);
    try {
        const url =
            `${OSRM_BASE}/route/v1/driving/` +
            `${busPos.lng},${busPos.lat};${stopPos.lng},${stopPos.lat}?overview=false`;
        const res = await fetch(url, { signal });
        const data = await res.json();
        const route = data?.routes?.[0];
        // Reject bogus routes (e.g. ferry/detour) that are wildly longer than straight line.
        if (route && typeof route.distance === 'number' && route.distance <= straight * 3) {
            return { distanceM: route.distance, durationS: route.duration, source: 'osrm' };
        }
        throw new Error('osrm-rejected');
    } catch (err) {
        if ((err as any)?.name === 'AbortError') throw err;
        return {
            distanceM: straight,
            durationS: (straight / 1000 / FALLBACK_SPEED_KMH) * 3600,
            source: 'haversine',
        };
    }
}

/** "120 m" / "1.4 km" */
export function formatDistance(meters: number): string {
    if (!Number.isFinite(meters)) return '—';
    if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
    return `${(meters / 1000).toFixed(1)} km`;
}

/** "3 min" (never below 1). Appends "(approx)" for the Haversine fallback. */
export function formatEta(durationS: number, source: EtaResult['source'] = 'osrm'): string {
    if (!Number.isFinite(durationS)) return '—';
    const min = Math.max(1, Math.round(durationS / 60));
    return source === 'haversine' ? `~${min} min (approx)` : `${min} min`;
}

/**
 * Pick the stops that belong to the active trip's direction.
 *
 * A route can hold separate morning AND evening stop copies (each Stop has a `trip_type`).
 * If both exist, show only the half matching the trip direction (morning/evening) — this
 * gives the right order for evening trips AND removes the duplicate start/end you'd get
 * from showing both sets. If there's only one set, it's used for both directions.
 */
export function stopsForTrip<T extends { trip_type?: string }>(stops: T[] | undefined, tripType?: string | null): T[] {
    if (!Array.isArray(stops) || stops.length === 0) return [];
    const hasEvening = stops.some(s => s?.trip_type === 'evening');
    if (hasEvening) {
        const dir = tripType || 'morning';
        const filtered = stops.filter(s => s?.trip_type === dir);
        return filtered.length > 0 ? filtered : stops;
    }
    // Only one (morning) set: an evening trip runs it in reverse (school → home), matching
    // how the driver's getActiveTrips reverses it — so current_stop_index stays aligned.
    if (tripType === 'evening') return [...stops].reverse();
    return stops;
}

/**
 * Resolve the bus id for a child from the (nested) /students/my-children shape.
 * Returns null when no bus is assigned.
 */
export function resolveBusId(child: any): string | null {
    return child?.route?.bus?.id ?? child?.route?.bus_id ?? child?.bus?.id ?? child?.bus_id ?? null;
}
