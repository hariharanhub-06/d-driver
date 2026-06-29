'use client';

import { useState, useEffect } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
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
    const router = useRouter();
    const [school, setSchool] = useState<{ name: string } | null>(null);

    useEffect(() => {
        api.get(`/schools/${id}`).then(r => setSchool(r.data)).catch(() => {});
    }, [id]);

    const base = `/super-admin/schools/${id}`;
    const isActive = (path: string) =>
        path === '' ? pathname === base : pathname.startsWith(`${base}${path}`);
    const activePath = TABS.find(t => isActive(t.path))?.path ?? '';

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

            {/* Mobile: dropdown picker (no horizontal scrolling) */}
            <div className="lg:hidden">
                <select
                    value={activePath}
                    onChange={(e) => router.push(`${base}${e.target.value}`)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-[var(--brand)]"
                >
                    {TABS.map(tab => (
                        <option key={tab.label} value={tab.path}>{tab.label}</option>
                    ))}
                </select>
            </div>

            <div className="flex flex-col lg:flex-row gap-5">
                {/* Desktop: vertical sidebar */}
                <nav className="hidden lg:flex lg:flex-col gap-1 w-52 shrink-0 bg-slate-100 dark:bg-slate-700/50 rounded-xl p-2 border border-slate-200 dark:border-slate-600 h-max sticky top-4">
                    {TABS.map(tab => {
                        const active = isActive(tab.path);
                        return (
                            <Link
                                key={tab.label}
                                href={`${base}${tab.path}`}
                                className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                                    active
                                        ? 'bg-[var(--brand)] text-white'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700'
                                }`}
                            >
                                {tab.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    {children}
                </div>
            </div>
        </div>
    );
}
