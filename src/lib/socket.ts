import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
    if (!socket) {
        const token =
            typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
        const baseUrl = (
            process.env.NEXT_PUBLIC_API_URL || 'http://localhost:2024/api/v1'
        ).replace('/api/v1', '');

        socket = io(baseUrl, {
            auth: { token },
            reconnection: true,
            reconnectionAttempts: 5,
            transports: ['websocket', 'polling'],
        });
    }
    return socket;
}

export function disconnectSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}
