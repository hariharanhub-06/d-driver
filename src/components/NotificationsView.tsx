'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, AlertCircle, Info, CheckCircle, Clock } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { getSocket } from '@/lib/socket';
import { useT } from '@/lib/i18n';
import { notificationHref } from '@/lib/notificationLink';

interface Notification {
    id: string;
    type: 'alert' | 'info' | 'success';
    title?: string;
    message: string;
    is_read: boolean;
    created_at: string;
    school_name?: string | null;
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

// Shared notifications list used by every role's notifications page.
// Clicking a notification marks it read and deep-links to the relevant tab when possible.
export default function NotificationsView() {
    const t = useT();
    const router = useRouter();
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

    useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

    useEffect(() => {
        if (!user?.id) return;
        let socket: ReturnType<typeof getSocket> | null = null;
        try {
            socket = getSocket();
            socket.emit('join-user-room', user.id);
            socket.on('new-notification', (data: Notification) => setNotifications(prev => [data, ...prev]));
        } catch { /* polling-only */ }
        return () => { if (socket) socket.off('new-notification'); };
    }, [user?.id]);

    const markRead = async (id: string) => {
        try { await api.put(`/notifications/${id}/read`); } catch { /* optimistic */ }
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        window.dispatchEvent(new Event('notifications-read'));
    };

    const handleClick = (n: Notification) => {
        if (!n.is_read) markRead(n.id);
        const href = notificationHref(n.message, user?.role);
        if (href) router.push(href);
    };

    const handleMarkAllRead = async () => {
        setMarkingAll(true);
        try {
            await api.post('/notifications/mark-all-read');
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            window.dispatchEvent(new Event('notifications-read'));
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
        { key: 'all', label: t('All', 'அனைத்தும்') },
        { key: 'unread', label: `${t('Unread', 'படிக்காதவை')}${unreadCount > 0 ? ` (${unreadCount})` : ''}` },
        { key: 'alerts', label: t('Alerts', 'அறிவிப்புகள்') },
    ];

    return (
        <div className="space-y-6 animate-in max-w-3xl mx-auto p-4 sm:p-0">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('Notifications', 'அறிவிப்புகள்')}</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {t('Live alerts and system updates', 'நேரடி அறிவிப்புகள் மற்றும் கணினி புதுப்பிப்புகள்')}
                    </p>
                </div>
                <button
                    onClick={handleMarkAllRead}
                    disabled={markingAll || unreadCount === 0}
                    className="flex items-center gap-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-4 py-2.5 font-semibold text-sm disabled:opacity-50"
                >
                    {markingAll ? t('Marking...', 'குறிக்கிறது...') : t('Mark All Read', 'அனைத்தையும் படித்ததாக குறிக்கவும்')}{unreadCount > 0 ? ` (${unreadCount})` : ''}
                </button>
            </div>

            {error && <div className="bg-red-50 text-red-600 border border-red-200 rounded-xl p-3 text-sm">{error}</div>}

            <div className="flex border-b border-slate-100 dark:border-slate-700">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setFilter(tab.key)}
                        className={filter === tab.key
                            ? 'px-4 py-2 text-sm font-semibold text-[var(--brand)] border-b-2 border-[var(--brand)]'
                            : 'px-4 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border-b-2 border-transparent'}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin"></div></div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">
                    <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>{filter === 'unread' ? t('No unread notifications', 'படிக்காத அறிவிப்புகள் இல்லை') : filter === 'alerts' ? t('No alerts', 'அறிவிப்புகள் இல்லை') : t('No notifications yet', 'அறிவிப்புகள் இல்லை')}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(n => (
                        <div
                            key={n.id}
                            onClick={() => handleClick(n)}
                            className={`bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-4 flex items-start gap-4 transition-all cursor-pointer hover:shadow-md ${
                                !n.is_read ? 'border-l-4 border-l-[var(--brand)]' : ''
                            }`}
                        >
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg(n.type)}`}>
                                <NotifIcon type={n.type} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                    {n.title && (
                                        <h3 className="font-semibold text-sm text-slate-900 dark:text-white leading-tight">{n.title}</h3>
                                    )}
                                    <span className="text-xs text-slate-400 font-medium flex items-center gap-1 shrink-0 ml-auto">
                                        <Clock className="w-3 h-3" />
                                        {timeAgo(n.created_at)}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{n.message}</p>
                                {user?.role === 'super_admin' && n.school_name && (
                                    <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-semibold text-[var(--brand)] bg-[var(--brand)]/10 px-2 py-0.5 rounded-full">
                                        🏫 {n.school_name}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
