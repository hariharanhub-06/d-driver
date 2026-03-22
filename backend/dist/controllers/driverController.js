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
exports.assignBusToDriver = exports.getDrivers = void 0;
const prisma_1 = __importDefault(require("../prisma"));
const getDrivers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const school_id = req.user.school_id;
        const whereClause = req.user.role === 'super_admin' ? {} : { school_id };
        const drivers = yield prisma_1.default.driver.findMany({
            where: whereClause,
            include: { user: true, bus: true }
        });
        res.json(drivers);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching drivers', error });
    }
});
exports.getDrivers = getDrivers;
const assignBusToDriver = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { bus_id } = req.body;
        const driver = yield prisma_1.default.driver.findUnique({ where: { id: id } });
        if (!driver)
            return res.status(404).json({ message: 'Driver not found' });
        if (req.user.role !== 'super_admin' && driver.school_id !== req.user.school_id) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        const updatedDriver = yield prisma_1.default.driver.update({
            where: { id: id },
            data: { assigned_bus_id: bus_id }
        });
        res.json(updatedDriver);
    }
    catch (error) {
        res.status(500).json({ message: 'Error assigning bus', error });
    }
});
exports.assignBusToDriver = assignBusToDriver;
