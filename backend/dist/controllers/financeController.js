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
exports.recordPayment = exports.createFee = exports.getFees = void 0;
const prisma_1 = __importDefault(require("../prisma"));
const getFees = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const school_id = req.user.school_id;
        const { student_id } = req.query;
        const whereClause = req.user.role === 'super_admin' ? {} : { school_id };
        if (student_id)
            whereClause.student_id = student_id;
        const fees = yield prisma_1.default.fee.findMany({
            where: whereClause,
            include: { student: true, payments: true }
        });
        res.json(fees);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching fees', error });
    }
});
exports.getFees = getFees;
const createFee = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { student_id, total_amount, due_date } = req.body;
        const school_id = req.user.role === 'super_admin' ? req.body.school_id : req.user.school_id;
        if (!school_id)
            return res.status(400).json({ message: 'school_id is required' });
        const fee = yield prisma_1.default.fee.create({
            data: {
                student_id,
                total_amount,
                due_amount: total_amount,
                due_date: new Date(due_date),
                school_id
            }
        });
        res.status(201).json(fee);
    }
    catch (error) {
        res.status(500).json({ message: 'Error creating fee', error });
    }
});
exports.createFee = createFee;
const recordPayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { fee_id, amount } = req.body;
        const school_id = req.user.role === 'super_admin' ? req.body.school_id : req.user.school_id;
        const fee = yield prisma_1.default.fee.findUnique({ where: { id: fee_id } });
        if (!fee)
            return res.status(404).json({ message: 'Fee not found' });
        const newDueAmount = fee.due_amount - amount;
        const status = newDueAmount <= 0 ? 'paid' : 'pending';
        const payment = yield prisma_1.default.payment.create({
            data: {
                fee_id,
                amount,
                status: status,
                school_id
            }
        });
        yield prisma_1.default.fee.update({
            where: { id: fee_id },
            data: { due_amount: newDueAmount > 0 ? newDueAmount : 0 }
        });
        res.status(201).json(payment);
    }
    catch (error) {
        res.status(500).json({ message: 'Error recording payment', error });
    }
});
exports.recordPayment = recordPayment;
