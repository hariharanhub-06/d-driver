'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { LanguageProvider, useLang } from '@/context/LanguageContext';
import { ta } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import MobileTopBar from '@/components/layout/MobileTopBar';

const DriverTour = dynamic(() => import('@/components/tour/DriverTour'), { ssr: false });

function DriverNav() {
    const pathname = usePathname();
    const { lang } = useLang();

    const tabs = [
        { href: '/driver/dashboard', labelEn: 'My Trip', labelTa: ta.myTrip, icon: '🚌' },
        { href: '/driver/attendance', labelEn: 'Students', labelTa: ta.students, icon: '📋' },
        { href: '/driver/maintenance', labelEn: 'Maintenance', labelTa: ta.maintenance, icon: '🔧' },
        { href: '/driver/profile', labelEn: 'Profile', labelTa: ta.profile, icon: '👤' },
    ];

    // Hide bottom nav on ride page
    if (pathname === '/driver/ride') return null;

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-stretch h-16">
                {tabs.map(tab => {
                    const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/');
                    return (
                        <Link key={tab.href} href={tab.href} className={cn(
                            'flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors',
                            isActive ? 'text-[var(--brand)]' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                        )}>
                            <span className="text-lg leading-none">{tab.icon}</span>
                            <span className={cn('text-[8px] font-semibold leading-none', isActive ? 'text-[var(--brand)]' : 'text-slate-500 dark:text-slate-400')}>
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
            </div>
        </nav>
    );
}

export default function DriverLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!loading && !user) router.push('/login');
    }, [user, loading, router]);

    if (loading || !user) return (
        <div className="min-h-screen bg-slate-900 flex justify-center items-center">
            <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
        </div>
    );

    const hideNav = pathname === '/driver/ride';

    return (
        <LanguageProvider>
            <div className="flex flex-col h-[100dvh] bg-slate-900">
                {!hideNav && <MobileTopBar />}
                <main className={hideNav ? 'flex-1 min-h-0 overflow-hidden' : 'flex-1 min-h-0 overflow-y-auto pb-20'}>
                    {children}
                </main>
                <DriverNav />
                <DriverTour />
            </div>
        </LanguageProvider>
    );
}
