'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useSchoolBranding, useSetSchoolBranding } from '@/context/SchoolBrandingContext';
import type { SchoolPermissions } from '@/context/SchoolBrandingContext';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { ta } from '@/lib/i18n';

const ParentTour = dynamic(() => import('@/components/tour/ParentTour'), { ssr: false });

// Icons as inline SVGs to keep bundle tight
function IconTrack({ active }: { active: boolean }) {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--brand)' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
        </svg>
    );
}
function IconAttend({ active }: { active: boolean }) {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--brand)' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
            <path d="M9 16l2 2 4-4"/>
        </svg>
    );
}
function IconBell({ active, badge }: { active: boolean; badge?: number }) {
    return (
        <div className="relative">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--brand)' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {badge && badge > 0 ? (
                <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 rounded-full text-white text-[9px] font-black flex items-center justify-center px-0.5 leading-none">
                    {badge > 9 ? '9+' : badge}
                </span>
            ) : null}
        </div>
    );
}
function IconUser({ active }: { active: boolean }) {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--brand)' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
        </svg>
    );
}

export default function ParentLayout({ children }: { children: React.ReactNode }) {
    // ── ALL EXISTING LOGIC PRESERVED ──────────────────────────────────────────
    const { user, loading, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const branding = useSchoolBranding();
    const setSchoolBranding = useSetSchoolBranding();
    const [unreadCount, setUnreadCount] = useState(0);

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
    // ─────────────────────────────────────────────────────────────────────────

    // Bottom tabs — same routes as before, no changes
    const tabs = [
        {
            href: '/parent/dashboard',
            labelEn: 'Track',
            labelTa: ta.track,
            icon: (active: boolean) => <IconTrack active={active} />,
            disabled: !allow('gps_tracking'),
        },
        {
            href: '/parent/attendance',
            labelEn: 'Attendance',
            labelTa: ta.attendance,
            icon: (active: boolean) => <IconAttend active={active} />,
            disabled: !allow('attendance'),
        },
        {
            href: '/parent/notifications',
            labelEn: 'Alerts',
            labelTa: ta.alerts,
            icon: (active: boolean) => <IconBell active={active} badge={unreadCount} />,
            disabled: false,
        },
        {
            href: '/parent/profile',
            labelEn: 'Profile',
            labelTa: ta.profile,
            icon: (active: boolean) => <IconUser active={active} />,
            disabled: false,
        },
    ];

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-900">
            {/* Page content — pb-20 so content never hides behind bottom tab bar */}
            <main className="flex-1 overflow-y-auto pb-20">
                {children}
            </main>

            {/* Bottom tab bar */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 safe-area-inset-bottom">
                <div className="flex items-stretch h-16">
                    {tabs.map(tab => {
                        const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/');
                        if (tab.disabled) {
                            return (
                                <div key={tab.href} className="flex-1 flex flex-col items-center justify-center gap-0.5 opacity-30 pointer-events-none select-none">
                                    {tab.icon(false)}
                                    <span className="text-[9px] font-semibold text-slate-400">{tab.labelEn}</span>
                                    <span className="text-[8px] text-slate-300 leading-none">{tab.labelTa}</span>
                                </div>
                            );
                        }
                        return (
                            <Link
                                key={tab.href}
                                href={tab.href}
                                className={cn(
                                    'flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors',
                                    isActive ? 'text-[var(--brand)]' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                                )}
                            >
                                {tab.icon(isActive)}
                                <span className={cn('text-[9px] font-semibold leading-none', isActive ? 'text-[var(--brand)]' : 'text-slate-500 dark:text-slate-400')}>
                                    {tab.labelEn}
                                </span>
                                <span className={cn('text-[8px] leading-none', isActive ? 'text-[var(--brand)]/70' : 'text-slate-400 dark:text-slate-500')}>
                                    {tab.labelTa}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </nav>

            <ParentTour />
        </div>
    );
}
