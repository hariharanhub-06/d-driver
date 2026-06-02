'use client';

import { useState, useEffect } from 'react';
import { IndianRupee, AlertCircle, CheckCircle2, RefreshCw, X, Loader2, Search } from 'lucide-react';
import api from '@/lib/api';

type Fee = {
    id: string;
    student?: { id: string; name: string };
    total_amount: number;
    due_amount: number;
    amount?: number; // legacy alias
    due_date?: string;
    status: 'pending' | 'paid' | 'overdue';
    payment_method?: string;
    paid_at?: string;
};

const TABS = ['All', 'Pending', 'Paid', 'Overdue'] as const;

const statusBadge = (s: string) => {
    if (s === 'paid') return 'inline-flex items-center bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full px-2.5 py-0.5 text-xs font-medium';
    if (s === 'overdue') return 'inline-flex items-center bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full px-2.5 py-0.5 text-xs font-medium';
    return 'inline-flex items-center bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full px-2.5 py-0.5 text-xs font-medium';
};

export default function FeesPage() {
    const [fees, setFees] = useState<Fee[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<typeof TABS[number]>('All');
    const [search, setSearch] = useState('');
    const [isPayModalOpen, setIsPayModalOpen] = useState(false);
    const [selectedFee, setSelectedFee] = useState<Fee | null>(null);
    const [payAmount, setPayAmount] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generateMsg, setGenerateMsg] = useState('');

    useEffect(() => { fetchFees(); }, []);

    const fetchFees = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/finance/fees');
            setFees(Array.isArray(data) ? data : (data?.fees || []));
        } catch {
            setFees([]);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        setGenerateMsg('');
        try {
            const { data } = await api.post('/finance/fees/generate');
            setGenerateMsg(`Generated ${data?.count ?? 'fees'} successfully.`);
            fetchFees();
        } catch {
            setGenerateMsg('Generation failed. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleRecordPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFee) return;
        setIsSubmitting(true);
        try {
            await api.post('/finance/payment/manual', {
                fee_id: selectedFee.id,
                amount: parseFloat(payAmount),
            });
            setIsPayModalOpen(false);
            setSelectedFee(null);
            setPayAmount('');
            fetchFees();
        } catch {
            setIsPayModalOpen(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Derive status client-side if backend doesn't provide it (due_amount=0 → paid, overdue date → overdue, else pending)
    const deriveStatus = (f: Fee): string => {
        if (f.status) return f.status;
        const dueAmt = f.due_amount ?? f.total_amount ?? 0;
        if (dueAmt === 0) return 'paid';
        if (f.due_date && new Date(f.due_date) < new Date()) return 'overdue';
        return 'pending';
    };

    const filtered = fees.filter(f => {
        const status = deriveStatus(f);
        const matchTab = tab === 'All' || status.toLowerCase() === tab.toLowerCase();
        const matchSearch = !search || f.student?.name?.toLowerCase().includes(search.toLowerCase());
        return matchTab && matchSearch;
    });

    const totalOutstanding = fees.filter(f => f.status !== 'paid').reduce((s, f) => s + (f.total_amount || f.amount || 0), 0);
    const totalCollectedMonth = fees.filter(f => {
        if (f.status !== 'paid' || !f.paid_at) return false;
        const d = new Date(f.paid_at);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).reduce((s, f) => s + (f.total_amount || f.amount || 0), 0);
    const overdueCount = fees.filter(f => f.status === 'overdue').length;

    return (
        <div className="space-y-6 animate-in">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Fees & Payments</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Track outstanding fees, record payments and generate billing cycles.</p>
                </div>
                <div className="flex items-center gap-2">
                    {generateMsg && <span className="text-xs text-emerald-600 font-semibold">{generateMsg}</span>}
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95 disabled:opacity-60"
                    >
                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        Generate Fees
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Outstanding</p>
                    <h3 className="text-3xl font-bold mt-2 text-slate-900 dark:text-white">₹{totalOutstanding.toLocaleString()}</h3>
                    <div className="mt-3 text-xs text-slate-400 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Across all pending fees
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Collected This Month</p>
                    <h3 className="text-3xl font-bold mt-2 text-emerald-600 dark:text-emerald-400">₹{totalCollectedMonth.toLocaleString()}</h3>
                    <div className="mt-3 text-xs text-slate-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        Payments recorded
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Overdue Fees</p>
                    <h3 className="text-3xl font-bold mt-2 text-red-600 dark:text-red-400">{overdueCount}</h3>
                    <div className="mt-3 text-xs text-slate-400 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                        Immediate action required
                    </div>
                </div>
            </div>

            {/* Table Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                {/* Tabs */}
                <div className="flex gap-1 p-3 border-b border-slate-100 dark:border-slate-700 flex-wrap">
                    {TABS.map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={tab === t
                                ? 'px-4 py-2 text-sm font-semibold text-[var(--brand)] border-b-2 border-[var(--brand)]'
                                : 'px-4 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border-b-2 border-transparent'}
                        >
                            {t}
                        </button>
                    ))}
                    <div className="ml-auto relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" placeholder="Search student..." className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2 pl-8 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors" value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Student</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Amount</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Due Date</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Method</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} className="px-4 py-3">
                                    <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin"></div></div>
                                </td></tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-3">
                                        <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">
                                            <IndianRupee className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                            <p>No fees found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filtered.map(fee => (
                                <tr key={fee.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 font-medium">{fee.student?.name || '—'}</td>
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 font-bold">₹{(fee.total_amount || fee.amount || 0).toLocaleString('en-IN')}</td>
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                        {fee.due_date ? new Date(fee.due_date).toLocaleDateString('en-IN') : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                        <span className={`${statusBadge(deriveStatus(fee))} capitalize`}>
                                            {deriveStatus(fee)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 capitalize">{fee.payment_method || '—'}</td>
                                    <td className="px-4 py-3 text-right">
                                        {fee.status !== 'paid' && (
                                            <button
                                                onClick={() => { setSelectedFee(fee); setPayAmount(String(fee.due_amount || fee.total_amount || fee.amount || '')); setIsPayModalOpen(true); }}
                                                className="text-xs bg-[var(--brand)] hover:opacity-90 text-white px-3 py-1.5 rounded-lg font-semibold transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                Record Cash
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Payment Modal */}
            {isPayModalOpen && selectedFee && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Record Cash Payment</h2>
                            <button onClick={() => setIsPayModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-400 transition-all"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl text-sm">
                                <p className="text-slate-500 dark:text-slate-400">Student</p>
                                <p className="font-bold text-slate-800 dark:text-white">{selectedFee.student?.name}</p>
                            </div>
                            <form onSubmit={handleRecordPayment} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Amount (₹)</label>
                                    <div className="relative">
                                        <IndianRupee className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input required type="number" step="0.01" className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 pl-9 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors" value={payAmount} onChange={e => setPayAmount(e.target.value)} />
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setIsPayModalOpen(false)} className="flex-1 flex items-center gap-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-4 py-2.5 font-semibold text-sm justify-center">Cancel</button>
                                    <button type="submit" disabled={isSubmitting} className="flex-1 flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95 justify-center disabled:opacity-60">
                                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Payment'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
