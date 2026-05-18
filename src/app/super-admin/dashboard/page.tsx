'use client';

import { useState, useEffect } from 'react';
import { Building2, Users, Bus, TrendingUp, AlertCircle, Activity, ShieldCheck } from 'lucide-react';
import api from '@/lib/api';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface School {
    id: string;
    name: string;
    status: string;
    subscription_plan?: string;
    _count?: { buses: number; students: number; drivers: number };
    buses?: any[];
    students?: any[];
}

interface Invoice {
    id: string;
    school?: { name: string };
    total_amount: number;
    status: string;
    billing_month: string;
}

interface RevenueData {
    total_collected?: number;
    total_overdue?: number;
}

export default function SuperAdminDashboard() {
    const [schools, setSchools] = useState<School[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [revenue, setRevenue] = useState<RevenueData>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            try {
                const [schoolsRes, invoicesRes, revenueRes] = await Promise.allSettled([
                    api.get('/schools'),
                    api.get('/billing/invoices'),
                    api.get('/billing/revenue'),
                ]);
                if (schoolsRes.status === 'fulfilled') setSchools(Array.isArray(schoolsRes.value.data) ? schoolsRes.value.data : []);
                if (invoicesRes.status === 'fulfilled') {
                    const inv = invoicesRes.value.data;
                    setInvoices((Array.isArray(inv) ? inv : []).slice(0, 5));
                }
                if (revenueRes.status === 'fulfilled') setRevenue(revenueRes.value.data || {});
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);

    const totalStudents = schools.reduce((sum, s) => sum + (s._count?.students || s.students?.length || 0), 0);
    const totalBuses    = schools.reduce((sum, s) => sum + (s._count?.buses    || s.buses?.length    || 0), 0);

    const statCards = [
        { label: 'Total Schools', value: schools.length, icon: Building2, iconColor: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30' },
        { label: 'Total Students', value: totalStudents.toLocaleString('en-IN'), icon: Users, iconColor: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
        { label: 'Total Buses', value: totalBuses, icon: Bus, iconColor: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30' },
        { label: 'Monthly Revenue', value: revenue.total_collected ? `₹${(revenue.total_collected / 1000).toFixed(0)}K` : '—', icon: TrendingUp, iconColor: 'text-[var(--brand)]', bg: 'bg-[var(--brand)]/10' },
        { label: 'Total Overdue', value: revenue.total_overdue ? `₹${(revenue.total_overdue / 1000).toFixed(0)}K` : '—', icon: AlertCircle, iconColor: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/30' },
    ];

    const getInvoiceStatusStyle = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'paid': return 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full px-2.5 py-0.5 text-xs font-medium';
            case 'overdue': return 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full px-2.5 py-0.5 text-xs font-medium';
            default: return 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full px-2.5 py-0.5 text-xs font-medium';
        }
    };

    return (
        <div className="space-y-6 animate-in">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <ShieldCheck className="w-7 h-7 text-[var(--brand)]" />
                        Platform Dashboard
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
                    <span className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider">Live Data</span>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {statCards.map(card => (
                    <div key={card.label} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
                        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-4', card.bg)}>
                            <card.icon className={cn('w-5 h-5', card.iconColor)} />
                        </div>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">
                            {loading ? <span className="text-slate-300 dark:text-slate-600">—</span> : card.value}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mt-1">{card.label}</p>
                    </div>
                ))}
            </div>

            {/* Bottom grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Schools list */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                        <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Schools</h3>
                        <Link href="/super-admin/schools" className="text-[var(--brand)] text-xs font-semibold hover:opacity-80">View all →</Link>
                    </div>
                    {loading ? (
                        <div className="flex justify-center py-16">
                            <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : schools.length === 0 ? (
                        <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">No schools registered</div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                            {schools.slice(0, 6).map(school => (
                                <div key={school.id} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                    <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                                        <Building2 className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-slate-900 dark:text-white font-semibold text-sm truncate">{school.name}</p>
                                        <p className="text-slate-500 dark:text-slate-400 text-xs">{school.subscription_plan || 'Basic'}</p>
                                    </div>
                                    <span className={cn(
                                        'rounded-full px-2.5 py-0.5 text-xs font-medium',
                                        school.status === 'Active'
                                            ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                            : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                    )}>
                                        {school.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Invoices */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                        <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Recent Invoices</h3>
                        <Link href="/super-admin/billing" className="text-[var(--brand)] text-xs font-semibold hover:opacity-80">View all →</Link>
                    </div>
                    {loading ? (
                        <div className="flex justify-center py-16">
                            <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : invoices.length === 0 ? (
                        <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">No invoices yet</div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                            {invoices.map(inv => (
                                <div key={inv.id} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-slate-900 dark:text-white font-semibold text-sm truncate">{inv.school?.name || 'Unknown School'}</p>
                                        <p className="text-slate-500 dark:text-slate-400 text-xs">{inv.billing_month}</p>
                                    </div>
                                    <p className="text-slate-900 dark:text-white font-bold text-sm shrink-0">
                                        ₹{(inv.total_amount || 0).toLocaleString('en-IN')}
                                    </p>
                                    <span className={cn('shrink-0', getInvoiceStatusStyle(inv.status))}>
                                        {inv.status || 'pending'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
