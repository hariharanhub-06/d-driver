"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAttendance = exports.getAttendance = void 0;
const prisma_1 = __importDefault(require("../prisma"));
const getAttendance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const school_id = req.user.school_id || undefined;
        const { date, route_id, student_id } = req.query;
        const whereClause = {};
        if (school_id)
            whereClause.school_id = school_id;
        if (student_id)
            whereClause.student_id = student_id;
        if (date) {
            whereClause.date = {
                gte: new Date(date),
                lt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000),
            };
        }
        const attendances = yield prisma_1.default.attendance.findMany({
            where: whereClause,
            include: { student: true }
        });
        const filtered = route_id
            ? attendances.filter((a) => a.student.route_id === route_id)
            : attendances;
        res.json(filtered);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching attendance', error });
    }
});
exports.getAttendance = getAttendance;
const markAttendance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { student_id, status } = req.body;
        const school_id = req.user.role === 'super_admin' ? req.body.school_id : req.user.school_id;
        if (!school_id)
            return res.status(400).json({ message: 'school_id is required' });
        const attendance = yield prisma_1.default.attendance.create({
            data: { student_id, status, school_id }
        });
        res.status(201).json(attendance);
    }
    catch (error) {
        res.status(500).json({ message: 'Error marking attendance', error });
    }
});
exports.markAttendance = markAttendance;
