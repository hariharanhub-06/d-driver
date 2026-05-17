'use client';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import dynamic from 'next/dynamic';
const MainLayout = dynamic(() => import('@/components/layout/MainLayout'), { ssr: false });

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    useEffect(() => {
        if (!loading && !user) router.push('/login');
        if (!loading && user && user.role !== 'super_admin') router.push('/login');
    }, [user, loading, router]);
    if (loading || !user) return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex justify-center items-center">
            <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin"></div>
        </div>
    );
    return <MainLayout>{children}</MainLayout>;
}
