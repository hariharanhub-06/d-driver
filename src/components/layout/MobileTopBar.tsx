'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bus, Bell } from 'lucide-react';
import { useSchoolBranding } from '@/context/SchoolBrandingContext';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import ProfileMenu from './ProfileMenu';

const notificationsRouteFor = (role?: string) =>
    role === 'driver' ? '/driver/notifications'
    : role === 'bus_staff' ? '/bus-staff/notifications'
    : '/parent/notifications';

// Slim top app-bar for the bottom-nav roles (driver / bus-staff / parent):
// brand on the left, a notifications bell + profile/logout menu on the right.
export default function MobileTopBar() {
    const branding = useSchoolBranding();
    const { user } = useAuth();
    const name = branding?.name || 'Onlive';
    const logo = branding?.logo_url;
    const [unread, setUnread] = useState(0);

    useEffect(() => {
        if (!user) return;
        const load = () => api.get('/notifications/unread-count')
            .then(res => setUnread(res.data?.count ?? res.data?.unread_count ?? 0))
            .catch(() => {});
        load();
        const reset = () => setUnread(0);
        window.addEventListener('notifications-read', reset);
        const interval = setInterval(load, 60000);
        return () => { window.removeEventListener('notifications-read', reset); clearInterval(interval); };
    }, [user]);

    return (
        <header
            className="shrink-0 h-14 flex items-center justify-between px-4 border-b"
            style={{ backgroundColor: 'var(--sidebar-bg)', borderColor: 'var(--sidebar-border)' }}
        >
            <div className="flex items-center gap-2 min-w-0">
                {logo ? (
                    <img src={logo} alt={name} className="h-8 w-8 rounded-lg object-cover shrink-0" />
                ) : (
                    <img src="/icons/onlive-logo.png" alt="Onlive" className="h-8 w-8 rounded-lg object-contain bg-[#0a0f1e] shrink-0" />
                )}
                <span className="font-bold text-sm text-slate-900 dark:text-white truncate">{name}</span>
            </div>
            <div className="flex items-center gap-1">
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
                <ProfileMenu />
            </div>
        </header>
    );
}
