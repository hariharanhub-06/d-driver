// Shared bus-tracking logic (distance, OSRM ETA, "trip started" recency, formatting).
// Kept identical to the web app's src/lib/tracking.ts so behaviour matches everywhere.
import { OSRM_BASE } from './config';

export const LIVE_WINDOW_MS = 90_000;
export const ETA_MIN_INTERVAL_MS = 15_000;
export const ETA_MIN_MOVE_M = 75;
const FALLBACK_SPEED_KMH = 25;

export type LatLng = { lat: number; lng: number };

export interface EtaResult {
    distanceM: number;
    durationS: number;
    source: 'osrm' | 'haversine';
}

const EARTH_RADIUS_M = 6_371_000;
const toRad = (deg: number) => (deg * Math.PI) / 180;

export function haversineMeters(a: LatLng, b: LatLng): number {
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const s =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

export function isLocationFresh(
    timestamp: string | number | Date | null | undefined,
    now = Date.now(),
): boolean {
    if (!timestamp) return false;
    const t = timestamp instanceof Date ? timestamp.getTime() : new Date(timestamp).getTime();
    if (Number.isNaN(t)) return false;
    return now - t <= LIVE_WINDOW_MS;
}

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

export async function fetchEta(
    busPos: LatLng,
    stopPos: LatLng,
    signal?: AbortSignal,
): Promise<EtaResult> {
    const straight = haversineMeters(busPos, stopPos);
    try {
        const url =
            `${OSRM_BASE}/route/v1/driving/` +
            `${busPos.lng},${busPos.lat};${stopPos.lng},${stopPos.lat}?overview=false`;
        const res = await fetch(url, { signal });
        const data = await res.json();
        const route = data?.routes?.[0];
        if (route && typeof route.distance === 'number' && route.distance <= straight * 3) {
            return { distanceM: route.distance, durationS: route.duration, source: 'osrm' };
        }
        throw new Error('osrm-rejected');
    } catch (err: any) {
        if (err?.name === 'AbortError') throw err;
        return {
            distanceM: straight,
            durationS: (straight / 1000 / FALLBACK_SPEED_KMH) * 3600,
            source: 'haversine',
        };
    }
}

export function formatDistance(meters: number): string {
    if (!Number.isFinite(meters)) return '—';
    if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
    return `${(meters / 1000).toFixed(1)} km`;
}

export function formatEta(durationS: number, source: EtaResult['source'] = 'osrm'): string {
    if (!Number.isFinite(durationS)) return '—';
    const min = Math.max(1, Math.round(durationS / 60));
    return source === 'haversine' ? `~${min} min (approx)` : `${min} min`;
}

export function resolveBusId(child: any): string | null {
    return child?.route?.bus?.id ?? child?.route?.bus_id ?? child?.bus?.id ?? child?.bus_id ?? null;
}
