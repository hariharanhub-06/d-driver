'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { FileText, Download, Filter, TrendingUp, BarChart3, PieChart, Info, MoreHorizontal } from 'lucide-react';

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
        { label: 'Active Routes', value: stats?.activeRoutes || 0, change: 'Live', icon: TrendingUp },
        { label: 'Total Students', value: stats?.totalStudents || 0, change: 'Live', icon: BarChart3 },
        { label: 'Total Schools', value: stats?.totalSchools || 0, change: 'Live', icon: Info },
        { label: 'Revenue Yield', value: `₹${((stats?.totalRevenue || 0) / 1000).toFixed(1)}K`, change: 'Live', icon: PieChart },
    ];

    return (
        <div className="space-y-10 animate-in p-2 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Analytical Reports</h1>
                    <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-1 flex items-center">
                        <FileText className="w-3 h-3 mr-1 text-primary-500" /> System-Wide Data Intelligence
                    </p>
                </div>
                <div className="flex gap-4">
                    <button className="flex items-center gap-2 bg-gray-50 px-6 py-3 rounded-2xl border border-gray-100 text-sm font-bold text-slate-600 hover:bg-gray-100 transition-all">
                        <Filter className="w-4 h-4" /> Filter Reports
                    </button>
                    <button className="flex items-center gap-2 bg-primary-500 px-8 py-3 rounded-2xl text-sm font-black text-white hover:bg-primary-600 transition-all shadow-xl shadow-primary-500/20">
                        Generate New
                    </button>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {reportStats.map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:border-primary-200 transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center">
                                <stat.icon className="w-5 h-5 text-slate-400" />
                            </div>
                            <span className="text-[10px] font-black text-green-500 bg-green-50 px-2 py-1 rounded-full uppercase tracking-tighter">{stat.change}</span>
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
                        <p className="text-2xl font-black text-slate-900">{loading ? '...' : stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Reports List */}
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-8 py-6 border-b border-gray-50 flex justify-between items-center">
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">System Audit Archives</h3>
                    <MoreHorizontal className="text-gray-300 w-5 h-5" />
                </div>
                <div className="p-20 text-center">
                    <FileText className="w-12 h-12 mx-auto text-slate-100 mb-4" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No Generated Reports Found</p>
                    <p className="text-slate-300 text-[10px] mt-1 font-medium">Generate your first system-wide audit to see data here.</p>
                </div>
            </div>
        </div>
    );
}
