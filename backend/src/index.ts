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

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api/buses', busRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);

// Built-in basic health check route
app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', message: 'D-Driver API is running' });
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
