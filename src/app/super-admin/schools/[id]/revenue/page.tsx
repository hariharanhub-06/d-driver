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

function getStatusStyle(status?: string) {
    switch (status?.toLowerCase()) {
        case 'paid': return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' };
        case 'overdue': return { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' };
        default: return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' };
    }
}

function StatusIcon({ status }: { status?: string }) {
    switch (status?.toLowerCase()) {
        case 'paid': return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
        case 'overdue': return <AlertCircle className="w-3.5 h-3.5 text-red-400" />;
        default: return <Clock className="w-3.5 h-3.5 text-amber-400" />;
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
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#161b22] rounded-2xl border border-[#30363d] p-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-3">Collected This Month</p>
                    <p className="text-3xl font-black text-emerald-400">{fmt(totalCollected)}</p>
                    <div className="flex items-center gap-2 mt-2">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-[10px] font-black text-emerald-400/60">Revenue</span>
                    </div>
                </div>
                <div className="bg-[#161b22] rounded-2xl border border-[#30363d] p-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-3">Outstanding</p>
                    <p className="text-3xl font-black text-amber-400">{fmt(totalOutstanding)}</p>
                    <div className="flex items-center gap-2 mt-2">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-[10px] font-black text-amber-400/60">Pending collection</span>
                    </div>
                </div>
            </div>

            {/* Bar chart */}
            <div className="bg-[#161b22] rounded-2xl border border-[#30363d] p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-white font-black text-sm">Monthly Fee Collection</h3>
                    <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Last 6 Months</span>
                </div>
                <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#30363d" />
                            <XAxis
                                dataKey="month"
                                fontSize={10}
                                fontWeight="bold"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#8b949e' }}
                            />
                            <YAxis
                                fontSize={10}
                                fontWeight="bold"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#8b949e' }}
                                tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                            />
                            <Tooltip
                                contentStyle={{
                                    background: '#161b22',
                                    border: '1px solid #30363d',
                                    borderRadius: 12,
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: '#fff',
                                }}
                                formatter={(value: number) => [fmt(value), 'Collected']}
                            />
                            <Bar dataKey="total" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Fee list */}
            <div className="bg-[#161b22] rounded-2xl border border-[#30363d] overflow-hidden">
                <div className="px-6 py-5 border-b border-[#30363d]">
                    <h3 className="text-white font-black text-sm">Fee Records</h3>
                </div>
                {fees.length === 0 ? (
                    <div className="text-center py-14 text-white/20 font-bold text-sm">No fee records found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-[#30363d]">
                                    {['Student', 'Amount', 'Due Date', 'Payment Method', 'Status'].map(col => (
                                        <th key={col} className="px-5 py-3.5 text-left text-[9px] font-black uppercase tracking-widest text-white/30">
                                            {col}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#30363d]">
                                {fees.map(fee => {
                                    const { bg, text, border } = getStatusStyle(fee.status);
                                    return (
                                        <tr key={fee.id} className="hover:bg-white/[0.02] transition-all">
                                            <td className="px-5 py-3.5 text-white font-bold text-sm">
                                                {fee.student_name || '—'}
                                            </td>
                                            <td className="px-5 py-3.5 text-white font-bold text-sm">
                                                {fmt(fee.amount ?? 0)}
                                            </td>
                                            <td className="px-5 py-3.5 text-white/50 font-bold text-sm">
                                                {fee.due_date ? new Date(fee.due_date).toLocaleDateString('en-IN') : '—'}
                                            </td>
                                            <td className="px-5 py-3.5 text-white/50 font-bold text-sm capitalize">
                                                {fee.payment_method || '—'}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase border ${bg} ${text} ${border}`}>
                                                    <StatusIcon status={fee.status} />
                                                    {fee.status || 'pending'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
