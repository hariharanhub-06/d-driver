"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const studentController_1 = require("../controllers/studentController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authenticateToken);
// Parents should be able to get their own students, but for simplicity here we restrict to admins,
// and create a specific parent endpoint if needed later.
router.use((0, authMiddleware_1.requireRole)(['super_admin', 'admin']));
router.get('/', studentController_1.getStudents);
router.post('/', studentController_1.createStudent);
exports.default = router;
