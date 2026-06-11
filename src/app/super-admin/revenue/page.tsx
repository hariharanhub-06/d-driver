'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Users, Bus, AlertCircle, Building2, IndianRupee } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n';

interface PerSchoolEntry {
    school_id: string;
    name: string;
    plan_name?: string | null;
    bus_count: number;
    student_count: number;
    this_month_amount: number;
    status: string;
}

interface RevenueData {
    total_billed?: number;
    total_collected?: number;
    total_overdue?: number;
    active_schools?: number;
    monthly_revenue?: { month: string; billed: number; collected: number }[];
    per_school?: PerSchoolEntry[];
}

export default function RevenuePage() {
    const t = useT();
    const [data, setData] = useState<RevenueData>({});
    const [schools, setSchools] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            try {
                const [revenueRes, schoolsRes] = await Promise.allSettled([
                    api.get('/billing/revenue'),
                    api.get('/schools'),
                ]);
                if (revenueRes.status === 'fulfilled') setData(revenueRes.value.data || {});
                if (schoolsRes.status === 'fulfilled') setSchools(Array.isArray(schoolsRes.value.data) ? schoolsRes.value.data : []);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);

    const mrr = data.total_collected || 0;
    const arr = mrr * 12;
    const overdue = data.total_overdue || 0;
    const activeSchoolCount = data.active_schools ?? schools.filter(s => s.status === 'active').length;
    const totalStudents = data.per_school
        ? data.per_school.reduce((sum, s) => sum + s.student_count, 0)
        : schools.reduce((sum, s) => sum + (s._count?.students || 0), 0);

    const heroMetrics = [
        { label: t('MRR', 'மாத வருவாய்'), value: `₹${(mrr / 1000).toFixed(1)}K`, icon: IndianRupee, iconColor: 'text-[var(--brand)]', bg: 'bg-[var(--brand)]/10' },
        { label: t('ARR Projection', 'ஆண்டு வருவாய் கணிப்பு'), value: `₹${(arr / 100000).toFixed(2)}L`, icon: TrendingUp, iconColor: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
        { label: t('Active Schools', 'செயலில் பள்ளிகள்'), value: activeSchoolCount, icon: Building2, iconColor: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30' },
        { label: t('Total Overdue', 'மொத்த தாமதம்'), value: `₹${(overdue / 1000).toFixed(1)}K`, icon: AlertCircle, iconColor: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/30' },
        { label: t('Total Students', 'மொத்த மாணவர்கள்'), value: totalStudents.toLocaleString('en-IN'), icon: Users, iconColor: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30' },
    ];

    const monthlyData = data.monthly_revenue && data.monthly_revenue.length > 0
        ? data.monthly_revenue.map(m => ({ month: m.month.slice(5), billed: m.billed, collected: m.collected }))
        : [];

    const perSchool = data.per_school && data.per_school.length > 0
        ? data.per_school
        : schools.map(s => ({
            school_id: s.id,
            name: s.name,
            plan_name: s.subscription_plan || 'Basic',
            bus_count: s._count?.buses || 0,
            student_count: s._count?.students || 0,
            this_month_amount: 0,
            status: 'no_invoice',
        } as PerSchoolEntry));

    return (
        <div className="space-y-6 animate-in">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <TrendingUp className="w-7 h-7 text-[var(--brand)]" />
                        {t('Revenue Dashboard', 'வருவாய் டாஷ்போர்டு')}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('Platform-wide financial overview', 'தளம் முழுவதும் நிதி மேலோட்டம்')}</p>
                </div>
            </div>

            {/* Hero metrics */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {heroMetrics.map(m => (
                    <div key={m.label} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
                        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-4', m.bg)}>
                            <m.icon className={cn('w-5 h-5', m.iconColor)} />
                        </div>
                        <p className="text-xl font-bold text-slate-900 dark:text-white">
                            {loading ? <span className="text-slate-300 dark:text-slate-600">—</span> : m.value}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mt-1">{m.label}</p>
                    </div>
                ))}
            </div>

            {/* Bar chart */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white text-sm">{t('Monthly Revenue', 'மாத வருவாய்')}</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">{t('Last 6 months', 'கடந்த 6 மாதங்கள்')} (₹)</p>
                    </div>
                </div>
                <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.2)" />
                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `₹${Math.round(v / 1000)}K`} />
                            <Tooltip
                                formatter={(v: any) => [`₹${Number(v).toLocaleString('en-IN')}`, t('Revenue', 'வருவாய்')]}
                                contentStyle={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#0f172a', fontSize: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                            />
                            <Bar dataKey="amount" fill="var(--brand)" radius={[6, 6, 0, 0]} barSize={28} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Per-school table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700">
                    <h3 className="font-semibold text-slate-900 dark:text-white text-sm">{t('Per-School Breakdown', 'பள்ளி வாரியான பகுப்பாய்வு')}</h3>
                </div>
                {loading ? (
                    <div className="flex justify-center py-16">
                        <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : perSchool.length === 0 ? (
                    <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">{t('No school data', 'பள்ளி தரவு இல்லை')}</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-700">
                                    {[
                                        t('School', 'பள்ளி'),
                                        t('Plan', 'திட்டம்'),
                                        t('Buses', 'பேருந்துகள்'),
                                        t('Students', 'மாணவர்கள்'),
                                        t('This Month', 'இந்த மாதம்'),
                                        t('Status', 'நிலை'),
                                    ].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-700/50">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {perSchool.map(s => (
                                    <tr key={s.school_id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center shrink-0">
                                                    <Building2 className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                                                </div>
                                                <p className="font-semibold text-slate-900 dark:text-white">{s.name}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                            <span className="text-xs font-medium text-[var(--brand)] bg-[var(--brand)]/10 px-2 py-0.5 rounded-full uppercase">{s.plan_name || 'Basic'}</span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                            <div className="flex items-center gap-1.5">
                                                <Bus className="w-3.5 h-3.5 text-slate-400" />
                                                <span className="font-medium">{s.bus_count}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                            <div className="flex items-center gap-1.5">
                                                <Users className="w-3.5 h-3.5 text-slate-400" />
                                                <span className="font-medium">{s.student_count}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">
                                            {s.this_month_amount > 0 ? `₹${s.this_month_amount.toLocaleString('en-IN')}` : '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={cn(
                                                'rounded-full px-2.5 py-0.5 text-xs font-medium',
                                                s.status === 'paid'
                                                    ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                                    : s.status === 'no_invoice'
                                                    ? 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                                                    : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                            )}>
                                                {s.status === 'active'
                                                    ? t('Active', 'செயலில்')
                                                    : s.status === 'suspended'
                                                    ? t('Suspended', 'இடைநிறுத்தம்')
                                                    : s.status === 'no_invoice'
                                                    ? 'No Invoice'
                                                    : s.status}
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
