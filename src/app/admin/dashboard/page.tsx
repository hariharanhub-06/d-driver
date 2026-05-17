'use client';

import { useState, useEffect } from 'react';
import { Bus, Map as MapIcon, GraduationCap, UserCheck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '@/lib/api';
import Link from 'next/link';
import OnboardingChecklist from '@/components/admin/OnboardingChecklist';

const EMPTY_STATS = { students: 0, buses: 0, drivers: 0, routes: 0 };

interface FeeChartPoint { month: string; collected: number; pending: number; }
interface OverviewStats { feeCollectionRate: number; busUtilization: number; routeCoverage: number; }

export default function Dashboard() {
    const [stats, setStats] = useState(EMPTY_STATS);
    const [loading, setLoading] = useState(true);
    const [schoolData, setSchoolData] = useState<any>(null);
    const [feeData, setFeeData] = useState<FeeChartPoint[]>([]);
    const [overview, setOverview] = useState<OverviewStats>({ feeCollectionRate: 0, busUtilization: 0, routeCoverage: 0 });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [studentsRes, busesRes, driversRes, routesRes, schoolRes, feesRes] = await Promise.allSettled([
                    api.get('/students'),
                    api.get('/buses'),
                    api.get('/drivers'),
                    api.get('/routes'),
                    api.get('/schools/my'),
                    api.get('/finance/fees'),
                ]);

                const buses: any[] = busesRes.status === 'fulfilled' ? (busesRes.value.data || []) : [];
                const routes: any[] = routesRes.status === 'fulfilled' ? (routesRes.value.data || []) : [];
                const drivers: any[] = driversRes.status === 'fulfilled' ? (driversRes.value.data || []) : [];
                const fees: any[] = feesRes.status === 'fulfilled' ? (feesRes.value.data || []) : [];

                setStats({
                    students: studentsRes.status === 'fulfilled' ? (studentsRes.value.data?.length || 0) : 0,
                    buses: buses.length,
                    drivers: drivers.length,
                    routes: routes.length,
                });

                if (schoolRes.status === 'fulfilled') {
                    setSchoolData(schoolRes.value.data);
                }

                // Build monthly fee chart from real data
                if (fees.length > 0) {
                    const monthMap: Record<string, { month: string; order: number; collected: number; pending: number }> = {};
                    fees.forEach((fee: any) => {
                        const d = new Date(fee.due_date);
                        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                        const label = d.toLocaleDateString('en-US', { month: 'short' });
                        if (!monthMap[key]) monthMap[key] = { month: label, order: d.getFullYear() * 100 + d.getMonth(), collected: 0, pending: 0 };
                        const collected = Math.max(0, (fee.total_amount || 0) - (fee.due_amount || 0));
                        monthMap[key].collected += collected;
                        monthMap[key].pending += fee.due_amount || 0;
                    });
                    const chartData = Object.values(monthMap)
                        .sort((a, b) => a.order - b.order)
                        .slice(-6)
                        .map(({ month, collected, pending }) => ({ month, collected: Math.round(collected), pending: Math.round(pending) }));
                    setFeeData(chartData);

                    const totalAmount = fees.reduce((s: number, f: any) => s + (f.total_amount || 0), 0);
                    const totalCollected = fees.reduce((s: number, f: any) => s + Math.max(0, (f.total_amount || 0) - (f.due_amount || 0)), 0);
                    const feeRate = totalAmount > 0 ? Math.round((totalCollected / totalAmount) * 100) : 0;

                    const routesWithBus = routes.filter((r: any) => r.bus_id).length;
                    const routeCoverage = routes.length > 0 ? Math.round((routesWithBus / routes.length) * 100) : 0;

                    const busUtil = buses.length > 0 ? Math.min(100, Math.round((drivers.length / buses.length) * 100)) : 0;

                    setOverview({ feeCollectionRate: feeRate, busUtilization: busUtil, routeCoverage });
                } else {
                    // No fees yet — still compute utilization from counts
                    const routesWithBus = routes.filter((r: any) => r.bus_id).length;
                    const routeCoverage = routes.length > 0 ? Math.round((routesWithBus / routes.length) * 100) : 0;
                    const busUtil = buses.length > 0 ? Math.min(100, Math.round((drivers.length / buses.length) * 100)) : 0;
                    setOverview({ feeCollectionRate: 0, busUtilization: busUtil, routeCoverage });
                }
            } catch {
                setStats(EMPTY_STATS);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const statCards = [
        { label: 'Total Students', value: stats.students, icon: GraduationCap, href: '/admin/students', filled: true },
        { label: 'Active Buses', value: stats.buses, icon: Bus, href: '/admin/buses', filled: false },
        { label: 'Active Drivers', value: stats.drivers, icon: UserCheck, href: '/admin/drivers', filled: false },
        { label: 'Total Routes', value: stats.routes, icon: MapIcon, href: '/admin/routes', filled: false },
    ];

    const overviewItems = [
        { label: 'Fee Collection Rate', value: `${overview.feeCollectionRate}%`, color: 'bg-[var(--brand)]', width: `${overview.feeCollectionRate}%` },
        { label: 'Bus Utilization', value: `${overview.busUtilization}%`, color: 'bg-amber-500', width: `${overview.busUtilization}%` },
        { label: 'Route Coverage', value: `${overview.routeCoverage}%`, color: 'bg-purple-500', width: `${overview.routeCoverage}%` },
    ];

    return (
        <div className="space-y-6 animate-in">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 data-tour="dashboard" className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Live Data</span>
                </div>
            </div>

            {/* Onboarding checklist */}
            {schoolData && !schoolData.onboarding_dismissed && (
                <OnboardingChecklist schoolData={schoolData} />
            )}

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((card, idx) => (
                    <Link
                        key={card.label}
                        href={card.href}
                        className={
                            idx === 0
                                ? 'bg-[var(--brand)] text-white rounded-2xl p-6 shadow-lg hover:opacity-95 transition-all'
                                : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all'
                        }
                    >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${idx === 0 ? 'bg-white/20' : 'bg-slate-50 dark:bg-slate-700'}`}>
                            <card.icon className={`w-5 h-5 ${idx === 0 ? 'text-white' : 'text-[var(--brand)]'}`} />
                        </div>
                        <p className={`text-3xl font-bold ${idx === 0 ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                            {loading ? '—' : card.value}
                        </p>
                        <p className={`text-sm mt-1 ${idx === 0 ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>{card.label}</p>
                    </Link>
                ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Fee Collection Chart */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Fee Collection</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Monthly collected vs pending (₹)</p>
                        </div>
                        <div className="flex items-center gap-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1.5">
                                <span className="w-3 h-3 bg-emerald-500 rounded-sm inline-block" />Collected
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-3 h-3 bg-red-400 rounded-sm inline-block" />Pending
                            </span>
                        </div>
                    </div>
                    {loading ? (
                        <div className="h-64 flex items-center justify-center">
                            <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : feeData.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 gap-2">
                            <p className="text-sm font-medium">No fee data yet</p>
                            <Link href="/admin/fees" className="text-xs text-[var(--brand)] hover:underline">Create fee records →</Link>
                        </div>
                    ) : (
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={feeData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barGap={4}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `₹${v / 1000}K`} />
                                    <Tooltip
                                        formatter={(v) => [`₹${Number(v || 0).toLocaleString()}`, '']}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '12px' }}
                                    />
                                    <Bar dataKey="collected" name="Collected" fill="#22c55e" radius={[6, 6, 0, 0]} barSize={18} />
                                    <Bar dataKey="pending" name="Pending" fill="#f87171" radius={[6, 6, 0, 0]} barSize={18} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* Quick Overview */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 flex flex-col">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">Quick Overview</h3>
                    {loading ? (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="w-6 h-6 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <div className="space-y-5 flex-1">
                            {overviewItems.map(item => (
                                <div key={item.label}>
                                    <div className="flex justify-between text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                                        <span>{item.label}</span>
                                        <span>{item.value}</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div className={`h-full ${item.color} rounded-full transition-all duration-1000`} style={{ width: item.width }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    <Link href="/admin/reports" className="mt-8 w-full py-3 bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 font-semibold rounded-xl text-center text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-all">
                        View Full Report →
                    </Link>
                </div>
            </div>
        </div>
    );
}
