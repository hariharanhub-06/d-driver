'use client';

import { useState, useEffect } from 'react';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

const TABS = [
    { label: 'Overview',      path: '' },
    { label: 'Permissions',   path: '/permissions' },
    { label: 'Students',      path: '/students' },
    { label: 'Live Tracking', path: '/tracking' },
    { label: 'Revenue',       path: '/revenue' },
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
            <div className="flex items-center gap-2 text-sm text-slate-400">
                <Link href="/super-admin/schools" className="hover:text-white transition-colors">
                    Schools
                </Link>
                <span className="text-white/20">/</span>
                <span className="text-white font-semibold">{school?.name || '...'}</span>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-[#161b22] rounded-xl p-1 w-fit border border-[#30363d]">
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
                                    ? 'bg-blue-600 text-white'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            {tab.label}
                        </Link>
                    );
                })}
            </div>

            {children}
        </div>
    );
}
