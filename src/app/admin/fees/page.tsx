'use client';

import { useState, useEffect } from 'react';
import { IndianRupee, AlertCircle, CheckCircle2, RefreshCw, X, Loader2, Search } from 'lucide-react';
import api from '@/lib/api';

type Fee = {
    id: string;
    student?: { id: string; name: string };
    amount: number;
    due_date?: string;
    status: 'pending' | 'paid' | 'overdue';
    payment_method?: string;
    paid_at?: string;
};

const TABS = ['All', 'Pending', 'Paid', 'Overdue'] as const;

const statusBadge = (s: string) => {
    if (s === 'paid') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    if (s === 'overdue') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
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

    const filtered = fees.filter(f => {
        const matchTab = tab === 'All' || f.status?.toLowerCase() === tab.toLowerCase();
        const matchSearch = !search || f.student?.name?.toLowerCase().includes(search.toLowerCase());
        return matchTab && matchSearch;
    });

    const totalOutstanding = fees.filter(f => f.status !== 'paid').reduce((s, f) => s + (f.amount || 0), 0);
    const totalCollectedMonth = fees.filter(f => {
        if (f.status !== 'paid' || !f.paid_at) return false;
        const d = new Date(f.paid_at);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).reduce((s, f) => s + (f.amount || 0), 0);
    const overdueCount = fees.filter(f => f.status === 'overdue').length;

    return (
        <div className="space-y-6 animate-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Fees & Payments</h1>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Track outstanding fees, record payments and generate billing cycles.</p>
                </div>
                <div className="flex items-center gap-2">
                    {generateMsg && <span className="text-xs text-emerald-600 font-bold">{generateMsg}</span>}
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-all disabled:opacity-60"
                    >
                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        Generate Fees
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-2xl p-5 shadow-sm">
                    <p className="text-blue-100 text-[10px] font-black uppercase tracking-widest">Total Outstanding</p>
                    <h3 className="text-3xl font-black mt-2">₹{totalOutstanding.toLocaleString()}</h3>
                    <div className="mt-3 text-[10px] text-blue-200 font-bold flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Across all pending fees
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm">
                    <p className="text-gray-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">Collected This Month</p>
                    <h3 className="text-3xl font-black mt-2 text-emerald-600 dark:text-emerald-400">₹{totalCollectedMonth.toLocaleString()}</h3>
                    <div className="mt-3 text-[10px] text-gray-400 font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        Payments recorded
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm">
                    <p className="text-gray-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">Overdue Fees</p>
                    <h3 className="text-3xl font-black mt-2 text-red-600 dark:text-red-400">{overdueCount}</h3>
                    <div className="mt-3 text-[10px] text-gray-400 font-bold flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                        Immediate action required
                    </div>
                </div>
            </div>

            {/* Table Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
                {/* Tabs */}
                <div className="flex gap-1 p-3 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50">
                    {TABS.map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${tab === t ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-slate-300'}`}
                        >
                            {t}
                        </button>
                    ))}
                    <div className="ml-auto relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" placeholder="Search student..." className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1.5 pl-8 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 w-48" value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-slate-800">
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">Student</th>
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">Amount</th>
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">Due Date</th>
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">Method</th>
                                <th className="px-6 py-3 text-right text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                            {loading ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" /></td></tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16 text-center text-gray-400">
                                        <IndianRupee className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p className="font-bold">No fees found</p>
                                    </td>
                                </tr>
                            ) : filtered.map(fee => (
                                <tr key={fee.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group">
                                    <td className="px-6 py-4 font-medium text-gray-800 dark:text-white">{fee.student?.name || '—'}</td>
                                    <td className="px-6 py-4 font-bold text-gray-800 dark:text-white">₹{fee.amount?.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-gray-500 dark:text-slate-400 text-xs">
                                        {fee.due_date ? new Date(fee.due_date).toLocaleDateString('en-IN') : '—'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold capitalize ${statusBadge(fee.status)}`}>
                                            {fee.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 dark:text-slate-400 text-xs capitalize">{fee.payment_method || '—'}</td>
                                    <td className="px-6 py-4 text-right">
                                        {fee.status !== 'paid' && (
                                            <button
                                                onClick={() => { setSelectedFee(fee); setPayAmount(String(fee.amount)); setIsPayModalOpen(true); }}
                                                className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-semibold transition-all opacity-0 group-hover:opacity-100"
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-lg w-full mx-4 shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-black text-gray-900 dark:text-white">Record Cash Payment</h2>
                            <button onClick={() => setIsPayModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl text-gray-400 transition-all"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="mb-4 p-3 bg-gray-50 dark:bg-slate-800 rounded-xl text-sm">
                            <p className="text-gray-500 dark:text-slate-400">Student</p>
                            <p className="font-bold text-gray-800 dark:text-white">{selectedFee.student?.name}</p>
                        </div>
                        <form onSubmit={handleRecordPayment} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Amount (₹)</label>
                                <div className="relative">
                                    <IndianRupee className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input required type="number" step="0.01" className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 pl-9 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500" value={payAmount} onChange={e => setPayAmount(e.target.value)} />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setIsPayModalOpen(false)} className="flex-1 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl font-semibold text-sm hover:bg-gray-50 dark:hover:bg-slate-800 transition-all">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-60">
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Confirm Payment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
