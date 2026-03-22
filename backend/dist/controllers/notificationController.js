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
exports.createNotification = exports.getNotifications = void 0;
const prisma_1 = __importDefault(require("../prisma"));
const getNotifications = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id: user_id } = req.user;
        const notifications = yield prisma_1.default.notification.findMany({
            where: { user_id },
            orderBy: { created_at: 'desc' }
        });
        res.json(notifications);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching notifications', error });
    }
});
exports.getNotifications = getNotifications;
const createNotification = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { user_id, message, type } = req.body;
        const school_id = req.user.role === 'super_admin' ? req.body.school_id : req.user.school_id;
        if (!school_id)
            return res.status(400).json({ message: 'school_id is required' });
        const notification = yield prisma_1.default.notification.create({
            data: { user_id, message, type, school_id }
        });
        res.status(201).json(notification);
    }
    catch (error) {
        res.status(500).json({ message: 'Error creating notification', error });
    }
});
exports.createNotification = createNotification;
