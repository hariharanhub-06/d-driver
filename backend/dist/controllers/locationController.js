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
exports.updateLocation = exports.getLatestLocation = void 0;
const prisma_1 = __importDefault(require("../prisma"));
const getLatestLocation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { bus_id } = req.params;
        const school_id = req.user.school_id;
        const whereClause = { bus_id };
        if (req.user.role !== 'super_admin') {
            whereClause.school_id = school_id;
        }
        const location = yield prisma_1.default.location.findFirst({
            where: whereClause,
            orderBy: { timestamp: 'desc' }
        });
        if (!location)
            return res.status(404).json({ message: 'Location not found' });
        res.json(location);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching location', error });
    }
});
exports.getLatestLocation = getLatestLocation;
const updateLocation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { bus_id, latitude, longitude } = req.body;
        const school_id = req.user.role === 'super_admin' ? req.body.school_id : req.user.school_id;
        if (!school_id)
            return res.status(400).json({ message: 'school_id is required' });
        const location = yield prisma_1.default.location.create({
            data: { bus_id, latitude, longitude, school_id }
        });
        res.status(201).json(location);
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating location', error });
    }
});
exports.updateLocation = updateLocation;
