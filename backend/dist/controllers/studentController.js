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
exports.createStudent = exports.getStudents = void 0;
const prisma_1 = __importDefault(require("../prisma"));
const getStudents = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const school_id = req.user.school_id;
        const whereClause = req.user.role === 'super_admin' ? {} : { school_id };
        const students = yield prisma_1.default.student.findMany({
            where: whereClause,
            include: { route: true, stop: true, parent: { select: { id: true, name: true, email: true } } }
        });
        res.json(students);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching students', error });
    }
});
exports.getStudents = getStudents;
const createStudent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, parent_id, route_id, stop_id } = req.body;
        const school_id = req.user.role === 'super_admin' ? req.body.school_id : req.user.school_id;
        if (!school_id)
            return res.status(400).json({ message: 'school_id is required' });
        const student = yield prisma_1.default.student.create({
            data: { name, parent_id, route_id, stop_id, school_id }
        });
        res.status(201).json(student);
    }
    catch (error) {
        res.status(500).json({ message: 'Error creating student', error });
    }
});
exports.createStudent = createStudent;
