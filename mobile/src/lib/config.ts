// Central config. Override API_URL at build time with EXPO_PUBLIC_API_URL.
// Default mirrors the web app's default dev API.
export const API_URL =
    process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:2024/api/v1';

// Socket.IO server origin = API_URL without the /api/v1 suffix.
export const SOCKET_URL = API_URL.replace(/\/api\/v1$/, '');

// Public OSRM demo server (no key). Used for distance + ETA.
export const OSRM_BASE = 'https://router.project-osrm.org';

// Brand fallback before per-school branding loads.
export const DEFAULT_BRAND = '#2dbc75';

// Where non-mobile roles are told to go.
export const WEB_CONSOLE_URL = process.env.EXPO_PUBLIC_WEB_URL || 'https://app.d-driver.com';
