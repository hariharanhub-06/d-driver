import { io } from 'socket.io-client';

// Construct the backend URL safely
const getWsUrl = () => {
    if (typeof window !== 'undefined') {
        const url = process.env.NEXT_PUBLIC_API_URL || window.location.origin;
        // Ensure we don't append /api to the base URL for the WebSocket namespace
        return url.replace('/api', '').replace('/v1', '');
    }
    return '';
};

// Initialize the socket singleton
export const socket = io(getWsUrl(), {
    autoConnect: false, // Wait until explicit connection
    transports: ['websocket', 'polling'] // Prefer WebSocket
});

// Utility to handle safe connections
export const connectSocket = (busId: string) => {
    if (!socket.connected) {
        socket.connect();
    }
    socket.emit('join-bus-room', busId);
};
