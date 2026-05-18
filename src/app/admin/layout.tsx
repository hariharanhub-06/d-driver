'use client';

import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { TourProvider } from '@/components/tour/TourProvider';
import AdminTour from '@/components/tour/AdminTour';
import api from '@/lib/api';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (!user || user.role !== 'admin') return;
        api.get('/schools/my')
            .then(({ data }) => {
                const color = data?.primary_color;
                if (color) document.documentElement.style.setProperty('--brand', color);
            })
            .catch(() => {});
    }, [user]);

    if (loading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <TourProvider>
            <AdminTour />
            <MainLayout>{children}</MainLayout>
        </TourProvider>
    );
}
