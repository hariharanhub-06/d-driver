'use client';

import { FileText, Download, Filter, TrendingUp, BarChart3, PieChart, Info, MoreHorizontal } from 'lucide-react';

export default function ReportsPage() {
    const reports = [
        { id: 1, name: 'Monthly Revenue Summary', date: 'Oct 2024', size: '2.4 MB', type: 'PDF' },
        { id: 2, name: 'Attendance & Transport Efficiency', date: 'Oct 2024', size: '1.8 MB', type: 'Excel' },
        { id: 3, name: 'School Growth Analytics', date: 'Sep 2024', size: '4.2 MB', type: 'PDF' },
        { id: 4, name: 'System Performance Audit', date: 'Sep 2024', size: '0.5 MB', type: 'Log' },
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
                {[
                    { label: 'Active Routes', value: '1,242', change: '+8.4%', icon: TrendingUp },
                    { label: 'Student Growth', value: '15.2K', change: '+12%', icon: BarChart3 },
                    { label: 'Service Uptime', value: '99.9%', change: 'Stable', icon: Info },
                    { label: 'Revenue Yield', value: '₹840K', change: '+5.2%', icon: PieChart },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:border-primary-200 transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center">
                                <stat.icon className="w-5 h-5 text-slate-400" />
                            </div>
                            <span className="text-[10px] font-black text-green-500 bg-green-50 px-2 py-1 rounded-full uppercase tracking-tighter">{stat.change}</span>
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
                        <p className="text-2xl font-black text-slate-900">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Reports List */}
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-8 py-6 border-b border-gray-50 flex justify-between items-center">
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">Recent Archives</h3>
                    <MoreHorizontal className="text-gray-300 w-5 h-5" />
                </div>
                <div className="divide-y divide-gray-50">
                    {reports.map((report) => (
                        <div key={report.id} className="px-8 py-6 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                            <div className="flex items-center gap-6">
                                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100 group-hover:bg-white transition-all shadow-inner">
                                    <FileText className="w-6 h-6 text-slate-300 group-hover:text-primary-500" />
                                </div>
                                <div>
                                    <p className="text-base font-bold text-slate-900">{report.name}</p>
                                    <div className="flex gap-4 mt-1">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{report.date}</span>
                                        <span className="text-[10px] font-bold text-primary-500 uppercase tracking-widest">{report.type} • {report.size}</span>
                                    </div>
                                </div>
                            </div>
                            <button className="p-3 bg-gray-50 rounded-xl hover:bg-primary-50 hover:text-primary-500 transition-all text-gray-400">
                                <Download className="w-5 h-5" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
