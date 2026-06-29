'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bell, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useSchoolBranding } from '@/context/SchoolBrandingContext';
import { useAuth } from '@/context/AuthContext';
import { useLang } from '@/context/LanguageContext';
import api from '@/lib/api';
import ProfileMenu from './ProfileMenu';
import InstallButton from '@/components/InstallButton';
import { usePlatformLogo } from '@/lib/usePlatformLogo';

const notificationsRouteFor = (role?: string) =>
    role === 'driver' ? '/driver/notifications'
    : role === 'bus_staff' ? '/bus-staff/notifications'
    : '/parent/notifications';

function LangButton() {
    const { lang, setLang } = useLang();
    const options: Array<'en' | 'ta' | 'both'> = ['en', 'ta', 'both'];
    const labels: Record<string, string> = { en: 'EN', ta: 'த', both: 'EN+த' };
    const next = options[(options.indexOf(lang) + 1) % options.length];
    return (
        <button
            onClick={() => setLang(next)}
            className="h-9 px-2.5 flex items-center justify-center rounded-xl text-[11px] font-bold text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title="Switch language"
        >
            {labels[lang]}
        </button>
    );
}

// Slim top app-bar for the bottom-nav roles (driver / bus-staff / parent):
// brand on the left; notifications, theme, language and the profile/logout menu on the
// right — moved up here so the bottom nav can stay clean.
export default function MobileTopBar() {
    const branding = useSchoolBranding();
    const platformLogo = usePlatformLogo();
    const { user } = useAuth();
    const { theme, setTheme } = useTheme();
    const name = branding?.name || 'Onlive';
    const logo = branding?.logo_url;
    const [unread, setUnread] = useState(0);

    useEffect(() => {
        if (!user) return;
        const load = () => api.get('/notifications/unread-count')
            .then(res => setUnread(res.data?.count ?? res.data?.unread_count ?? 0))
            .catch(() => {});
        load();
        // Re-fetch (not zero) so reading a single notification decrements correctly.
        window.addEventListener('notifications-read', load);
        const interval = setInterval(load, 60000);
        return () => { window.removeEventListener('notifications-read', load); clearInterval(interval); };
    }, [user]);

    return (
        <header
            className="shrink-0 h-14 flex items-center justify-between px-3 sm:px-4 border-b"
            style={{ backgroundColor: 'var(--sidebar-bg)', borderColor: 'var(--sidebar-border)' }}
        >
            <div className="flex items-center gap-2 min-w-0">
                {logo ? (
                    <img src={logo} alt={name} className="h-12 w-12 rounded-xl object-cover shrink-0" />
                ) : (
                    <img src={platformLogo} alt="Onlive" className="h-12 w-12 rounded-xl object-contain bg-[#0a0f1e] shrink-0" />
                )}
                <span className="font-bold text-sm text-slate-900 dark:text-white truncate">{name}</span>
            </div>
            <div className="flex items-center gap-0.5">
                <Link
                    href={notificationsRouteFor(user?.role)}
                    className="relative w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    aria-label="Notifications"
                >
                    <Bell size={20} />
                    {unread > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center px-0.5">
                            {unread > 9 ? '9+' : unread}
                        </span>
                    )}
                </Link>
                <button
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    title="Toggle theme"
                >
                    {theme === 'dark' ? <Sun className="w-[18px] h-[18px] text-amber-400" /> : <Moon className="w-[18px] h-[18px]" />}
                </button>
                <LangButton />
                <InstallButton />
                <ProfileMenu />
            </div>
        </header>
    );
}
