'use client';

import { useState, useEffect } from 'react';
import {
    Home, Locate, CalendarDays, CreditCard, MapPin, Bell,
    User, Bus, LogOut, X, Menu, Sun, Moon,
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useAuth } from '@/context/AuthContext';
import { useSchoolBranding, useSetSchoolBranding } from '@/context/SchoolBrandingContext';
import type { SchoolPermissions } from '@/context/SchoolBrandingContext';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import AccountSwitcher from '@/components/AccountSwitcher';

export default function ParentLayout({ children }: { children: React.ReactNode }) {
    const { user, loading, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const branding = useSchoolBranding();
    const setSchoolBranding = useSetSchoolBranding();
    const { theme, setTheme } = useTheme();
    const [unreadCount, setUnreadCount] = useState(0);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        if (!loading && !user) router.push('/login');
    }, [user, loading, router]);

    useEffect(() => {
        if (!user) return;
        api.get('/schools/branding').then(({ data }) => {
            if (!data || !data.name) return;
            setSchoolBranding({
                name: data.name,
                logo_url: data.logo_url || '',
                primary_color: data.primary_color || '#3B82F6',
                permissions: data.permissions || null,
            });
            if (data.primary_color) document.documentElement.style.setProperty('--brand', data.primary_color);
        }).catch(() => {});
    }, [user]);

    useEffect(() => {
        if (!user) return;
        api.get('/notifications/unread-count')
            .then(res => setUnreadCount(res.data?.count ?? res.data?.unread_count ?? 0))
            .catch(() => {});
        const handler = () => setUnreadCount(0);
        window.addEventListener('notifications-read', handler);
        return () => window.removeEventListener('notifications-read', handler);
    }, [user]);

    if (loading || !user) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex justify-center items-center">
                <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const p = branding.permissions as SchoolPermissions | null;
    const allow = (key: keyof SchoolPermissions) => !p || p[key] !== false;

    const navItems = [
        { icon: Home, label: 'Home', href: '/parent/dashboard' },
        { icon: Locate, label: 'Track Bus', href: '/parent/tracking', disabled: !allow('gps_tracking') },
        { icon: CalendarDays, label: 'Attendance', href: '/parent/attendance', disabled: !allow('attendance') },
        { icon: CreditCard, label: 'Fees', href: '/parent/fees', disabled: !allow('fee_management') },
        { icon: MapPin, label: 'Change Stop', href: '/parent/request', disabled: !allow('stop_change_requests') },
        { icon: Bell, label: 'Notifications', href: '/parent/notifications' },
        { icon: User, label: 'Profile', href: '/parent/profile' },
    ];

    const closeSidebar = () => setSidebarOpen(false);

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden">
            {/* Sidebar overlay (mobile) */}
            {sidebarOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden" onClick={closeSidebar} />
            )}

            {/* Sidebar */}
            <aside className={cn(
                'fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-white dark:bg-slate-800 border-r border-slate-100 dark:border-slate-700 transition-transform duration-300 ease-in-out',
                'lg:relative lg:translate-x-0 lg:flex',
                sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
            )}>
                {/* Logo */}
                <div className="flex items-center justify-between h-16 px-5 border-b border-slate-100 dark:border-slate-700 shrink-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                        {branding.logo_url ? (
                            <img src={branding.logo_url} alt={branding.name} className="h-8 w-8 rounded-lg object-cover overflow-hidden shrink-0" />
                        ) : (
                            <div className="w-8 h-8 rounded-lg bg-[var(--brand)] flex items-center justify-center shrink-0">
                                <Bus className="w-4 h-4 text-white" />
                            </div>
                        )}
                        <span className="font-bold text-slate-900 dark:text-white text-sm truncate">{branding.name || 'D-Driver'}</span>
                    </div>
                    <button onClick={closeSidebar} className="lg:hidden text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Nav */}
                <div className="flex-1 overflow-y-auto py-4">
                    <nav className="space-y-0.5 px-2">
                        {navItems.map(item => {
                            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                            if ((item as any).disabled) {
                                return (
                                    <div
                                        key={item.href}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 opacity-40 cursor-not-allowed pointer-events-none"
                                    >
                                        <item.icon className="w-4 h-4 shrink-0" />
                                        <span>{item.label}</span>
                                    </div>
                                );
                            }
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={closeSidebar}
                                    className={cn(
                                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                                        isActive
                                            ? 'bg-[var(--brand)]/10 text-[var(--brand)]'
                                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white'
                                    )}
                                >
                                    <item.icon className="w-4 h-4 shrink-0" />
                                    <span>{item.label}</span>
                                    {item.href === '/parent/notifications' && unreadCount > 0 && (
                                        <span className="ml-auto w-5 h-5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                                            {unreadCount > 9 ? '9+' : unreadCount}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                {/* User + Logout */}
                <div className="border-t border-slate-100 dark:border-slate-700 p-4 shrink-0">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-xl bg-[var(--brand)]/10 flex items-center justify-center shrink-0">
                            <User className="w-4 h-4 text-[var(--brand)]" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user?.name || 'Parent'}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email || ''}</p>
                        </div>
                        <AccountSwitcher />
                    </div>
                    <button
                        onClick={logout}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main area */}
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                {/* Top header */}
                <header className="bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 px-4 h-14 flex items-center justify-between sticky top-0 z-30 shrink-0">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <Menu className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                    </button>
                    <span className="font-bold text-slate-900 dark:text-white text-sm lg:text-base truncate">{branding.name || 'Parent Portal'}</span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
                        >
                            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </button>
                    <button
                        onClick={() => router.push('/parent/notifications')}
                        className="relative w-9 h-9 flex items-center justify-center bg-slate-50 dark:bg-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-600 transition-all"
                    >
                        <Bell className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                        {unreadCount > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900">
                    {children}
                </main>
            </div>
        </div>
    );
}
