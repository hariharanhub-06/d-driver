'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff, Check, Loader2 } from 'lucide-react';
import api from '@/lib/api';

interface Notification {
    id: string;
    message: string;
    type: 'alert' | 'info' | 'success';
    is_read: boolean;
    created_at: string;
}

export default function ParentNotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const limit = 20;

    const fetchNotifications = async (p = 1) => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get(`/notifications?page=${p}&limit=${limit}`);
            const data = res.data;
            setNotifications(Array.isArray(data) ? data : data.notifications || []);
            setTotal(data.total || 0);
            setPage(p);
        } catch {
            setError('Failed to load notifications. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchNotifications(); }, []);

    const markAllRead = async () => {
        try {
            await api.post('/notifications/mark-all-read');
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            window.dispatchEvent(new Event('notifications-read'));
        } catch { /* non-fatal */ }
    };

    const markRead = async (id: string) => {
        try {
            await api.put(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        } catch { /* non-fatal */ }
    };

    const typeColor = (type: string) => {
        if (type === 'alert') return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
        if (type === 'success') return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    };

    const dotColor = (type: string) => {
        if (type === 'alert') return 'bg-red-500';
        if (type === 'success') return 'bg-green-500';
        return 'bg-blue-500';
    };

    const unread = notifications.filter(n => !n.is_read).length;

    return (
        <div className="space-y-4 p-4 pb-24">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">Notifications</h1>
                    {unread > 0 && (
                        <p className="text-sm text-slate-500 dark:text-slate-400">{unread} unread</p>
                    )}
                </div>
                {unread > 0 && (
                    <button
                        onClick={markAllRead}
                        className="flex items-center gap-1.5 text-sm font-medium text-[var(--brand)] hover:opacity-80"
                    >
                        <Check className="w-4 h-4" />
                        Mark all read
                    </button>
                )}
            </div>

            {loading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
            )}

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm text-red-700 dark:text-red-300 flex items-center justify-between">
                    <span>{error}</span>
                    <button onClick={() => fetchNotifications(page)} className="font-medium underline">Retry</button>
                </div>
            )}

            {!loading && !error && notifications.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                    <BellOff className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                    <p className="text-slate-500 dark:text-slate-400 font-medium">No notifications yet</p>
                    <p className="text-sm text-slate-400 dark:text-slate-500">Bus updates and alerts will appear here.</p>
                </div>
            )}

            <div className="space-y-2">
                {notifications.map(n => (
                    <div
                        key={n.id}
                        onClick={() => !n.is_read && markRead(n.id)}
                        className={`flex gap-3 p-4 rounded-xl border cursor-pointer transition-opacity ${typeColor(n.type)} ${n.is_read ? 'opacity-60' : ''}`}
                    >
                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${dotColor(n.type)}`} />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-800 dark:text-slate-200 leading-snug">{n.message}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                {new Date(n.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                        {!n.is_read && (
                            <div className="w-2 h-2 rounded-full bg-[var(--brand)] flex-shrink-0 mt-1.5" />
                        )}
                    </div>
                ))}
            </div>

            {total > limit && (
                <div className="flex items-center justify-center gap-3 pt-4">
                    <button
                        disabled={page === 1}
                        onClick={() => fetchNotifications(page - 1)}
                        className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40"
                    >
                        Previous
                    </button>
                    <span className="text-sm text-slate-500">Page {page}</span>
                    <button
                        disabled={page * limit >= total}
                        onClick={() => fetchNotifications(page + 1)}
                        className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
}
