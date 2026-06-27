'use client';

import { Menu, Search, Bell, User, Sun, Moon, LogOut, Settings, Globe } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { useTour } from '@/components/tour/TourProvider';
import { useLang, type Lang } from '@/context/LanguageContext';
import { useT } from '@/lib/i18n';
import api from '@/lib/api';
import { notificationHref } from '@/lib/notificationLink';

// Map a role to its notifications route (kept in one place so "View all" never 404s).
const notificationsRouteFor = (role?: string) =>
    role === 'super_admin' ? '/super-admin/notifications'
    : role === 'driver' ? '/driver/notifications'
    : role === 'bus_staff' ? '/bus-staff/notifications'
    : role === 'parent' ? '/parent/notifications'
    : '/admin/notifications';

interface RealNotification {
    id: string;
    message: string;
    type: string;
    is_read: boolean;
    created_at: string;
}

const LANG_OPTIONS: { value: Lang; label: string }[] = [
    { value: 'en', label: 'EN' },
    { value: 'ta', label: 'த' },
    { value: 'both', label: 'EN+த' },
];

export default function Header({ onMenuClick }: { onMenuClick: () => void }) {
    const { user, logout } = useAuth();
    const router = useRouter();
    const { theme, setTheme } = useTheme();
    const { lang, setLang } = useLang();
    const t = useT();
    const [langOpen, setLangOpen] = useState(false);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const notifRef = useRef<HTMLDivElement>(null);
    const profileRef = useRef<HTMLDivElement>(null);
    const [notifications, setNotifications] = useState<RealNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [, setTimeTick] = useState(0);

    // useTour returns a no-op startTour when called outside TourProvider (safe default context)
    const { startTour } = useTour();

    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    const fetchNotifications = useCallback(async () => {
        try {
            const res = await api.get('/notifications?limit=5');
            const data = Array.isArray(res.data) ? res.data : (res.data?.notifications || []);
            setNotifications(data);
            setUnreadCount(data.filter((n: RealNotification) => !n.is_read).length);
        } catch { /* silent */ }
    }, []);

    useEffect(() => {
        if (!user) return;
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [user, fetchNotifications]);

    // Re-render every 60s so relative timestamps ("2 min ago") stay accurate
    useEffect(() => {
        const id = setInterval(() => setTimeTick(tick => tick + 1), 60000);
        return () => clearInterval(id);
    }, []);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
                setIsNotificationOpen(false);
            }
            if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
                setIsProfileOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const markAllRead = async () => {
        try {
            await api.post('/notifications/mark-all-read');
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch { /* silent */ }
    };

    // Click a notification → mark it read and deep-link to the relevant tab (falls back
    // to the full notifications list when there's no specific destination).
    const handleNotifClick = (n: RealNotification) => {
        setIsNotificationOpen(false);
        if (!n.is_read) {
            api.put(`/notifications/${n.id}/read`).catch(() => {});
            setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
            setUnreadCount(c => Math.max(0, c - 1));
        }
        router.push(notificationHref(n.message, user?.role) || notificationsRouteFor(user?.role));
    };

    const timeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return t('just now', 'இப்போதே');
        if (mins < 60) return `${mins} ${t('min', 'நிமி')} ${t('ago', 'முன்பு')}`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ${t('ago', 'முன்பு')}`;
        return `${Math.floor(hrs / 24)}d ${t('ago', 'முன்பு')}`;
    };

    return (
        <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between px-4 sticky top-0 z-[100]">
            {/* Left: hamburger + title */}
            <div className="flex items-center gap-3">
                <button
                    onClick={onMenuClick}
                    className="lg:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors text-slate-500 dark:text-slate-400"
                >
                    <Menu size={20} />
                </button>

                {/* Visual search bar */}
                <div className="hidden md:flex items-center gap-2 bg-slate-100 dark:bg-slate-700 rounded-xl px-4 py-2 w-64 text-sm text-slate-500 dark:text-slate-400 cursor-text select-none">
                    <Search size={15} className="shrink-0 text-slate-400" />
                    <span className="truncate">{t('Search students, routes...', 'மாணவர்கள், வழிகளை தேடுங்கள்...')}</span>
                </div>
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-1.5">
                {/* Dark mode toggle */}
                <button
                    onClick={toggleTheme}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-500 dark:text-slate-400 transition-colors"
                    title={theme === 'dark' ? t('Switch to light mode', 'வெளிர் பயன்முறைக்கு மாறு') : t('Switch to dark mode', 'இருள் பயன்முறைக்கு மாறு')}
                >
                    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </button>

                {/* Language picker */}
                <div className="relative">
                    <button
                        onClick={() => setLangOpen(p => !p)}
                        className="flex items-center gap-1 p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-500 dark:text-slate-400 transition-colors text-xs font-bold"
                        title={t('Language', 'மொழி')}
                    >
                        <Globe size={16} />
                        <span className="hidden sm:inline">{LANG_OPTIONS.find(o => o.value === lang)?.label}</span>
                    </button>
                    {langOpen && (
                        <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden z-50">
                            {LANG_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => { setLang(opt.value); setLangOpen(false); }}
                                    className={cn(
                                        'w-full text-left px-4 py-2.5 text-sm transition-colors',
                                        lang === opt.value
                                            ? 'bg-[var(--brand)]/10 text-[var(--brand)] font-semibold'
                                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                    )}
                                >
                                    {opt.value === 'en' ? '🌐 English' : opt.value === 'ta' ? 'த Tamil' : 'EN + த Both'}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Notifications */}
                <div className="relative" ref={notifRef}>
                    <button
                        onClick={() => {
                            setIsNotificationOpen(!isNotificationOpen);
                            setIsProfileOpen(false);
                        }}
                        className={cn(
                            'relative p-2 rounded-xl transition-colors',
                            isNotificationOpen
                                ? 'bg-[var(--brand)]/10 text-[var(--brand)]'
                                : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400'
                        )}
                    >
                        <Bell size={18} />
                        {unreadCount > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 rounded-full border-2 border-white dark:border-slate-800 text-white text-[9px] font-bold flex items-center justify-center px-0.5">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {isNotificationOpen && (
                        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-in z-50">
                            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-widest">
                                    {t('Notifications', 'அறிவிப்புகள்')}
                                </span>
                                {unreadCount > 0 && (
                                    <span onClick={markAllRead} className="text-xs text-[var(--brand)] font-medium cursor-pointer hover:opacity-80">
                                        {t('Mark all read', 'அனைத்தையும் படித்ததாக குறி')}
                                    </span>
                                )}
                            </div>
                            <div className="max-h-[300px] overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <div className="p-6 text-center text-sm text-slate-400">
                                        {t('No notifications', 'அறிவிப்புகள் இல்லை')}
                                    </div>
                                ) : notifications.map(n => (
                                    <div key={n.id} onClick={() => handleNotifClick(n)} className={cn(
                                        'p-4 border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer group',
                                        !n.is_read && 'bg-[var(--brand)]/5'
                                    )}>
                                        <div className="flex gap-3">
                                            <div className={cn(
                                                'w-2 h-2 rounded-full mt-1.5 shrink-0',
                                                n.type === 'alert' ? 'bg-red-500' : n.type === 'success' ? 'bg-emerald-500' : 'bg-blue-500'
                                            )} />
                                            <div>
                                                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 group-hover:text-[var(--brand)] transition-colors">{n.message}</p>
                                                <p className="text-xs text-slate-400 mt-0.5">{timeAgo(n.created_at)}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div
                                onClick={() => {
                                    setIsNotificationOpen(false);
                                    router.push(notificationsRouteFor(user?.role));
                                }}
                                className="p-3 text-center bg-slate-50 dark:bg-slate-700/50 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest cursor-pointer hover:text-[var(--brand)] transition-colors"
                            >
                                {t('View all', 'அனைத்தும் காண்')}
                            </div>
                        </div>
                    )}
                </div>

                <div className="h-7 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

                {/* Profile dropdown */}
                <div className="relative" ref={profileRef}>
                    <button
                        onClick={() => {
                            setIsProfileOpen(!isProfileOpen);
                            setIsNotificationOpen(false);
                        }}
                        className={cn(
                            'flex items-center gap-2.5 px-2 py-1.5 rounded-xl transition-all',
                            isProfileOpen
                                ? 'bg-slate-100 dark:bg-slate-700'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                        )}
                    >
                        <div className="w-8 h-8 rounded-xl bg-[var(--brand)]/10 flex items-center justify-center shrink-0 overflow-hidden">
                            {user?.profile_photo_url
                                ? <img src={user.profile_photo_url} alt={user.name} className="w-full h-full object-cover" />
                                : <User size={16} className="text-[var(--brand)]" />
                            }
                        </div>
                        <div className="text-left hidden sm:block">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white leading-none">{user?.name || 'User'}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 capitalize">
                                {user?.role?.replace('_', ' ') || 'Admin'}
                            </p>
                        </div>
                    </button>

                    {isProfileOpen && (
                        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-in z-50">
                            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[var(--brand)]/10 flex items-center justify-center text-[var(--brand)] overflow-hidden shrink-0">
                                    {user?.profile_photo_url
                                        ? <img src={user.profile_photo_url} alt={user?.name} className="w-full h-full object-cover" />
                                        : <User size={20} />
                                    }
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user?.name || 'User'}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email || ''}</p>
                                </div>
                            </div>
                            <div className="p-2 space-y-0.5">
                                <button
                                    onClick={() => {
                                        setIsProfileOpen(false);
                                        router.push(`/${user?.role === 'super_admin' ? 'super-admin' : user?.role === 'driver' ? 'driver' : 'admin'}/settings`);
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-[var(--brand)] rounded-xl transition-all flex items-center gap-2"
                                >
                                    <User size={15} /> {t('My Profile', 'என் சுயவிவரம்')}
                                </button>
                                <button
                                    onClick={() => {
                                        setIsProfileOpen(false);
                                        router.push(`/${user?.role === 'super_admin' ? 'super-admin' : user?.role === 'driver' ? 'driver' : 'admin'}/settings`);
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-[var(--brand)] rounded-xl transition-all flex items-center gap-2"
                                >
                                    <Settings size={15} /> {t('Account Settings', 'கணக்கு அமைப்புகள்')}
                                </button>
                                <div className="h-px bg-slate-100 dark:bg-slate-700 mx-1 my-1" />
                                <button
                                    onClick={() => logout?.()}
                                    className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all flex items-center gap-2"
                                >
                                    <LogOut size={15} /> {t('Sign Out', 'வெளியேறு')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
