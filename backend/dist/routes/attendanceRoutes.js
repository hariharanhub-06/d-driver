"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const attendanceController_1 = require("../controllers/attendanceController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authenticateToken);
// Drivers can mark attendance, Admins and parents can view
router.get('/', attendanceController_1.getAttendance);
router.post('/', (0, authMiddleware_1.requireRole)(['super_admin', 'admin', 'driver']), attendanceController_1.markAttendance);
exports.default = router;
