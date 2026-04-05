import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();
console.log('DEBUG: DATABASE_URL exists:', !!process.env.DATABASE_URL);

import prisma from './prisma';

import authRoutes from './routes/authRoutes';
import schoolRoutes from './routes/schoolRoutes';
import busRoutes from './routes/busRoutes';
import driverRoutes from './routes/driverRoutes';
import routeRoutes from './routes/routeRoutes';
import studentRoutes from './routes/studentRoutes';
import attendanceRoutes from './routes/attendanceRoutes';
import locationRoutes from './routes/locationRoutes';
import financeRoutes from './routes/financeRoutes';
import notificationRoutes from './routes/notificationRoutes';
import userRoutes from './routes/userRoutes';
import uploadRoutes from './routes/uploadRoutes';

import { createServer } from 'http';
import { Server } from 'socket.io';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Create HTTP Server required for Socket.io
const httpServer = createServer(app);

// Initialize Socket.io Server
const io = new Server(httpServer, {
    cors: {
        origin: '*', // Allow connections from Next.js frontend
        methods: ['GET', 'POST']
    }
});

app.use(cors());
app.use(express.json());

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/schools', schoolRoutes);
app.use('/api/v1/buses', busRoutes);
app.use('/api/v1/drivers', driverRoutes);
app.use('/api/v1/routes', routeRoutes);
app.use('/api/v1/students', studentRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/location', locationRoutes);
app.use('/api/v1/finance', financeRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/upload', uploadRoutes);

// Built-in basic health check route
app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', message: 'D-Driver API is running' });
});

// Socket.io Connection Logic
io.on('connection', (socket) => {
    console.log(`🔌 New client connected: ${socket.id}`);

    // Join a specific room based on the bus ID (Drivers and Parents will join this room)
    socket.on('join-bus-room', (busId: string) => {
        socket.join(`bus-${busId}`);
        console.log(`📡 Client ${socket.id} joined room: bus-${busId}`);
    });

    // Handle incoming location updates from Drivers
    socket.on('update-location', (data: { busId: string; lat: number; lng: number }) => {
        // Broadcast the location to everyone in the bus's room
        io.to(`bus-${data.busId}`).emit('location-updated', {
            lat: data.lat,
            lng: data.lng,
            timestamp: new Date().toISOString()
        });
    });

    // Handle high-priority global alerts (like SOS or System Broadcasts)
    socket.on('trigger-alert', (data: { message: string; type: 'info' | 'error' | 'success' }) => {
        console.log(`🚨 Global Alert triggered: ${data.message}`);
        // For demonstration, broadcast to EVERY connected client
        io.emit('new-notification', {
            id: Date.now().toString(),
            message: data.message,
            type: data.type,
            time: new Date().toLocaleTimeString()
        });
    });

    socket.on('disconnect', () => {
        console.log(`❌ Client disconnected: ${socket.id}`);
    });
});

// Vercel Serverless Export
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    const PORT = process.env.PORT || 5000;
    httpServer.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

export default app;
