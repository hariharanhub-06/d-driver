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
exports.createRoute = exports.getRoutes = void 0;
const prisma_1 = __importDefault(require("../prisma"));
const getRoutes = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const school_id = req.user.school_id;
        const whereClause = req.user.role === 'super_admin' ? {} : { school_id };
        const routes = yield prisma_1.default.route.findMany({
            where: whereClause,
            include: { stops: true, students: true }
        });
        res.json(routes);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching routes', error });
    }
});
exports.getRoutes = getRoutes;
const createRoute = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, stops } = req.body; // stops: Array<{name, latitude, longitude}>
        const school_id = req.user.role === 'super_admin' ? req.body.school_id : req.user.school_id;
        if (!school_id)
            return res.status(400).json({ message: 'school_id is required' });
        const route = yield prisma_1.default.route.create({
            data: {
                name,
                school_id,
                stops: {
                    create: stops || []
                }
            },
            include: { stops: true }
        });
        res.status(201).json(route);
    }
    catch (error) {
        res.status(500).json({ message: 'Error creating route', error });
    }
});
exports.createRoute = createRoute;
