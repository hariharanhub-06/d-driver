'use client';

import MainLayout from '@/components/layout/MainLayout';

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <MainLayout>
            <div className="dark">
                {children}
            </div>
        </MainLayout>
    );
}
