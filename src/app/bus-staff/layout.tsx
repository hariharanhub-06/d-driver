'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import api from '@/lib/api';

export default function BusStaffLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) router.push('/login');
    }, [user, loading, router]);

    // Apply school brand colour directly from the authenticated user's school.
    // Bus-staff users don't have a school-slug cookie so the branding context
    // falls back to default blue — this bypasses that entirely.
    useEffect(() => {
        if (!user) return;
        api.get('/users/me').then(res => {
            const color = res.data?.school?.primary_color;
            if (color) document.documentElement.style.setProperty('--brand', color);
        }).catch(() => {});
    }, [user]);

    if (loading || !user) return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex justify-center items-center">
            <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="bg-slate-50 dark:bg-slate-900">
            {children}
        </div>
    );
}
