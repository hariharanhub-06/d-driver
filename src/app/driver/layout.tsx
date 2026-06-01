'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { ta } from '@/lib/i18n';

const DriverTour = dynamic(() => import('@/components/tour/DriverTour'), { ssr: false });

// ── ALL EXISTING LOGIC PRESERVED ──────────────────────────────────────────
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

    const tabs = [
        { href: '/driver/dashboard', labelEn: 'My Trip', labelTa: ta.myTrip, icon: '🚌' },
        { href: '/driver/attendance', labelEn: 'Students', labelTa: ta.students, icon: '📋' },
        { href: '/driver/profile', labelEn: 'Profile', labelTa: ta.profile, icon: '👤' },
    ];

    return (
        <div className="flex flex-col min-h-screen bg-slate-900">
            {/* Page content */}
            <main className="flex-1 overflow-y-auto pb-20">
                {children}
            </main>

            {/* Bottom tab bar */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-800 border-t border-slate-700">
                <div className="flex items-stretch h-16">
                    {tabs.map(tab => {
                        const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/');
                        return (
                            <Link key={tab.href} href={tab.href} className={cn(
                                'flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors',
                                isActive ? 'text-[var(--brand)]' : 'text-slate-400 hover:text-slate-200'
                            )}>
                                <span className="text-lg leading-none">{tab.icon}</span>
                                <span className={cn('text-[9px] font-semibold leading-none', isActive ? 'text-[var(--brand)]' : 'text-slate-400')}>
                                    {tab.labelEn}
                                </span>
                                <span className={cn('text-[8px] leading-none', isActive ? 'text-[var(--brand)]/70' : 'text-slate-500')}>
                                    {tab.labelTa}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </nav>

            <DriverTour />
        </div>
    );
}
