'use client';

import { Bell, Clock, Info, CheckCircle2, AlertTriangle, X } from 'lucide-react';

export default function NotificationsPage() {
    const notifications = [
        { id: 1, type: 'alert', title: 'Bus 12 Delay', message: 'Mechanical issue reported by Driver. Replacement bus dispatched.', time: '10 mins ago' },
        { id: 2, type: 'info', title: 'Fee Collection Update', message: 'Monthly financial reports generated for March.', time: '1 hour ago' },
        { id: 3, type: 'success', title: 'Route Optimized', message: 'Route B transit time reduced by 5 minutes successfully.', time: '2 hours ago' },
    ];

    return (
        <div className="space-y-6 animate-in max-w-4xl mx-auto">
            <div className="flex justify-between items-center shrink-0">
                <div>
                    <h1 className="text-2xl font-black tracking-tight leading-none text-slate-900 dark:text-white">Admin Broadcasts</h1>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-2">Live operational alerts and institutional updates.</p>
                </div>
                <button className="text-primary-600 font-bold text-[10px] uppercase tracking-widest hover:bg-primary-50 px-3 py-1.5 rounded-lg transition-all">Mark all as read</button>
            </div>

            <div className="space-y-3.5">
                {notifications.map((n) => (
                    <div key={n.id} className="card flex items-start p-4 hover:border-primary-200 transition-all cursor-pointer group shadow-sm border-none">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center mr-4 shrink-0 shadow-sm ${n.type === 'alert' ? 'bg-red-50 text-red-600' :
                            n.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                            }`}>
                            {n.type === 'alert' ? <AlertTriangle size={16} /> : n.type === 'success' ? <CheckCircle2 size={16} /> : <Info size={16} />}
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <h3 className="font-black text-sm text-slate-900 dark:text-white leading-tight">{n.title}</h3>
                                <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest flex items-center bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                    <Clock className="w-2.5 h-2.5 mr-1" /> {n.time}
                                </span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">{n.message}</p>
                            <div className="mt-4 flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="text-[10px] font-black uppercase tracking-widest text-primary-600 bg-primary-50 px-3 py-1 rounded-lg">View Details</button>
                                <button className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 px-2 py-1">Dismiss</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {notifications.length === 0 && (
                <div className="py-20 text-center">
                    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-4">
                        <Bell className="w-6 h-6 text-slate-300" />
                    </div>
                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Inbox Zero</p>
                </div>
            )}
        </div>
    );
}
