import { io, Socket } from 'socket.io-client';

const getWsUrl = () => {
    if (typeof window !== 'undefined') {
        const url = process.env.NEXT_PUBLIC_API_URL || window.location.origin;
        return url.replace('/api', '').replace('/v1', '');
    }
    return '';
};

const isVercel = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app');

// If we are natively on Vercel without an external Render backend, completely silence Sockets.
export const socket = isVercel
    ? {
        connected: false,
        connect: () => { },
        disconnect: () => { },
        emit: () => { },
        on: () => { },
        off: () => { }
    } as unknown as Socket
    : io(getWsUrl(), {
        autoConnect: false,
        transports: ['websocket', 'polling']
    });

// Utility to handle safe connections
export const connectSocket = (busId: string) => {
    if (!socket.connected) {
        if (typeof socket.connect === 'function') socket.connect();
    }
    if (typeof socket.emit === 'function') socket.emit('join-bus-room', busId);
};
