"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const locationController_1 = require("../controllers/locationController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authenticateToken);
// Anyone can view location (parent, admin, etc.) but only drivers push updates
router.get('/:bus_id', locationController_1.getLatestLocation);
router.post('/', (0, authMiddleware_1.requireRole)(['driver']), locationController_1.updateLocation);
exports.default = router;
