'use client';

import { useState, useEffect } from 'react';
import { Home, Map, IndianRupee, User, Bell, CalendarDays } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useSchoolBranding } from '@/context/SchoolBrandingContext';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import AccountSwitcher from '@/components/AccountSwitcher';

const tabs = [
    { label: 'Home', icon: Home, path: '/parent/dashboard', tourId: 'parent-dashboard' },
    { label: 'Track', icon: Map, path: '/parent/tracking', tourId: 'parent-track' },
    { label: 'Attendance', icon: CalendarDays, path: '/parent/attendance', tourId: 'parent-attendance' },
    { label: 'Fees', icon: IndianRupee, path: '/parent/fees', tourId: 'parent-fees' },
    { label: 'Profile', icon: User, path: '/parent/profile' },
];

export default function ParentLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const branding = useSchoolBranding();
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!loading && !user) router.push('/login');
    }, [user, loading, router]);

    useEffect(() => {
        if (!user) return;
        api.get('/notifications/unread-count')
            .then(res => setUnreadCount(res.data?.count ?? res.data?.unread_count ?? 0))
            .catch(() => {});
    }, [user]);

    // Apply school brand color so --brand CSS var reflects the school's primary_color
    useEffect(() => {
        if (!user) return;
        api.get('/schools/my')
            .then(({ data }) => {
                if (data?.primary_color) document.documentElement.style.setProperty('--brand', data.primary_color);
            })
            .catch(() => {});
    }, [user]);

    if (loading || !user) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex justify-center items-center">
                <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-900">
            {/* Header */}
            <header className="bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 px-4 h-14 flex items-center justify-between sticky top-0 z-40">
                <div className="flex items-center gap-3">
                    {branding.logo_url ? (
                        <img src={branding.logo_url} alt={branding.name} className="h-8 w-8 object-contain rounded-lg" />
                    ) : (
                        <div className="w-8 h-8 rounded-lg bg-[var(--brand)] flex items-center justify-center">
                            <span className="text-white font-black text-sm">{branding.name.charAt(0)}</span>
                        </div>
                    )}
                    <span className="font-black text-slate-900 dark:text-white text-sm">{branding.name}</span>
                </div>
                <button
                    onClick={() => router.push('/parent/notifications')}
                    className="relative w-10 h-10 flex items-center justify-center bg-slate-50 dark:bg-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-600 transition-all"
                >
                    <Bell className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </button>
            </header>

            {/* Main content */}
            <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 pb-20">
                {children}
            </main>

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 z-40 safe-area-bottom">
                <div className="flex justify-around items-center px-2 py-1">
                    {tabs.map(tab => {
                        const isActive = pathname === tab.path || pathname.startsWith(tab.path + '/');
                        return (
                            <Link
                                key={tab.path}
                                href={tab.path}
                                data-tour={(tab as any).tourId}
                                className={cn(
                                    'flex flex-col items-center gap-1 py-2 px-3 text-xs font-medium transition-colors',
                                    isActive
                                        ? 'text-[var(--brand)]'
                                        : 'text-slate-400 dark:text-slate-500'
                                )}
                            >
                                <tab.icon className={cn('w-5 h-5', isActive && 'scale-110 transition-transform')} />
                                <span className={cn('text-[10px] font-bold', isActive ? 'font-black' : '')}>{tab.label}</span>
                            </Link>
                        );
                    })}
                    <div className="flex flex-col items-center gap-1 py-2 px-3">
                        <AccountSwitcher />
                    </div>
                </div>
            </nav>
        </div>
    );
}
