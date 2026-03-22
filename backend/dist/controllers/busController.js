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
exports.deleteBus = exports.updateBus = exports.createBus = exports.getBuses = void 0;
const prisma_1 = __importDefault(require("../prisma"));
const getBuses = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const school_id = req.user.school_id;
        const whereClause = req.user.role === 'super_admin' ? {} : { school_id };
        const buses = yield prisma_1.default.bus.findMany({
            where: whereClause,
            include: { drivers: { include: { user: true } }, school: true }
        });
        res.json(buses);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching buses', error });
    }
});
exports.getBuses = getBuses;
const createBus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { bus_number, capacity } = req.body;
        const school_id = req.user.role === 'super_admin' ? req.body.school_id : req.user.school_id;
        if (!school_id) {
            return res.status(400).json({ message: 'school_id is required' });
        }
        const bus = yield prisma_1.default.bus.create({
            data: { bus_number, capacity, school_id }
        });
        res.status(201).json(bus);
    }
    catch (error) {
        res.status(500).json({ message: 'Error creating bus', error });
    }
});
exports.createBus = createBus;
const updateBus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { bus_number, capacity } = req.body;
        const bus = yield prisma_1.default.bus.findUnique({ where: { id: id } });
        if (!bus)
            return res.status(404).json({ message: 'Bus not found' });
        if (req.user.role !== 'super_admin' && bus.school_id !== req.user.school_id) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        const updatedBus = yield prisma_1.default.bus.update({
            where: { id: id },
            data: { bus_number, capacity }
        });
        res.json(updatedBus);
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating bus', error });
    }
});
exports.updateBus = updateBus;
const deleteBus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const bus = yield prisma_1.default.bus.findUnique({ where: { id: id } });
        if (!bus)
            return res.status(404).json({ message: 'Bus not found' });
        if (req.user.role !== 'super_admin' && bus.school_id !== req.user.school_id) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        yield prisma_1.default.bus.delete({ where: { id: id } });
        res.json({ message: 'Bus deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error deleting bus', error });
    }
});
exports.deleteBus = deleteBus;
