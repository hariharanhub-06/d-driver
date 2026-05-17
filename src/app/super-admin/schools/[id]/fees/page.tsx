'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { IndianRupee, Plus, X, AlertCircle, CheckCircle2, Clock, Fuel, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import api from '@/lib/api';

interface Fee {
    id: string;
    student: { name: string };
    total_amount: number;
    due_amount: number;
    due_date: string;
    payment_method?: string;
}

interface FuelRequest {
    id: string;
    amount_requested: number;
    status: string;
    reason?: string;
    created_at: string;
    driver: { user: { name: string } };
    bus: { bus_number: string };
}

interface Student {
    id: string;
    name: string;
}

type Section = 'income' | 'fuel';

const inputCls = "w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors";
const fmt = (n: number) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function feeStatus(fee: Fee): 'paid' | 'overdue' | 'pending' {
    if (fee.due_amount === 0) return 'paid';
    if (new Date(fee.due_date) < new Date()) return 'overdue';
    return 'pending';
}

const feeStatusConfig = {
    paid:    { label: 'Paid',    cls: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',   Icon: CheckCircle2 },
    overdue: { label: 'Overdue', cls: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',               Icon: AlertCircle },
    pending: { label: 'Pending', cls: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',   Icon: Clock },
};

const fuelStatusConfig: Record<string, { label: string; cls: string }> = {
    pending:   { label: 'Pending',   cls: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800' },
    approved:  { label: 'Approved',  cls: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800' },
    disbursed: { label: 'Disbursed', cls: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800' },
    rejected:  { label: 'Rejected',  cls: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800' },
};

export default function SchoolFeesPage() {
    const { id } = useParams<{ id: string }>();
    const [section, setSection] = useState<Section>('income');

    const [fees, setFees] = useState<Fee[]>([]);
    const [fuelRequests, setFuelRequests] = useState<FuelRequest[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);

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
        try {
            const [feesRes, studRes, fuelRes] = await Promise.allSettled([
                api.get(`/finance/fees?school_id=${id}`),
                api.get(`/students?school_id=${id}`),
                api.get(`/fuel/requests?school_id=${id}`),
            ]);
            if (feesRes.status === 'fulfilled') setFees(Array.isArray(feesRes.value.data) ? feesRes.value.data : []);
            if (studRes.status === 'fulfilled') setStudents(Array.isArray(studRes.value.data) ? studRes.value.data : []);
            if (fuelRes.status === 'fulfilled') {
                const d = fuelRes.value.data;
                setFuelRequests(Array.isArray(d) ? d : Array.isArray(d?.requests) ? d.requests : []);
            }
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

    const handleFuelAction = async (reqId: string, status: 'approved' | 'rejected' | 'disbursed') => {
        try {
            await api.put(`/fuel/requests/${reqId}`, { status });
            fetchAll();
        } catch (e: any) {
            alert(e.response?.data?.message || 'Action failed.');
        }
    };

    // Summary numbers
    const totalCollected = fees.reduce((s, f) => s + (f.total_amount - f.due_amount), 0);
    const totalPending   = fees.reduce((s, f) => s + f.due_amount, 0);
    const totalFuelSpent = fuelRequests
        .filter(r => r.status === 'disbursed' || r.status === 'approved')
        .reduce((s, r) => s + r.amount_requested, 0);
    const netBalance = totalCollected - totalFuelSpent;

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <Wallet className="w-5 h-5 text-[var(--brand)]" />
                    <h2 className="text-slate-900 dark:text-white font-bold text-lg">Finance</h2>
                </div>
                {section === 'income' && (
                    <button
                        onClick={() => { setFeeForm({ student_id: '', total_amount: '', due_date: '' }); setFeeError(''); setFeeModal(true); }}
                        className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95"
                    >
                        <Plus className="w-4 h-4" /> Add Fee
                    </button>
                )}
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Fee Collected</p>
                    </div>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">{fmt(totalCollected)}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-amber-500" />
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Fee Pending</p>
                    </div>
                    <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{fmt(totalPending)}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Fuel className="w-4 h-4 text-red-500" />
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Fuel Expense</p>
                    </div>
                    <p className="text-xl font-bold text-red-600 dark:text-red-400">{fmt(totalFuelSpent)}</p>
                </div>
                <div className={`rounded-2xl shadow-sm border p-4 ${netBalance >= 0 ? 'bg-[var(--brand)] border-[var(--brand)]' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}>
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingDown className={`w-4 h-4 ${netBalance >= 0 ? 'text-white/80' : 'text-slate-500'}`} />
                        <p className={`text-xs font-semibold uppercase tracking-wider ${netBalance >= 0 ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>Net Balance</p>
                    </div>
                    <p className={`text-xl font-bold ${netBalance >= 0 ? 'text-white' : 'text-red-600 dark:text-red-400'}`}>{fmt(netBalance)}</p>
                </div>
            </div>

            {/* Section tabs */}
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-700/50 rounded-xl p-1 w-fit border border-slate-200 dark:border-slate-600">
                {([['income', 'Fee Income'], ['fuel', 'Fuel Expenses']] as [Section, string][]).map(([key, label]) => (
                    <button
                        key={key}
                        onClick={() => setSection(key)}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${section === key ? 'bg-[var(--brand)] text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700'}`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* ── Fee Income ── */}
            {section === 'income' && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        {loading ? (
                            <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" /></div>
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
                                        const { label, cls, Icon } = feeStatusConfig[status];
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
                                                        <button onClick={() => { setPayModal(fee); setPayForm({ amount: String(fee.due_amount), note: '' }); setPayError(''); }} className="flex items-center gap-1.5 bg-[var(--brand)]/10 border border-[var(--brand)]/20 text-[var(--brand)] rounded-xl px-3 py-1.5 font-semibold text-xs hover:bg-[var(--brand)]/20 transition-colors">
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
            )}

            {/* ── Fuel Expenses ── */}
            {section === 'fuel' && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        {loading ? (
                            <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" /></div>
                        ) : fuelRequests.length === 0 ? (
                            <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">No fuel requests yet.</div>
                        ) : (
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-slate-700">
                                        {['Driver', 'Bus', 'Amount Requested', 'Reason', 'Date', 'Status', 'Actions'].map(col => (
                                            <th key={col} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-700/50">{col}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {fuelRequests.map(req => {
                                        const sc = fuelStatusConfig[req.status] || fuelStatusConfig.pending;
                                        return (
                                            <tr key={req.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">{req.driver?.user?.name || '—'}</td>
                                                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{req.bus?.bus_number || '—'}</td>
                                                <td className="px-4 py-3 text-sm font-semibold text-red-600 dark:text-red-400">{fmt(req.amount_requested)}</td>
                                                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 max-w-[160px] truncate">{req.reason || '—'}</td>
                                                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{new Date(req.created_at).toLocaleDateString('en-IN')}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${sc.cls}`}>{sc.label}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {req.status === 'pending' && (
                                                        <div className="flex items-center gap-2">
                                                            <button onClick={() => handleFuelAction(req.id, 'approved')} className="text-xs font-semibold bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 rounded-lg px-2.5 py-1 hover:bg-blue-100 transition-colors">Approve</button>
                                                            <button onClick={() => handleFuelAction(req.id, 'rejected')} className="text-xs font-semibold bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg px-2.5 py-1 hover:bg-red-100 transition-colors">Reject</button>
                                                        </div>
                                                    )}
                                                    {req.status === 'approved' && (
                                                        <button onClick={() => handleFuelAction(req.id, 'disbursed')} className="text-xs font-semibold bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 rounded-lg px-2.5 py-1 hover:bg-green-100 transition-colors">Mark Disbursed</button>
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
            )}

            {/* Add Fee Modal */}
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
