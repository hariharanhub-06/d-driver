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
exports.deleteSchool = exports.updateSchool = exports.createSchool = exports.getSchools = void 0;
const prisma_1 = __importDefault(require("../prisma"));
const getSchools = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const schools = yield prisma_1.default.school.findMany();
        res.json(schools);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching schools', error });
    }
});
exports.getSchools = getSchools;
const createSchool = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, subscription_plan, status } = req.body;
        const school = yield prisma_1.default.school.create({
            data: { name, subscription_plan, status }
        });
        res.status(201).json(school);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating school', error });
    }
});
exports.createSchool = createSchool;
const updateSchool = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, subscription_plan, status } = req.body;
        const school = yield prisma_1.default.school.update({
            where: { id: id },
            data: { name, subscription_plan, status }
        });
        res.json(school);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating school', error });
    }
});
exports.updateSchool = updateSchool;
const deleteSchool = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield prisma_1.default.school.delete({ where: { id: id } });
        res.json({ message: 'School deleted successfully' });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting school', error });
    }
});
exports.deleteSchool = deleteSchool;
