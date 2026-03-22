"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const schoolController_1 = require("../controllers/schoolController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// Only Super Admin can manage schools
router.use(authMiddleware_1.authenticateToken);
router.use((0, authMiddleware_1.requireRole)(['super_admin']));
router.get('/', schoolController_1.getSchools);
router.post('/', schoolController_1.createSchool);
router.put('/:id', schoolController_1.updateSchool);
router.delete('/:id', schoolController_1.deleteSchool);
exports.default = router;
