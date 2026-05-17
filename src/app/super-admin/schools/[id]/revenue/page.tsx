'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, TrendingUp, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import api from '@/lib/api';

interface FeeRecord {
    id: string;
    student_name?: string;
    amount: number;
    due_date?: string;
    status?: string;
    payment_method?: string;
}

interface RevenueData {
    total_collected?: number;
    total_outstanding?: number;
    monthly?: { month: string; total: number }[];
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function buildDummyMonths(monthlyData?: { month: string; total: number }[]) {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const found = monthlyData?.find(m => m.month === key);
        return { month: MONTH_NAMES[d.getMonth()], total: found?.total ?? 0 };
    });
}

function getStatusBadge(status?: string) {
    switch (status?.toLowerCase()) {
        case 'paid': return 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full px-2.5 py-0.5 text-xs font-medium';
        case 'overdue': return 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full px-2.5 py-0.5 text-xs font-medium';
        default: return 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full px-2.5 py-0.5 text-xs font-medium';
    }
}

function StatusIcon({ status }: { status?: string }) {
    switch (status?.toLowerCase()) {
        case 'paid': return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
        case 'overdue': return <AlertCircle className="w-3.5 h-3.5 text-red-500" />;
        default: return <Clock className="w-3.5 h-3.5 text-amber-500" />;
    }
}

export default function SchoolRevenuePage() {
    const { id } = useParams<{ id: string }>();

    const [revenue, setRevenue] = useState<RevenueData | null>(null);
    const [fees, setFees] = useState<FeeRecord[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            try {
                const [revRes, feesRes] = await Promise.allSettled([
                    api.get(`/finance/revenue?school_id=${id}`),
                    api.get(`/finance/fees?school_id=${id}`),
                ]);
                if (revRes.status === 'fulfilled') setRevenue(revRes.value.data);
                if (feesRes.status === 'fulfilled') {
                    setFees(Array.isArray(feesRes.value.data) ? feesRes.value.data : []);
                }
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, [id]);

    const chartData = buildDummyMonths(revenue?.monthly);
    const totalCollected = revenue?.total_collected ?? 0;
    const totalOutstanding = revenue?.total_outstanding ?? 0;

    const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

    if (loading) {
        return (
            <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Collected This Month</p>
                    <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{fmt(totalCollected)}</p>
                    <div className="flex items-center gap-2 mt-2">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Revenue</span>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Outstanding</p>
                    <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{fmt(totalOutstanding)}</p>
                    <div className="flex items-center gap-2 mt-2">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Pending collection</span>
                    </div>
                </div>
            </div>

            {/* Bar chart */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-slate-900 dark:text-white font-semibold text-sm">Monthly Fee Collection</h3>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Last 6 Months</span>
                </div>
                <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.2)" />
                            <XAxis
                                dataKey="month"
                                fontSize={11}
                                fontWeight={600}
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#94a3b8' }}
                            />
                            <YAxis
                                fontSize={11}
                                fontWeight={600}
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#94a3b8' }}
                                tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                            />
                            <Tooltip
                                contentStyle={{
                                    background: 'white',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: 12,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: '#0f172a',
                                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                                }}
                                formatter={(value) => [fmt(typeof value === 'number' ? value : 0), 'Collected']}
                            />
                            <Bar dataKey="total" fill="var(--brand)" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Fee list */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700">
                    <h3 className="text-slate-900 dark:text-white font-semibold text-sm">Fee Records</h3>
                </div>
                {fees.length === 0 ? (
                    <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">No fee records found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-700">
                                    {['Student', 'Amount', 'Due Date', 'Payment Method', 'Status'].map(col => (
                                        <th key={col} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-700/50">
                                            {col}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {fees.map(fee => (
                                    <tr key={fee.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                        <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">
                                            {fee.student_name || '—'}
                                        </td>
                                        <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">
                                            {fmt(fee.amount ?? 0)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                            {fee.due_date ? new Date(fee.due_date).toLocaleDateString('en-IN') : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 capitalize">
                                            {fee.payment_method || '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1.5 ${getStatusBadge(fee.status)}`}>
                                                <StatusIcon status={fee.status} />
                                                {fee.status || 'pending'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
