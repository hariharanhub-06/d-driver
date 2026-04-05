'use client';

import {
    LayoutDashboard,
    Building2,
    Users,
    Activity,
    TrendingUp,
    ShieldCheck,
    Globe,
    CreditCard
} from 'lucide-react';

export default function SuperAdminDashboard() {
    const stats = [
        { label: 'Total Schools', value: '12', icon: Building2, trend: '+2 this month', color: 'text-blue-500' },
        { label: 'Active Students', value: '1,842', icon: Users, trend: '+15%', color: 'text-green-500' },
        { label: 'Total Revenue', value: '₹4.2M', icon: IndianRupee, trend: '+22%', color: 'text-amber-500' },
        { label: 'System Uptime', value: '99.98%', icon: Activity, trend: 'Healthy', color: 'text-purple-500' },
    ];

    const recentLogs = [
        { id: 1, event: 'New School Integrated', details: 'St. Marys High-School', time: '2 mins ago', status: 'success' },
        { id: 2, event: 'S3 Storage Backup', details: 'Bucket: d-driver-uploads-2026', time: '45 mins ago', status: 'info' },
        { id: 3, event: 'Database Migration', details: 'Schema updated for multi-tenancy', time: '2 hours ago', status: 'warning' },
        { id: 4, event: 'Admin Login', details: 'Super Admin from Sydney, AU', time: '4 hours ago', status: 'security' },
    ];

    return (
        <div className="space-y-10 animate-in">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter">NETWORK CONTROLLER</h1>
                    <p className="text-slate-600 font-bold uppercase tracking-[0.3em] text-[10px] mt-2 flex items-center">
                        <ShieldCheck className="w-3 h-3 mr-1 text-uber-blue" /> System Wide Monitoring
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="px-5 py-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center group cursor-pointer hover:bg-slate-100 transition-all shadow-sm">
                        <Globe className="w-5 h-5 text-slate-400 mr-3 group-hover:text-uber-blue transition-colors" />
                        <span className="text-sm font-bold text-slate-900">Global Instance: ap-southeast-2</span>
                    </div>
                </div>
            </div>


            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <div key={i} className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 dark:border-white/5 shadow-premium hover:border-uber-blue/20 transition-all group relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-uber-blue/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-uber-blue/10 transition-colors"></div>
                        <div className="relative z-10">
                            <div className="w-14 h-14 bg-slate-50 dark:bg-white/5 rounded-2xl flex items-center justify-center mb-6 border border-slate-100 dark:border-white/5 shadow-inner">
                                <stat.icon className={`w-7 h-7 ${stat.color}`} />
                            </div>
                            <p className="text-slate-400 dark:text-white/40 text-xs font-black uppercase tracking-widest">{stat.label}</p>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white mt-2 tracking-tighter">{stat.value}</h3>
                            <p className="text-[11px] font-bold text-slate-400 dark:text-white/20 mt-3 flex items-center capitalize">
                                <TrendingUp className="w-3 h-3 mr-1 text-green-500" /> {stat.trend}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* System Activity Logs */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-white/5 overflow-hidden shadow-premium">
                    <div className="p-10 border-b border-slate-50 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-[#0c0c0c]">
                        <div>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">System Activity Log</h3>
                            <p className="text-slate-500 dark:text-white/30 text-xs font-bold uppercase tracking-widest mt-1">Real-time Service Monitoring</p>
                        </div>
                        <button className="px-6 py-3 bg-uber-blue text-white font-black rounded-2xl hover:bg-uber-blue/90 transition-all text-xs shadow-lg shadow-uber-blue/20">
                            View Full History
                        </button>
                    </div>
                    <div className="p-6">
                        <table className="w-full">
                            <tbody>
                                {recentLogs.map((log) => (
                                    <tr key={log.id} className="group hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                                        <td className="py-6 px-4">
                                            <div className="flex items-center">
                                                <div className={cn(
                                                    "w-12 h-12 rounded-2xl flex items-center justify-center mr-5 border",
                                                    log.status === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-500' :
                                                        log.status === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                                                            'bg-blue-500/10 border-blue-500/20 text-blue-500'
                                                )}>
                                                    <Activity className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-slate-900 dark:text-white font-bold text-base leading-tight">{log.event}</p>
                                                    <p className="text-slate-400 dark:text-white/30 text-xs font-medium mt-1 uppercase tracking-wider">{log.details}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-6 px-4 text-right">
                                            <p className="text-slate-400 dark:text-white/40 text-xs font-bold uppercase">{log.time}</p>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Quick Actions / Integration Status */}
                <div className="space-y-8">
                    <div className="bg-uber-blue p-10 rounded-[40px] shadow-2xl shadow-uber-blue/20 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                        <div className="relative z-10 text-white">
                            <CreditCard className="w-10 h-10 text-white mb-6" />
                            <h3 className="text-xl font-black tracking-tight leading-tight uppercase">Integration <br />Status</h3>
                            <div className="mt-8 space-y-4">
                                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                                    <span className="text-white/70 text-xs font-bold uppercase tracking-widest">AWS S3</span>
                                    <span className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase">Connected</span>
                                </div>
                                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                                    <span className="text-white/70 text-xs font-bold uppercase tracking-widest">MongoDB</span>
                                    <span className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase">Active</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-white/70 text-xs font-bold uppercase tracking-widest">Vercel Build</span>
                                    <span className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase">Online</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-10 rounded-[40px] border border-slate-100 dark:border-white/5 hover:border-uber-blue/20 transition-all shadow-premium">
                        <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight leading-none uppercase">System Message</h3>
                        <p className="text-slate-500 dark:text-white/40 text-sm mt-6 font-medium leading-relaxed">
                            Welcome to the D-DRIVER Network Controller. All systems are currently operating at peak performance.
                        </p>
                        <button className="w-full mt-10 py-5 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-900 dark:text-white font-black rounded-2xl border border-slate-100 dark:border-white/5 transition-all text-[10px] uppercase tracking-widest shadow-sm">
                            Global Settings
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
}

// Helper icons/utils
function IndianRupee({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M6 3h12" /><path d="M6 8h12" /><path d="m6 13 8.5 8" /><path d="M6 13h3" /><path d="M9 13c6.667 0 6.667-10 0-10" />
        </svg>
    );
}

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}
