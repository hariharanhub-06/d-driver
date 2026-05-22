'use client';

import { useState, useEffect } from 'react';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

const TABS = [
    { label: 'Overview',      path: '' },
    { label: 'Permissions',   path: '/permissions' },
    { label: 'Buses',         path: '/buses' },
    { label: 'Routes',        path: '/routes' },
    { label: 'Drivers',       path: '/drivers' },
    { label: 'Bus Staff',     path: '/staff' },
    { label: 'Students',      path: '/students' },
    { label: 'Fees',          path: '/fees' },
    { label: 'Attendance',    path: '/attendance' },
    { label: 'Live Tracking', path: '/tracking' },
    { label: 'Revenue',       path: '/revenue' },
    { label: 'Activity',      path: '/activity' },
];

export default function SchoolDrillLayout({ children }: { children: React.ReactNode }) {
    const { id } = useParams<{ id: string }>();
    const pathname = usePathname();
    const [school, setSchool] = useState<{ name: string } | null>(null);

    useEffect(() => {
        api.get(`/schools/${id}`).then(r => setSchool(r.data)).catch(() => {});
    }, [id]);

    return (
        <div className="space-y-5">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <Link href="/super-admin/schools" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                    Schools
                </Link>
                <span className="text-slate-300 dark:text-slate-600">/</span>
                <span className="text-slate-900 dark:text-white font-semibold">{school?.name || '...'}</span>
            </div>

            {/* Tabs */}
            <div className="overflow-x-auto pb-0.5 -mb-0.5">
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-700/50 rounded-xl p-1 w-max min-w-full border border-slate-200 dark:border-slate-600">
                {TABS.map(tab => {
                    const href = `/super-admin/schools/${id}${tab.path}`;
                    const isActive = tab.path === ''
                        ? pathname === `/super-admin/schools/${id}`
                        : pathname.startsWith(href);
                    return (
                        <Link
                            key={tab.label}
                            href={href}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                                isActive
                                    ? 'bg-[var(--brand)] text-white'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700'
                            }`}
                        >
                            {tab.label}
                        </Link>
                    );
                })}
            </div>
            </div>

            {children}
        </div>
    );
}
