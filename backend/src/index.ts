const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const prisma = require('./prisma');
const authRoutes = require('./routes/authRoutes');
const schoolRoutes = require('./routes/schoolRoutes');
const busRoutes = require('./routes/busRoutes');
const driverRoutes = require('./routes/driverRoutes');
const routeRoutes = require('./routes/routeRoutes');
const studentRoutes = require('./routes/studentRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const locationRoutes = require('./routes/locationRoutes');
const financeRoutes = require('./routes/financeRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const userRoutes = require('./routes/userRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

const app = express();
const httpServer = require('http').createServer(app);
const { Server } = require('socket.io');

const io = new Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/v1/auth', authRoutes.default || authRoutes);
app.use('/api/v1/schools', schoolRoutes.default || schoolRoutes);
app.use('/api/v1/buses', busRoutes.default || busRoutes);
app.use('/api/v1/drivers', driverRoutes.default || driverRoutes);
app.use('/api/v1/routes', routeRoutes.default || routeRoutes);
app.use('/api/v1/students', studentRoutes.default || studentRoutes);
app.use('/api/v1/attendance', attendanceRoutes.default || attendanceRoutes);
app.use('/api/v1/location', locationRoutes.default || locationRoutes);
app.use('/api/v1/finance', financeRoutes.default || financeRoutes);
app.use('/api/v1/notifications', notificationRoutes.default || notificationRoutes);
app.use('/api/v1/users', userRoutes.default || userRoutes);
app.use('/api/v1/upload', uploadRoutes.default || uploadRoutes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'D-Driver API is running' });
});

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    const PORT = process.env.PORT || 5000;
    httpServer.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;
