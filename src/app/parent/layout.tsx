'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/context/AuthContext';
import { useSchoolBranding, useSetSchoolBranding } from '@/context/SchoolBrandingContext';
import type { SchoolPermissions } from '@/context/SchoolBrandingContext';
import { LanguageProvider, useLang } from '@/context/LanguageContext';
import { biLabel, ta } from '@/lib/i18n';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';

const ParentTour = dynamic(() => import('@/components/tour/ParentTour'), { ssr: false });

function IconTrack({ active }: { active: boolean }) {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--brand)' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
        </svg>
    );
}
function IconFees({ active }: { active: boolean }) {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--brand)' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
            <line x1="1" y1="10" x2="23" y2="10"/>
        </svg>
    );
}
function IconRequests({ active }: { active: boolean }) {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--brand)' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
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

function LangToggle() {
    const { lang, setLang } = useLang();
    const options: Array<{ value: 'en' | 'ta' | 'both'; label: string }> = [
        { value: 'en', label: 'EN' },
        { value: 'ta', label: 'த' },
        { value: 'both', label: 'EN+த' },
    ];
    const current = options.find(o => o.value === lang) || options[2];
    const nextIndex = (options.findIndex(o => o.value === lang) + 1) % options.length;
    return (
        <button
            onClick={() => setLang(options[nextIndex].value)}
            className="w-12 flex flex-col items-center justify-center gap-0.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors border-l border-slate-100 dark:border-slate-700"
            title="Switch language"
        >
            <span className="text-[11px] font-bold leading-none">{current.label}</span>
            <span className="text-[7px] leading-none mt-0.5 text-slate-400">Lang</span>
        </button>
    );
}

function ParentNav() {
    const pathname = usePathname();
    const { lang } = useLang();
    const { theme, setTheme } = useTheme();
    const branding = useSchoolBranding();
    const p = branding.permissions as SchoolPermissions | null;
    const allow = (key: keyof SchoolPermissions) => !p || p[key] !== false;

    const tabs = [
        {
            href: '/parent/dashboard',
            labelEn: 'Track',
            labelTa: ta.track,
            icon: (active: boolean) => <IconTrack active={active} />,
            disabled: !allow('gps_tracking'),
        },
        {
            href: '/parent/fees',
            labelEn: 'Fees',
            labelTa: ta.fees,
            icon: (active: boolean) => <IconFees active={active} />,
            disabled: !allow('fee_management'),
        },
        {
            href: '/parent/requests',
            labelEn: 'Requests',
            labelTa: ta.requests,
            icon: (active: boolean) => <IconRequests active={active} />,
            disabled: false,
        },
        {
            href: '/parent/notifications',
            labelEn: 'Alerts',
            labelTa: ta.alerts,
            icon: (active: boolean) => <IconBell active={active} />,
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
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 safe-area-inset-bottom">
            <div className="flex items-stretch h-16">
                {tabs.map(tab => {
                    const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/');
                    if (tab.disabled) {
                        return (
                            <div key={tab.href} className="flex-1 flex flex-col items-center justify-center gap-0.5 opacity-30 pointer-events-none select-none">
                                {tab.icon(false)}
                                <span className="text-[8px] font-semibold text-slate-400">{biLabel(lang, tab.labelEn, tab.labelTa)}</span>
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
                            <span className={cn('text-[8px] font-semibold leading-none text-center px-0.5', isActive ? 'text-[var(--brand)]' : 'text-slate-500 dark:text-slate-400')}>
                                {lang === 'ta' ? tab.labelTa : tab.labelEn}
                            </span>
                            {lang === 'both' && (
                                <span className={cn('text-[7px] leading-none', isActive ? 'text-[var(--brand)]/70' : 'text-slate-400 dark:text-slate-500')}>
                                    {tab.labelTa}
                                </span>
                            )}
                        </Link>
                    );
                })}
                {/* Theme toggle */}
                <button
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="w-10 flex flex-col items-center justify-center gap-0.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors border-l border-slate-100 dark:border-slate-700"
                >
                    {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
                </button>
                <LangToggle />
            </div>
        </nav>
    );
}

export default function ParentLayout({ children }: { children: React.ReactNode }) {
    const { user, loading, logout } = useAuth();
    const router = useRouter();
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

    return (
        <LanguageProvider>
            <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-900">
                <main className="flex-1 overflow-y-auto pb-20">
                    {children}
                </main>
                <ParentNav />
                <ParentTour />
            </div>
        </LanguageProvider>
    );
}
