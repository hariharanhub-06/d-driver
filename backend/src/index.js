const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
dotenv.config();

// Fail fast if critical secrets are missing
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be set in .env and at least 32 characters');
}
if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) {
  throw new Error('JWT_REFRESH_SECRET must be set in .env and at least 32 characters');
}

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
const stopRoutes = require('./routes/stopRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const shiftRoutes = require('./routes/shiftRoutes');
const tripRoutes = require('./routes/tripRoutes');
const busSwitchRoutes = require('./routes/busSwitchRoutes');
const fuelRoutes = require('./routes/fuelRoutes');
const absenceRoutes = require('./routes/absenceRoutes');
const stopChangeRoutes = require('./routes/stopChangeRoutes');
const billingRoutes = require('./routes/billingRoutes');
const reportRoutes = require('./routes/reportRoutes');
const parentRoutes = require('./routes/parentRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

const app = express();
const httpServer = require('http').createServer(app);
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      process.env.FRONTEND_URL,
      'https://d-driver.vercel.app',
      /\.vercel\.app$/,
      /\.ddriver\.app$/,
    ].filter(Boolean)
  : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const allowed = allowedOrigins.some(o =>
      typeof o === 'string' ? o === origin : o.test(origin)
    );
    allowed ? callback(null, true) : callback(new Error('CORS: origin not allowed'));
  },
  credentials: true,
};

// ─── SOCKET.IO ────────────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
});

// JWT authentication on every Socket.io connection
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Unauthorized: no token'));
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = payload;
    next();
  } catch {
    next(new Error('Unauthorized: invalid token'));
  }
});

io.on('connection', (socket) => {
  socket.on('join-parent-room',  (userId)   => socket.join(`parent-${userId}`));
  socket.on('join-driver-room',  (driverId) => socket.join(`driver-${driverId}`));
  socket.on('join-school-room',  (schoolId) => socket.join(`school-${schoolId}`));
  socket.on('join-admin-room',   (schoolId) => socket.join(`admin-${schoolId}`));
  socket.on('disconnect', () => {});
});

// Expose io so controllers can emit events
app.set('io', io);

// ─── CRON JOBS ────────────────────────────────────────────────────────────────
const cron = require('node-cron');

// Monthly billing cron — runs at midnight on the 1st of each month
// Also reads BillingConfig.billing_cycle_day to confirm
cron.schedule('0 0 1 * *', async () => {
  console.log('[CRON] Running monthly invoice generation...');
  try {
    const config = await prisma.billingConfig.findUnique({ where: { id: 'singleton' } });
    const day = config?.billing_cycle_day || 1;
    const today = new Date().getDate();
    if (today !== day) return; // Only run on configured day

    const schools = await prisma.school.findMany({
      where: { status: 'active', plan_id: { not: null } },
      select: { id: true },
    });

    const now = new Date();
    const billingMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    for (const school of schools) {
      try {
        // Check if invoice already exists for this month
        const existing = await prisma.schoolInvoice.findFirst({
          where: { school_id: school.id, billing_month: billingMonth },
        });
        if (existing) continue;

        const { generateInvoiceForSchool } = require('./utils/invoiceGenerator');
        await generateInvoiceForSchool(school.id, billingMonth);
      } catch (e) {
        console.error(`[CRON] Invoice generation failed for school ${school.id}:`, e.message);
      }
    }
    console.log(`[CRON] Monthly invoices generated for ${schools.length} schools`);
  } catch (e) {
    console.error('[CRON] Billing cron error:', e.message);
  }
});

// Fee auto-generation cron — runs daily at 6am, generates fees due today
cron.schedule('0 6 * * *', async () => {
  try {
    const today = new Date();
    const dayOfMonth = today.getDate();

    // Find all active fee structures with due_day = today
    const structures = await prisma.feeStructure.findMany({
      where: { is_active: true, due_day: dayOfMonth },
      include: { student: { select: { school_id: true } } },
    });

    let generated = 0;
    for (const fs of structures) {
      // Check if fee already exists for this period
      const periodStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const existing = await prisma.fee.findFirst({
        where: { student_id: fs.student_id, due_date: { gte: periodStart } },
      });
      if (!existing) {
        await prisma.fee.create({
          data: {
            student_id: fs.student_id,
            school_id: fs.student.school_id,
            total_amount: fs.amount,
            due_amount: fs.amount,
            due_date: today,
          },
        });
        generated++;
      }
    }
    if (generated > 0) console.log(`[CRON] Generated ${generated} fee records`);
  } catch (e) {
    console.error('[CRON] Fee cron error:', e.message);
  }
});

// ─── SECURITY MIDDLEWARE ──────────────────────────────────────────────────────
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// Strict rate limit on login — 10 attempts per 15 minutes
app.use('/api/v1/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
}));

// Forgot password — 5 requests per 15 minutes per IP
app.use('/api/v1/auth/forgot-password', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many password reset requests. Try again later.' },
}));

// General API — 100 requests per minute
app.use('/api/v1/', rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Rate limit exceeded. Slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
}));

// ─── ROUTES ───────────────────────────────────────────────────────────────────
app.use('/api/v1/auth',          authRoutes.default         || authRoutes);
app.use('/api/v1/dashboard',     dashboardRoutes.default    || dashboardRoutes);
app.use('/api/v1/schools',       schoolRoutes.default       || schoolRoutes);
app.use('/api/v1/buses',         busRoutes.default          || busRoutes);
app.use('/api/v1/drivers',       driverRoutes.default       || driverRoutes);
app.use('/api/v1/routes',        routeRoutes.default        || routeRoutes);
app.use('/api/v1/students',      studentRoutes.default      || studentRoutes);
app.use('/api/v1/attendance',    attendanceRoutes.default   || attendanceRoutes);
app.use('/api/v1/location',      locationRoutes.default     || locationRoutes);
app.use('/api/v1/finance',       financeRoutes.default      || financeRoutes);
app.use('/api/v1/notifications', notificationRoutes.default || notificationRoutes);
app.use('/api/v1/users',         userRoutes.default         || userRoutes);
app.use('/api/v1/stops',         stopRoutes.default         || stopRoutes);
app.use('/api/v1/shifts',        shiftRoutes.default        || shiftRoutes);
app.use('/api/v1/trips',         tripRoutes.default         || tripRoutes);
app.use('/api/v1/bus-switch',    busSwitchRoutes.default    || busSwitchRoutes);
app.use('/api/v1/fuel',          fuelRoutes.default         || fuelRoutes);
app.use('/api/v1/absence',       absenceRoutes.default      || absenceRoutes);
app.use('/api/v1/stop-change',   stopChangeRoutes.default   || stopChangeRoutes);
app.use('/api/v1/billing',       billingRoutes.default      || billingRoutes);
app.use('/api/v1/reports',       reportRoutes.default       || reportRoutes);
app.use('/api/v1/parents',       parentRoutes.default       || parentRoutes);
app.use('/api/v1/upload',        uploadRoutes.default       || uploadRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'D-Driver API is running' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  if (err.message?.startsWith('CORS')) {
    return res.status(403).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── START ────────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  httpServer.listen(PORT, () => {
    console.log(`D-Driver API running on port ${PORT}`);
  });
}

module.exports = app;
