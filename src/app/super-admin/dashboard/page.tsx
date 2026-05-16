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

    const totalStudents = schools.reduce((sum, s) => sum + (s.students?.length || 0), 0);
    const totalBuses = schools.reduce((sum, s) => sum + (s.buses?.length || 0), 0);
    const statCards = [
        { label: 'Total Schools', value: schools.length, icon: Building2, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
        { label: 'Total Students', value: totalStudents.toLocaleString('en-IN'), icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
        { label: 'Total Buses', value: totalBuses, icon: Bus, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
        { label: 'Monthly Revenue', value: revenue.total_collected ? `₹${(revenue.total_collected / 1000).toFixed(0)}K` : '—', icon: TrendingUp, color: 'text-primary-400', bg: 'bg-primary-500/10', border: 'border-primary-500/20' },
        { label: 'Total Overdue', value: revenue.total_overdue ? `₹${(revenue.total_overdue / 1000).toFixed(0)}K` : '—', icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
    ];

    const getInvoiceStatusStyle = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'paid': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'overdue': return 'bg-red-500/10 text-red-400 border-red-500/20';
            default: return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
        }
    };

    return (
        <div className="space-y-8 animate-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-white tracking-tighter flex items-center gap-3">
                        <ShieldCheck className="w-7 h-7 text-primary-400" />
                        Platform Dashboard
                    </h1>
                    <p className="text-white/30 text-xs font-bold uppercase tracking-widest mt-1">
                        {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                    <span className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">Live Data</span>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {statCards.map(card => (
                    <div key={card.label} className={cn('bg-[#111827] rounded-2xl border p-5 hover:bg-[#161d2a] transition-all', card.border)}>
                        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-4 border', card.bg, card.border)}>
                            <card.icon className={cn('w-5 h-5', card.color)} />
                        </div>
                        <p className="text-2xl font-black text-white">
                            {loading ? <span className="text-white/20">—</span> : card.value}
                        </p>
                        <p className="text-[10px] text-white/30 font-black uppercase tracking-widest mt-1">{card.label}</p>
                    </div>
                ))}
            </div>

            {/* Bottom grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Schools list */}
                <div className="bg-[#111827] rounded-2xl border border-white/5 overflow-hidden">
                    <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center">
                        <h3 className="font-black text-white text-sm">Schools</h3>
                        <Link href="/super-admin/schools" className="text-primary-400 text-xs font-black hover:text-primary-300">View all →</Link>
                    </div>
                    {loading ? (
                        <div className="flex justify-center p-10">
                            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : schools.length === 0 ? (
                        <div className="p-10 text-center text-white/20 font-bold text-sm">No schools registered</div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {schools.slice(0, 6).map(school => (
                                <div key={school.id} className="px-6 py-4 flex items-center gap-4 hover:bg-white/5 transition-all">
                                    <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                                        <Building2 className="w-4 h-4 text-white/30" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white font-bold text-sm truncate">{school.name}</p>
                                        <p className="text-white/30 text-[10px] font-bold">{school.subscription_plan || 'Basic'}</p>
                                    </div>
                                    <span className={cn(
                                        'px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border',
                                        school.status === 'Active'
                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                                    )}>
                                        {school.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Invoices */}
                <div className="bg-[#111827] rounded-2xl border border-white/5 overflow-hidden">
                    <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center">
                        <h3 className="font-black text-white text-sm">Recent Invoices</h3>
                        <Link href="/super-admin/billing" className="text-primary-400 text-xs font-black hover:text-primary-300">View all →</Link>
                    </div>
                    {loading ? (
                        <div className="flex justify-center p-10">
                            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : invoices.length === 0 ? (
                        <div className="p-10 text-center text-white/20 font-bold text-sm">No invoices yet</div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {invoices.map(inv => (
                                <div key={inv.id} className="px-6 py-4 flex items-center gap-4 hover:bg-white/5 transition-all">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white font-bold text-sm truncate">{inv.school?.name || 'Unknown School'}</p>
                                        <p className="text-white/30 text-[10px] font-bold">{inv.billing_month}</p>
                                    </div>
                                    <p className="text-white font-black text-sm shrink-0">
                                        ₹{(inv.total_amount || 0).toLocaleString('en-IN')}
                                    </p>
                                    <span className={cn('px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border shrink-0', getInvoiceStatusStyle(inv.status))}>
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
