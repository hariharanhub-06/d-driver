'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, AlertCircle, Info, CheckCircle, Clock } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { getSocket } from '@/lib/socket';

interface Notification {
    id: string;
    type: 'alert' | 'info' | 'success';
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
}

type Filter = 'all' | 'unread' | 'alerts';

function timeAgo(ts: string): string {
    const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

function NotifIcon({ type }: { type: Notification['type'] }) {
    if (type === 'alert') return <AlertCircle className="w-4 h-4" />;
    if (type === 'success') return <CheckCircle className="w-4 h-4" />;
    return <Info className="w-4 h-4" />;
}

function iconBg(type: Notification['type']) {
    if (type === 'alert') return 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400';
    if (type === 'success') return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400';
    return 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
}

export default function NotificationsPage() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState<Filter>('all');
    const [markingAll, setMarkingAll] = useState(false);

    const fetchNotifications = useCallback(async () => {
        try {
            const { data } = await api.get('/notifications');
            setNotifications(data || []);
            setError('');
        } catch {
            setError('Failed to load notifications.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // Socket.io — real-time new notifications
    useEffect(() => {
        if (!user?.school_id) return;
        let socket: ReturnType<typeof getSocket> | null = null;
        try {
            socket = getSocket();
            socket.emit('join-school-room', user.school_id);
            socket.on('notification', (data: Notification) => {
                setNotifications(prev => [data, ...prev]);
            });
        } catch {
            // socket unavailable — polling-only mode
        }
        return () => {
            if (socket) {
                socket.off('notification');
            }
        };
    }, [user?.school_id]);

    const handleMarkRead = async (id: string) => {
        try {
            await api.put(`/notifications/${id}/read`);
        } catch {
            // optimistic — don't revert
        }
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, is_read: true } : n)
        );
    };

    const handleMarkAllRead = async () => {
        setMarkingAll(true);
        try {
            await api.post('/notifications/mark-all-read');
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch {
            setError('Failed to mark all as read.');
        } finally {
            setMarkingAll(false);
        }
    };

    const filtered = notifications.filter(n => {
        if (filter === 'unread') return !n.is_read;
        if (filter === 'alerts') return n.type === 'alert';
        return true;
    });

    const unreadCount = notifications.filter(n => !n.is_read).length;

    const tabs: { key: Filter; label: string }[] = [
        { key: 'all', label: 'All' },
        { key: 'unread', label: `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}` },
        { key: 'alerts', label: 'Alerts' },
    ];

    return (
        <div className="space-y-6 animate-in max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Notifications</h1>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                        Live alerts and system updates
                    </p>
                </div>
                {unreadCount > 0 && (
                    <button
                        onClick={handleMarkAllRead}
                        disabled={markingAll}
                        className="text-sm font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl transition-colors disabled:opacity-60"
                    >
                        {markingAll ? 'Marking...' : 'Mark All Read'}
                    </button>
                )}
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 border border-red-200 rounded-xl p-3 text-sm">{error}</div>
            )}

            {/* Filter Tabs */}
            <div className="flex gap-1 bg-gray-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setFilter(tab.key)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                            filter === tab.key
                                ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
                                : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* List */}
            {loading ? (
                <div className="flex items-center justify-center h-40">
                    <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 bg-gray-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-4">
                        <Bell className="w-7 h-7 text-gray-300" />
                    </div>
                    <p className="text-sm font-semibold text-gray-400">
                        {filter === 'unread' ? 'No unread notifications' : filter === 'alerts' ? 'No alerts' : 'No notifications yet'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(n => (
                        <div
                            key={n.id}
                            onClick={() => !n.is_read && handleMarkRead(n.id)}
                            className={`bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-4 flex items-start gap-4 shadow-sm transition-all cursor-pointer hover:shadow-md ${
                                !n.is_read ? 'border-l-4 border-l-blue-400' : ''
                            }`}
                        >
                            {/* Icon */}
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg(n.type)}`}>
                                <NotifIcon type={n.type} />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold text-sm text-gray-900 dark:text-white leading-tight">
                                            {n.title}
                                        </h3>
                                        {!n.is_read && (
                                            <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />
                                        )}
                                    </div>
                                    <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1 shrink-0">
                                        <Clock className="w-3 h-3" />
                                        {timeAgo(n.created_at)}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 leading-relaxed">
                                    {n.message}
                                </p>
                                {!n.is_read && (
                                    <button
                                        onClick={e => { e.stopPropagation(); handleMarkRead(n.id); }}
                                        className="mt-2 text-[10px] font-semibold text-blue-500 hover:text-blue-700 uppercase tracking-wide"
                                    >
                                        Mark as read
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
