'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BellOff, Check, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { ta, useT } from '@/lib/i18n';
import { notificationHref } from '@/lib/notificationLink';

interface Notification {
    id: string;
    message: string;
    type: 'alert' | 'info' | 'success';
    student_name?: string | null;
    is_read: boolean;
    created_at: string;
}

// ── ALL EXISTING LOGIC PRESERVED ──────────────────────────────────────────
export default function ParentNotificationsPage() {
    const t = useT();
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const limit = 20;

    const fetchNotifications = async (p = 1) => {
        setLoading(true); setError('');
        try {
            const res = await api.get(`/notifications?page=${p}&limit=${limit}`);
            const data = res.data;
            setNotifications(Array.isArray(data) ? data : data.notifications || []);
            setTotal(data.total || 0);
            setPage(p);
        } catch { setError('Failed to load notifications. Please try again.'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchNotifications(); }, []);

    const markAllRead = async () => {
        try {
            await api.post('/notifications/mark-all-read');
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            window.dispatchEvent(new Event('notifications-read'));
        } catch {}
    };

    const markRead = async (id: string) => {
        try {
            await api.put(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            window.dispatchEvent(new Event('notifications-read'));
        } catch {}
    };

    const unread = notifications.filter(n => !n.is_read).length;

    // Group notifications: today vs older
    const todayStr = new Date().toLocaleDateString('en-CA');
    const todayNotifs = notifications.filter(n => n.created_at?.startsWith(todayStr));
    const olderNotifs = notifications.filter(n => !n.created_at?.startsWith(todayStr));

    const typeIcon = (type: string) => {
        if (type === 'success') return '✅';
        if (type === 'alert') return '⚠️';
        return 'ℹ️';
    };
    const typeBg = (type: string, read: boolean) => {
        const base = read ? 'opacity-60 ' : '';
        if (type === 'success') return base + 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800';
        if (type === 'alert') return base + 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800';
        return base + 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800';
    };

    const fmtTime = (ts: string) => {
        try { return new Date(ts).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }
        catch { return ''; }
    };

    const handleCardClick = (n: Notification) => {
        if (!n.is_read) markRead(n.id);
        const href = notificationHref(n.message, 'parent');
        if (href) router.push(href);
    };

    const NotifCard = ({ n }: { n: Notification }) => (
        <div onClick={() => handleCardClick(n)} className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${typeBg(n.type, n.is_read)}`}>
            <span className="text-xl shrink-0 mt-0.5">{typeIcon(n.type)}</span>
            <div className="flex-1 min-w-0">
                {n.student_name && (
                    <span className="inline-block mb-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[var(--accent)]/15 text-[var(--accent)]">
                        {n.student_name}
                    </span>
                )}
                <p className="text-sm text-slate-800 dark:text-slate-200 leading-snug">{n.message}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{fmtTime(n.created_at)}</p>
            </div>
            {!n.is_read && <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-2" />}
        </div>
    );

    // ─── NEW BILINGUAL UI ────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
            {/* Header */}
            <div className="bg-slate-800 dark:bg-slate-900 px-4 pt-10 pb-5">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-white">
                            {t('Alerts & Notifications', ta.alerts)}
                        </h1>
                        <p className="text-white/60 text-xs mt-0.5">
                            {t('Notifications', ta.alerts)} {unread > 0 && `· ${unread} ${t('unread', ta.unread)}`}
                        </p>
                    </div>
                    <button onClick={markAllRead} disabled={unread === 0} className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-all disabled:opacity-40">
                        <Check className="w-3.5 h-3.5" /> {t('Mark all read', ta.markAllRead)}{unread > 0 ? ` (${unread})` : ''}
                    </button>
                </div>
            </div>

            <div className="px-4 py-4 space-y-4 pb-6">
                {loading && <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>}

                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm text-red-700 dark:text-red-300 flex items-center justify-between">
                        <span>{error}</span>
                        <button onClick={() => fetchNotifications(page)} className="font-medium underline">{t('Retry', ta.retry)}</button>
                    </div>
                )}

                {!loading && !error && notifications.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                        <BellOff className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                        <p className="text-slate-500 dark:text-slate-400 font-medium">{t('No notifications yet', ta.noNotifications)}</p>
                        <p className="text-sm text-slate-400">{t('Bus updates and alerts will appear here.', 'பேருந்து புதுப்பிப்புகள் இங்கே தோன்றும்.')}</p>
                    </div>
                )}

                {/* Today's Alerts */}
                {todayNotifs.length > 0 && (
                    <div>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 px-1">
                            {t("Today's Alerts", ta.todayAlerts)}
                        </p>
                        <div className="space-y-2">
                            {todayNotifs.map(n => <NotifCard key={n.id} n={n} />)}
                        </div>
                    </div>
                )}

                {/* Older */}
                {olderNotifs.length > 0 && (
                    <div>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 px-1">{t('Earlier', 'முந்தையவை')}</p>
                        <div className="space-y-2">
                            {olderNotifs.map(n => <NotifCard key={n.id} n={n} />)}
                        </div>
                    </div>
                )}

                {/* Pagination */}
                {total > limit && (
                    <div className="flex items-center justify-center gap-3 pt-4">
                        <button disabled={page === 1} onClick={() => fetchNotifications(page - 1)} className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40">{t('Previous', 'முந்தைய')}</button>
                        <span className="text-sm text-slate-500">{t('Page', 'பக்கம்')} {page}</span>
                        <button disabled={page * limit >= total} onClick={() => fetchNotifications(page + 1)} className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40">{t('Next', 'அடுத்து')}</button>
                    </div>
                )}
            </div>
        </div>
    );
}
