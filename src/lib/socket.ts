import { io, Socket } from 'socket.io-client';
import { authStorage } from './authStorage';

let _socket: Socket | null = null;

export function getSocket(): Socket {
    if (!_socket) {
        const token = authStorage.get('access_token');
        const baseUrl = (
            process.env.NEXT_PUBLIC_API_URL || 'http://localhost:2024/api/v1'
        ).replace('/api/v1', '');

        _socket = io(baseUrl, {
            auth: { token },
            reconnection: true,
            reconnectionAttempts: 5,
            transports: ['websocket', 'polling'],
        });
    }
    return _socket;
}

/** Alias for getSocket — initializes and returns the socket instance. */
export const connectSocket = (_id?: string): Socket => getSocket();

export function disconnectSocket() {
    if (_socket) {
        _socket.disconnect();
        _socket = null;
    }
}
