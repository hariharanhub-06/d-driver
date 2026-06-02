'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { ta } from '@/lib/i18n';

const DriverTour = dynamic(() => import('@/components/tour/DriverTour'), { ssr: false });

// ── ALL EXISTING LOGIC PRESERVED ──────────────────────────────────────────
export default function DriverLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const { theme, setTheme } = useTheme();

    useEffect(() => {
        if (!loading && !user) router.push('/login');
    }, [user, loading, router]);

    if (loading || !user) return (
        <div className="min-h-screen bg-slate-900 flex justify-center items-center">
            <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
        </div>
    );

    const tabs = [
        { href: '/driver/dashboard', labelEn: 'My Trip', labelTa: ta.myTrip, icon: '🚌' },
        { href: '/driver/attendance', labelEn: 'Students', labelTa: ta.students, icon: '📋' },
        { href: '/driver/profile', labelEn: 'Profile', labelTa: ta.profile, icon: '👤' },
    ];

    // Hide bottom nav on ride page — it's a focused mode with its own controls
    const hideNav = pathname === '/driver/ride';

    return (
        <div className="flex flex-col min-h-screen bg-slate-900">
            {/* Page content — no bottom padding on ride page (has its own fixed controls) */}
            <main className={hideNav ? 'flex-1 overflow-hidden' : 'flex-1 overflow-y-auto pb-20'}>
                {children}
            </main>

            {/* Bottom tab bar — hidden on ride page */}
            {!hideNav && (
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
                                <span className={cn('text-[9px] font-semibold leading-none', isActive ? 'text-[var(--brand)]' : 'text-slate-500 dark:text-slate-400')}>
                                    {tab.labelEn}
                                </span>
                                <span className={cn('text-[8px] leading-none', isActive ? 'text-[var(--brand)]/70' : 'text-slate-400 dark:text-slate-500')}>
                                    {tab.labelTa}
                                </span>
                            </Link>
                        );
                    })}
                    {/* Theme toggle */}
                    <button
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        className="w-12 flex flex-col items-center justify-center gap-0.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors border-l border-slate-200 dark:border-slate-700"
                        title="Toggle theme"
                    >
                        {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
                        <span className="text-[8px] leading-none text-slate-400">{theme === 'dark' ? 'Light' : 'Dark'}</span>
                    </button>
                </div>
            </nav>
            )}

            <DriverTour />
        </div>
    );
}
