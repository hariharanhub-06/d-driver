// Axios client: attaches the access token, does single-flight refresh on 401,
// and surfaces the backend's FIRST_LOGIN gate so the app can route to change-password.
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_URL } from './config';
import { getAccessToken, getRefreshToken, setAccessToken, clearSession } from './secureStore';

// 45s timeout: Render's free tier cold-starts (~30–60s) on the first request
// after idle, so a short timeout made the whole app look broken on launch.
const api = axios.create({ baseURL: API_URL, timeout: 45000 });

// Fire-and-forget warm-up: wakes a sleeping backend at app launch so the first
// real request (login/data) doesn't hit a cold cold-start. Safe to call often.
export async function warmUpServer(): Promise<void> {
    try { await axios.get(`${API_URL}/platform/landing`, { timeout: 60000 }); } catch { /* best effort */ }
}

// Injected by AuthContext: called when refresh fails (session is unrecoverable).
let onAuthFailure: () => void = () => {};
export const setOnAuthFailure = (fn: () => void) => { onAuthFailure = fn; };

// Injected by AuthContext: called when the backend says the user must change password first.
let onFirstLogin: () => void = () => {};
export const setOnFirstLogin = (fn: () => void) => { onFirstLogin = fn; };

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    const token = await getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Single-flight refresh lock so concurrent 401s trigger exactly one refresh.
let refreshing: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
    const rt = await getRefreshToken();
    if (!rt) return null;
    try {
        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refresh_token: rt });
        if (data?.access_token) {
            await setAccessToken(data.access_token);
            return data.access_token;
        }
        return null;
    } catch {
        return null;
    }
}

api.interceptors.response.use(
    (res) => res,
    async (error: AxiosError<any>) => {
        const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean; _netRetried?: boolean }) | undefined;
        const status = error.response?.status;
        const code = (error.response?.data as any)?.code;
        const url = original?.url || '';

        // Cold-start / transient network: retry idempotent GETs once after a short
        // delay (covers the Render free-tier wake-up timeout on first request).
        if (
            (error.code === 'ECONNABORTED' || error.message === 'Network Error' || !error.response) &&
            original && !original._netRetried && (original.method || 'get').toLowerCase() === 'get'
        ) {
            original._netRetried = true;
            await new Promise((r) => setTimeout(r, 1500));
            return api(original);
        }

        // First-login gate: never refresh, route to change-password.
        if (status === 403 && code === 'FIRST_LOGIN') {
            onFirstLogin();
            return Promise.reject(error);
        }

        // 401 → attempt one refresh (skip auth endpoints + already-retried requests).
        if (status === 401 && original && !original._retried && !url.includes('/auth/')) {
            original._retried = true;
            refreshing = refreshing ?? doRefresh();
            const token = await refreshing;
            refreshing = null;
            if (!token) {
                await clearSession();
                onAuthFailure();
                return Promise.reject(error);
            }
            original.headers.Authorization = `Bearer ${token}`;
            return api(original);
        }

        return Promise.reject(error);
    },
);

export default api;

// Typed thin wrappers used by screens.
export interface Child {
    id: string;
    name: string;
    grade?: string;
    section?: string;
    route_id?: string;
    route?: {
        id: string;
        name?: string;
        bus_id?: string;
        bus?: { id?: string; bus_number?: string; drivers?: { user?: { name?: string; phone?: string } }[] };
    };
    stop?: { id?: string; name?: string; pickup_time?: string; latitude?: number; longitude?: number };
}

export interface BusLocation {
    latitude: number;
    longitude: number;
    heading?: number | null;
    timestamp?: string;
}

export interface Branding {
    name?: string;
    logo_url?: string;
    primary_color?: string;
    permissions?: Record<string, boolean> | null;
}

export async function loginRequest(email: string, password: string) {
    const { data } = await axios.post(`${API_URL}/auth/login`, { email, password });
    return data as { access_token: string; refresh_token: string; user: any };
}

export async function getMyChildren(): Promise<Child[]> {
    const { data } = await api.get('/students/my-children');
    return Array.isArray(data) ? data : [];
}

export async function getBusLocation(busId: string): Promise<BusLocation | null> {
    try {
        const { data } = await api.get(`/location/bus/${busId}`);
        return data?.latitude != null ? (data as BusLocation) : null;
    } catch {
        return null; // 404 = no live location
    }
}

export async function getBranding(): Promise<Branding> {
    try {
        const { data } = await api.get('/schools/branding');
        return (data || {}) as Branding;
    } catch {
        return {};
    }
}

export async function changePassword(current_password: string, new_password: string) {
    await api.post('/auth/change-password', { current_password, new_password });
}

export async function registerPushToken(expo_push_token: string) {
    // Backend route is additive/optional; ignore failures so it never blocks the app.
    try {
        await api.post('/notifications/push-token', { expo_push_token });
    } catch {
        /* not yet deployed — fine */
    }
}

// ── Driver / trips / attendance ──────────────────────────────────────────────

export interface DriverRoute {
    id: string;
    name?: string;
    route_type?: string;
}

export interface DriverMe {
    id: string;
    user?: { name?: string; phone?: string; profile_photo_url?: string };
    bus?: { id?: string; bus_number?: string; routes?: DriverRoute[] };
    assigned_bus_id?: string;
    school?: { primary_color?: string };
}

export interface TripStop {
    id: string;
    name: string;
    latitude?: number;
    longitude?: number;
    sequence: number;
    trip_type?: string;
    students?: TripStudent[];
}

export interface TripStudent {
    id: string;
    name: string;
    photo_url?: string | null;
    grade?: string | null;
    stop_id?: string | null;
}

export interface ActiveTrip {
    id: string;
    route_id: string;
    bus_id: string;
    status: string;
    current_stop_index: number;
    route?: { id: string; name?: string; route_type?: string; stops?: TripStop[]; students?: TripStudent[] };
    bus?: { bus_number?: string };
    driver?: { user?: { name?: string } };
}

export async function getDriverMe(): Promise<DriverMe | null> {
    try {
        const { data } = await api.get('/drivers/me');
        return data as DriverMe;
    } catch {
        return null;
    }
}

export async function getActiveTrips(): Promise<ActiveTrip[]> {
    try {
        const { data } = await api.get('/trips/active');
        return Array.isArray(data) ? data : [];
    } catch {
        return [];
    }
}

export async function startTrip(route_id: string, route_type?: string): Promise<ActiveTrip> {
    const { data } = await api.post('/trips/start', { route_id, route_type });
    return (data?.trip ?? data) as ActiveTrip;
}

export async function completeTrip(tripId: string): Promise<void> {
    await api.post(`/trips/${tripId}/complete`);
}

export async function updateStopIndex(tripId: string, stop_index: number): Promise<void> {
    await api.patch(`/trips/${tripId}/stop-index`, { stop_index });
}

export async function markAttendance(payload: {
    student_id: string;
    status: 'present' | 'absent';
    trip_id?: string;
    attendance_type?: 'pickup' | 'dropoff';
}): Promise<void> {
    await api.post('/attendance/mark', payload);
}

// ── Admin-lite ───────────────────────────────────────────────────────────────

export interface ActiveLocation {
    bus_id: string;
    latitude: number;
    longitude: number;
    heading?: number | null;
    timestamp?: string;
}

export async function getActiveLocations(): Promise<ActiveLocation[]> {
    try {
        const { data } = await api.get('/location/active');
        const raw: any[] = Array.isArray(data) ? data : [];
        return raw.map(i => ({
            bus_id: i.bus_id || i.busId || i.location?.bus_id,
            latitude: i.latitude ?? i.location?.latitude,
            longitude: i.longitude ?? i.location?.longitude,
            heading: i.heading ?? i.location?.heading ?? null,
            timestamp: i.timestamp || i.location?.timestamp,
        })).filter(l => l.bus_id && l.latitude != null && l.longitude != null);
    } catch {
        return [];
    }
}

export async function getPendingCounts(): Promise<Record<string, number>> {
    try {
        const { data } = await api.get('/dashboard/pending-counts');
        return data || {};
    } catch {
        return {};
    }
}

export interface StopChangeReq {
    id: string;
    status: string;
    change_type?: string;
    student?: { name?: string };
    currentStop?: { name?: string };
    requestedStop?: { name?: string };
}

export async function getStopChanges(): Promise<StopChangeReq[]> {
    try { const { data } = await api.get('/stop-change'); return Array.isArray(data) ? data : []; } catch { return []; }
}
export const approveStopChange = (id: string) => api.put(`/stop-change/${id}/approve`);
export const rejectStopChange = (id: string, admin_note?: string) => api.put(`/stop-change/${id}/reject`, { admin_note });

export interface FeeDelayReq {
    id: string;
    status: string;
    reason?: string;
    requested_date?: string;
    student_name?: string;
    fee_amount?: number;
}

export async function getFeeDelays(): Promise<FeeDelayReq[]> {
    try { const { data } = await api.get('/finance/fee-delay'); return Array.isArray(data) ? data : []; } catch { return []; }
}
export const updateFeeDelay = (id: string, body: { status: string; approved_due_date?: string; admin_note?: string }) =>
    api.put(`/finance/fee-delay/${id}`, body);

export interface FuelReq {
    id: string;
    status: string;
    amount_requested?: number;
    current_km?: number;
    reason?: string;
    bus?: { bus_number?: string };
    driver?: { user?: { name?: string } };
}

export async function getFuelRequests(): Promise<FuelReq[]> {
    try { const { data } = await api.get('/fuel/requests'); return Array.isArray(data) ? data : []; } catch { return []; }
}
export const updateFuelRequest = (id: string, body: Record<string, any>) =>
    api.put(`/fuel/requests/${id}`, body);

export async function getTodayAttendance(): Promise<any> {
    try { const { data } = await api.get('/attendance/today'); return data || {}; } catch { return {}; }
}

// ── Super-admin / platform ────────────────────────────────────────────────────

export interface PlatformStats {
    schools: number;
    parents: number;
    buses_live: number;
    drivers: number;
    staff_admins: number;
}

export async function getPlatformLanding(): Promise<{ stats: PlatformStats; schools: any[] }> {
    try {
        const { data } = await api.get('/platform/landing');
        return { stats: data?.stats || ({} as PlatformStats), schools: Array.isArray(data?.schools) ? data.schools : [] };
    } catch {
        return { stats: {} as PlatformStats, schools: [] };
    }
}

export interface SchoolRow {
    id: string;
    name: string;
    slug?: string;
    logo_url?: string | null;
    status?: string;
    city?: string;
    subscription_status?: string;
    _count?: { students?: number; buses?: number; users?: number };
}

export async function getSchools(): Promise<SchoolRow[]> {
    try { const { data } = await api.get('/schools'); return Array.isArray(data) ? data : (data?.schools || []); } catch { return []; }
}
