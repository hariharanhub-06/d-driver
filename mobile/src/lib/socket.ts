// Socket.IO singleton. Connects with the access token, re-authenticates on
// refresh, and reconnects when the app returns to foreground.
import { io, Socket } from 'socket.io-client';
import { AppState } from 'react-native';
import { SOCKET_URL } from './config';
import { getAccessToken } from './secureStore';

let socket: Socket | null = null;
let appStateBound = false;
// Single re-join handler so navigating between screens / reconnecting never
// accumulates duplicate 'connect' listeners.
let rejoinHandler: (() => void) | null = null;

function setRejoin(join: () => void) {
    if (!socket) return;
    if (rejoinHandler) socket.off('connect', rejoinHandler);
    rejoinHandler = join;
    socket.on('connect', join);
    join(); // run now (already connected) and on every future reconnect
}

export async function connectSocket(): Promise<Socket> {
    if (socket?.connected) return socket;
    const token = await getAccessToken();
    if (!socket) {
        socket = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 2000,
        });
        bindAppState();
    } else {
        socket.auth = { token };
        socket.connect();
    }
    return socket;
}

// Join the rooms a parent needs after (re)connecting.
export function joinParentRooms(userId: string, schoolId?: string) {
    setRejoin(() => {
        socket?.emit('join-parent-room', userId);
        if (schoolId) socket?.emit('join-school-room', schoolId);
    });
}

// Join the school room (admins + bus-staff get trip-started/-completed, location).
export function joinSchoolRoom(schoolId: string) {
    setRejoin(() => socket?.emit('join-school-room', schoolId));
}

// Join the driver's personal room (for request-km-entry etc.) after (re)connecting.
export function joinDriverRoom(driverUserId: string) {
    setRejoin(() => socket?.emit('join-driver-room', driverUserId));
}

// Driver GPS broadcast — server expects { busId, lat, lng, heading }.
export function emitLocation(busId: string, lat: number, lng: number, heading?: number | null) {
    socket?.emit('update-location', { busId, lat, lng, heading: heading ?? null });
}

export function getSocket(): Socket | null {
    return socket;
}

// Swap in a fresh token (after refresh) and re-handshake.
export async function reauthSocket() {
    if (!socket) return;
    const token = await getAccessToken();
    socket.auth = { token };
    socket.disconnect().connect();
}

export function disconnectSocket() {
    socket?.removeAllListeners();
    socket?.disconnect();
    socket = null;
    rejoinHandler = null;
}

function bindAppState() {
    if (appStateBound) return;
    appStateBound = true;
    AppState.addEventListener('change', (state) => {
        if (state === 'active' && socket && !socket.connected) socket.connect();
    });
}
