'use client';

import { useState, useEffect } from 'react';
import { Bus, Map as MapIcon, IndianRupee, GraduationCap, UserCheck, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '@/lib/api';
import Link from 'next/link';
import OnboardingChecklist from '@/components/admin/OnboardingChecklist';

const EMPTY_STATS = { students: 0, buses: 0, drivers: 0, routes: 0, revenue: 0, pending_fees: 0 };

export default function Dashboard() {
    const [stats, setStats] = useState(EMPTY_STATS);
    const [loading, setLoading] = useState(true);
    const [schoolData, setSchoolData] = useState<any>(null);
    const feeData = [
        { month: 'Nov', collected: 38000, pending: 9000 },
        { month: 'Dec', collected: 45000, pending: 7500 },
        { month: 'Jan', collected: 52000, pending: 12000 },
        { month: 'Feb', collected: 48000, pending: 8000 },
        { month: 'Mar', collected: 61000, pending: 4200 },
        { month: 'Apr', collected: 38000, pending: 18000 },
    ];

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [studentsRes, busesRes, driversRes, routesRes, schoolRes] = await Promise.allSettled([
                    api.get('/students'),
                    api.get('/buses'),
                    api.get('/drivers'),
                    api.get('/routes'),
                    api.get('/schools/my'),
                ]);
                setStats({
                    students: studentsRes.status === 'fulfilled' ? (studentsRes.value.data?.length || 0) : 0,
                    buses: busesRes.status === 'fulfilled' ? (busesRes.value.data?.length || 0) : 0,
                    drivers: driversRes.status === 'fulfilled' ? (driversRes.value.data?.length || 0) : 0,
                    routes: routesRes.status === 'fulfilled' ? (routesRes.value.data?.length || 0) : 0,
                    revenue: 0,
                    pending_fees: 0,
                });
                if (schoolRes.status === 'fulfilled') {
                    setSchoolData(schoolRes.value.data);
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
        { label: 'Students Enrolled', value: stats.students, icon: GraduationCap, color: 'bg-primary-50 text-primary-600', href: '/admin/students' },
        { label: 'Active Buses', value: stats.buses, icon: Bus, color: 'bg-blue-50 text-blue-600', href: '/admin/buses' },
        { label: 'Drivers', value: stats.drivers, icon: UserCheck, color: 'bg-purple-50 text-purple-600', href: '/admin/drivers' },
        { label: 'Routes', value: stats.routes, icon: MapIcon, color: 'bg-amber-50 text-amber-600', href: '/admin/routes' },
        { label: 'Revenue (MTD)', value: `₹${(stats.revenue / 1000).toFixed(0)}K`, icon: IndianRupee, color: 'bg-emerald-50 text-emerald-600', href: '/admin/fees' },
        { label: 'Pending Fees', value: `₹${(stats.pending_fees / 1000).toFixed(0)}K`, icon: AlertCircle, color: 'bg-red-50 text-red-600', href: '/admin/fees' },
    ];

    return (
        <div className="space-y-8 animate-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h1 data-tour="dashboard" className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Dashboard</h1>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                        {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Live Data</span>
                </div>
            </div>

            {/* Onboarding checklist — shown until dismissed or all steps complete */}
            {schoolData && !schoolData.onboarding_dismissed && (
                <OnboardingChecklist schoolData={schoolData} />
            )}

            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {statCards.map(card => (
                    <Link key={card.label} href={card.href} className="group bg-white dark:bg-slate-900 rounded-[1.5rem] border border-gray-100 dark:border-slate-800 p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all shadow-sm">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${card.color}`}>
                            <card.icon className="w-5 h-5" />
                        </div>
                        <p className="text-2xl font-black text-gray-900 dark:text-white">
                            {loading ? '—' : card.value}
                        </p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{card.label}</p>
                    </Link>
                ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Fee Collection Chart */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[2rem] border border-gray-100 dark:border-slate-800 p-7 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="font-black text-gray-800 dark:text-white">Fee Collection</h3>
                            <p className="text-xs text-gray-400 mt-1">Monthly collected vs pending (₹)</p>
                        </div>
                        <div className="flex items-center gap-4 text-xs font-bold text-gray-500">
                            <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-primary-500 rounded-sm inline-block" />Collected</span>
                            <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-red-400 rounded-sm inline-block" />Pending</span>
                        </div>
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={feeData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barGap={4}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f2f2f2" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={(v) => `₹${v / 1000}K`} />
                                <Tooltip
                                    formatter={(v) => [`₹${Number(v || 0).toLocaleString()}`, '']}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '12px' }}
                                />
                                <Bar dataKey="collected" name="Collected" fill="#22c55e" radius={[6, 6, 0, 0]} barSize={18} />
                                <Bar dataKey="pending" name="Pending" fill="#f87171" radius={[6, 6, 0, 0]} barSize={18} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Quick Stats / Recent Activity */}
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-gray-100 dark:border-slate-800 p-7 shadow-sm flex flex-col">
                    <h3 className="font-black text-gray-800 dark:text-white mb-6">Quick Overview</h3>
                    <div className="space-y-5 flex-1">
                        {[
                            { label: 'Attendance Rate', value: '94%', color: 'bg-emerald-500', width: '94%' },
                            { label: 'Fee Collection Rate', value: '88%', color: 'bg-primary-500', width: '88%' },
                            { label: 'Bus Utilization', value: '78%', color: 'bg-amber-500', width: '78%' },
                            { label: 'Route Coverage', value: '100%', color: 'bg-purple-500', width: '100%' },
                        ].map(item => (
                            <div key={item.label}>
                                <div className="flex justify-between text-xs font-bold text-gray-500 dark:text-slate-400 mb-2">
                                    <span>{item.label}</span>
                                    <span>{item.value}</span>
                                </div>
                                <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div className={`h-full ${item.color} rounded-full transition-all duration-1000`} style={{ width: item.width }} />
                                </div>
                            </div>
                        ))}
                    </div>
                    <Link href="/admin/reports" className="mt-8 w-full py-3 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl text-center text-sm hover:bg-slate-100 transition-all">
                        View Full Report →
                    </Link>
                </div>
            </div>
        </div>
    );
}
