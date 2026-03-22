"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const schoolRoutes_1 = __importDefault(require("./routes/schoolRoutes"));
const busRoutes_1 = __importDefault(require("./routes/busRoutes"));
const driverRoutes_1 = __importDefault(require("./routes/driverRoutes"));
const routeRoutes_1 = __importDefault(require("./routes/routeRoutes"));
const studentRoutes_1 = __importDefault(require("./routes/studentRoutes"));
const attendanceRoutes_1 = __importDefault(require("./routes/attendanceRoutes"));
const locationRoutes_1 = __importDefault(require("./routes/locationRoutes"));
const financeRoutes_1 = __importDefault(require("./routes/financeRoutes"));
const notificationRoutes_1 = __importDefault(require("./routes/notificationRoutes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 5000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/api/auth', authRoutes_1.default);
app.use('/api/schools', schoolRoutes_1.default);
app.use('/api/buses', busRoutes_1.default);
app.use('/api/drivers', driverRoutes_1.default);
app.use('/api/routes', routeRoutes_1.default);
app.use('/api/students', studentRoutes_1.default);
app.use('/api/attendance', attendanceRoutes_1.default);
app.use('/api/location', locationRoutes_1.default);
app.use('/api/finance', financeRoutes_1.default);
app.use('/api/notifications', notificationRoutes_1.default);
// Built-in basic health check route
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'D-Driver API is running' });
});
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
