'use client';

import { Bell, Clock } from 'lucide-react';

export default function NotificationsPage() {
    const notifications = [
        { id: 1, type: 'alert', title: 'Bus 12 Delay', message: 'Mechanical issue reported by Driver. Replacement bus dispatched.', time: '10 mins ago' },
        { id: 2, type: 'info', title: 'Fee Collection Update', message: 'Monthly financial reports generated for March.', time: '1 hour ago' },
        { id: 3, type: 'success', title: 'Route Optimized', message: 'Route B transit time reduced by 5 minutes successfully.', time: '2 hours ago' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">System Notifications</h1>
                    <p className="text-slate-500 text-sm mt-1">Stay updated with live transport alerts and administrative updates.</p>
                </div>
                <button className="text-primary-600 font-medium text-sm hover:underline">Mark all as read</button>
            </div>

            <div className="space-y-4">
                {notifications.map((n) => (
                    <div key={n.id} className="card flex items-start p-5 hover:border-primary-200 transition-colors">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mr-4 shrink-0 ${n.type === 'alert' ? 'bg-red-50 text-red-600' :
                            n.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                            }`}>
                            <Bell className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <h3 className="font-bold text-slate-800 dark:text-white">{n.title}</h3>
                                <span className="text-xs text-slate-400 font-medium flex items-center">
                                    <Clock className="w-3 h-3 mr-1" /> {n.time}
                                </span>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{n.message}</p>
                            <div className="mt-3 flex gap-3">
                                <button className="text-xs font-semibold text-primary-600 hover:underline">View Details</button>
                                <button className="text-xs font-semibold text-slate-400 hover:text-slate-600">Dismiss</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
