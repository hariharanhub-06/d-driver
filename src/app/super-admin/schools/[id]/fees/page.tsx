'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { IndianRupee, Plus, X, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import api from '@/lib/api';

interface Fee {
    id: string;
    student: { name: string };
    total_amount: number;
    due_amount: number;
    due_date: string;
    payment_method?: string;
}

interface Student {
    id: string;
    name: string;
}

const inputCls = "w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors";
const fmt = (n: number) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function feeStatus(fee: Fee): 'paid' | 'overdue' | 'pending' {
    if (fee.due_amount === 0) return 'paid';
    if (new Date(fee.due_date) < new Date()) return 'overdue';
    return 'pending';
}

const statusConfig = {
    paid: { label: 'Paid', cls: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800', Icon: CheckCircle2 },
    overdue: { label: 'Overdue', cls: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800', Icon: AlertCircle },
    pending: { label: 'Pending', cls: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800', Icon: Clock },
};

export default function SchoolFeesPage() {
    const { id } = useParams<{ id: string }>();
    const [fees, setFees] = useState<Fee[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [feeModal, setFeeModal] = useState(false);
    const [feeForm, setFeeForm] = useState({ student_id: '', total_amount: '', due_date: '' });
    const [feeSaving, setFeeSaving] = useState(false);
    const [feeError, setFeeError] = useState('');

    const [payModal, setPayModal] = useState<Fee | null>(null);
    const [payForm, setPayForm] = useState({ amount: '', note: '' });
    const [paySaving, setPaySaving] = useState(false);
    const [payError, setPayError] = useState('');

    useEffect(() => { fetchAll(); }, [id]);

    const fetchAll = async () => {
        setLoading(true);
        setError('');
        try {
            const [feesRes, studRes] = await Promise.allSettled([
                api.get(`/finance/fees?school_id=${id}`),
                api.get(`/students?school_id=${id}`),
            ]);
            if (feesRes.status === 'fulfilled') setFees(Array.isArray(feesRes.value.data) ? feesRes.value.data : []);
            if (studRes.status === 'fulfilled') setStudents(Array.isArray(studRes.value.data) ? studRes.value.data : []);
        } catch (e: any) {
            setError('Failed to load fees.');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateFee = async () => {
        if (!feeForm.student_id) { setFeeError('Please select a student.'); return; }
        if (!feeForm.total_amount) { setFeeError('Amount is required.'); return; }
        if (!feeForm.due_date) { setFeeError('Due date is required.'); return; }
        setFeeSaving(true);
        setFeeError('');
        try {
            await api.post('/finance/fees', {
                student_id: feeForm.student_id,
                total_amount: Number(feeForm.total_amount),
                due_amount: Number(feeForm.total_amount),
                due_date: feeForm.due_date,
                school_id: id,
            });
            setFeeModal(false);
            setFeeForm({ student_id: '', total_amount: '', due_date: '' });
            fetchAll();
        } catch (e: any) {
            setFeeError(e.response?.data?.message || 'Failed to create fee.');
        } finally {
            setFeeSaving(false);
        }
    };

    const openPayModal = (fee: Fee) => {
        setPayModal(fee);
        setPayForm({ amount: String(fee.due_amount), note: '' });
        setPayError('');
    };

    const handlePayment = async () => {
        if (!payModal) return;
        if (!payForm.amount || Number(payForm.amount) <= 0) { setPayError('Enter a valid amount.'); return; }
        setPaySaving(true);
        setPayError('');
        try {
            await api.post('/finance/payment/manual', {
                fee_id: payModal.id,
                amount: Number(payForm.amount),
                note: payForm.note || undefined,
            });
            setPayModal(null);
            fetchAll();
        } catch (e: any) {
            setPayError(e.response?.data?.message || 'Failed to record payment.');
        } finally {
            setPaySaving(false);
        }
    };

    const totalCollected = fees.reduce((s, f) => s + (f.total_amount - f.due_amount), 0);
    const totalPending = fees.reduce((s, f) => s + f.due_amount, 0);

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <IndianRupee className="w-5 h-5 text-[var(--brand)]" />
                    <h2 className="text-slate-900 dark:text-white font-bold text-lg">Fees</h2>
                    <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full px-2.5 py-0.5 font-medium">{fees.length}</span>
                </div>
                <button
                    onClick={() => { setFeeForm({ student_id: '', total_amount: '', due_date: '' }); setFeeError(''); setFeeModal(true); }}
                    className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95"
                >
                    <Plus className="w-4 h-4" /> Add Fee
                </button>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Collected</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{fmt(totalCollected)}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Pending</p>
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{fmt(totalPending)}</p>
                </div>
            </div>

            {error && (
                <p className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/30 rounded-xl px-4 py-3 border border-red-200 dark:border-red-800">{error}</p>
            )}

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex justify-center py-16">
                            <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : fees.length === 0 ? (
                        <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">No fees found. Add one to get started.</div>
                    ) : (
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-700">
                                    {['Student', 'Amount', 'Due Amount', 'Due Date', 'Status', 'Actions'].map(col => (
                                        <th key={col} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-700/50">{col}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {fees.map(fee => {
                                    const status = feeStatus(fee);
                                    const { label, cls, Icon } = statusConfig[status];
                                    return (
                                        <tr key={fee.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                            <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">{fee.student.name}</td>
                                            <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{fmt(fee.total_amount)}</td>
                                            <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{fmt(fee.due_amount)}</td>
                                            <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{new Date(fee.due_date).toLocaleDateString('en-IN')}</td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${cls}`}>
                                                    <Icon className="w-3 h-3" /> {label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {status !== 'paid' && (
                                                    <button onClick={() => openPayModal(fee)} className="flex items-center gap-1.5 bg-[var(--brand)]/10 border border-[var(--brand)]/20 text-[var(--brand)] rounded-xl px-3 py-1.5 font-semibold text-xs hover:bg-[var(--brand)]/20 transition-colors">
                                                        Record Payment
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Create Fee Modal */}
            {feeModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700">
                            <h2 className="text-slate-900 dark:text-white font-bold text-base">Add Fee</h2>
                            <button onClick={() => setFeeModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 transition-colors"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Student <span className="text-red-500">*</span></label>
                                <select className={inputCls} value={feeForm.student_id} onChange={e => setFeeForm(p => ({ ...p, student_id: e.target.value }))}>
                                    <option value="">Select student…</option>
                                    {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Total Amount (₹) <span className="text-red-500">*</span></label>
                                <input type="number" className={inputCls} placeholder="5000" value={feeForm.total_amount} onChange={e => setFeeForm(p => ({ ...p, total_amount: e.target.value }))} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Due Date <span className="text-red-500">*</span></label>
                                <input type="date" className={inputCls} value={feeForm.due_date} onChange={e => setFeeForm(p => ({ ...p, due_date: e.target.value }))} />
                            </div>
                            {feeError && <p className="text-red-600 dark:text-red-400 text-xs font-medium bg-red-50 dark:bg-red-900/30 rounded-xl px-4 py-3 border border-red-200 dark:border-red-800">{feeError}</p>}
                        </div>
                        <div className="flex gap-3 px-6 pb-6">
                            <button onClick={() => setFeeModal(false)} className="flex-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-4 py-2.5 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">Cancel</button>
                            <button onClick={handleCreateFee} disabled={feeSaving} className="flex-1 flex items-center justify-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95 disabled:opacity-50">
                                {feeSaving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                                Add Fee
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Record Payment Modal */}
            {payModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700">
                            <div>
                                <h2 className="text-slate-900 dark:text-white font-bold text-base">Record Payment</h2>
                                <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">{payModal.student.name} — Due: {fmt(payModal.due_amount)}</p>
                            </div>
                            <button onClick={() => setPayModal(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 transition-colors"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Amount (₹)</label>
                                <input type="number" className={inputCls} value={payForm.amount} onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Note (optional)</label>
                                <input className={inputCls} placeholder="e.g. Cash payment" value={payForm.note} onChange={e => setPayForm(p => ({ ...p, note: e.target.value }))} />
                            </div>
                            {payError && <p className="text-red-600 dark:text-red-400 text-xs font-medium bg-red-50 dark:bg-red-900/30 rounded-xl px-4 py-3 border border-red-200 dark:border-red-800">{payError}</p>}
                        </div>
                        <div className="flex gap-3 px-6 pb-6">
                            <button onClick={() => setPayModal(null)} className="flex-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-4 py-2.5 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">Cancel</button>
                            <button onClick={handlePayment} disabled={paySaving} className="flex-1 flex items-center justify-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95 disabled:opacity-50">
                                {paySaving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                                Confirm Payment
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
