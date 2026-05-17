'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { FileText, Filter, TrendingUp, BarChart3, PieChart, Info, MoreHorizontal } from 'lucide-react';

export default function ReportsPage() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get('/dashboard/stats');
                setStats(res.data);
            } catch (error) {
                console.error('Error fetching stats for reports:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const reportStats = [
        { label: 'Active Routes', value: stats?.activeRoutes || 0, icon: TrendingUp, iconColor: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30' },
        { label: 'Total Students', value: stats?.totalStudents || 0, icon: BarChart3, iconColor: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
        { label: 'Total Schools', value: stats?.totalSchools || 0, icon: Info, iconColor: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30' },
        { label: 'Revenue Yield', value: `₹${((stats?.totalRevenue || 0) / 1000).toFixed(1)}K`, icon: PieChart, iconColor: 'text-[var(--brand)]', bg: 'bg-[var(--brand)]/10' },
    ];

    return (
        <div className="space-y-6 animate-in">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <FileText className="w-7 h-7 text-[var(--brand)]" />
                        Analytical Reports
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">System-wide data intelligence</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-4 py-2.5 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                        <Filter className="w-4 h-4" /> Filter Reports
                    </button>
                    <button className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95">
                        Generate New
                    </button>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {reportStats.map((stat, i) => (
                    <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.bg}`}>
                                <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
                            </div>
                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">Live</span>
                        </div>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{stat.label}</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{loading ? '...' : stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Reports List */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">System Audit Archives</h3>
                    <MoreHorizontal className="text-slate-300 dark:text-slate-600 w-5 h-5" />
                </div>
                <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">
                    <FileText className="w-12 h-12 mx-auto text-slate-200 dark:text-slate-700 mb-4" />
                    <p className="font-medium">No Generated Reports Found</p>
                    <p className="text-xs mt-1">Generate your first system-wide audit to see data here.</p>
                </div>
            </div>
        </div>
    );
}
