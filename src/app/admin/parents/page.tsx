'use client';

import { useState, useEffect } from 'react';
import { Search, UserCircle, X, Copy, CheckCheck, MessageCircle, ToggleLeft, ToggleRight } from 'lucide-react';
import api from '@/lib/api';

interface Student {
    id: string;
    name: string;
    route?: { name: string };
}

interface Parent {
    id: string;
    name: string;
    email: string;
    phone?: string;
    is_active?: boolean;
    is_first_login?: boolean;
    students?: Student[];
}

interface SchoolData {
    slug?: string;
}

function Avatar({ name }: { name: string }) {
    const colors = [
        'bg-purple-100 text-purple-700',
        'bg-blue-100 text-blue-700',
        'bg-pink-100 text-pink-700',
        'bg-teal-100 text-teal-700',
    ];
    const initials = name
        .split(' ')
        .map(p => p[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    return (
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${colors[name.charCodeAt(0) % colors.length]}`}>
            {initials || <UserCircle className="w-4 h-4" />}
        </div>
    );
}

export default function ParentsPage() {
    const [parents, setParents] = useState<Parent[]>([]);
    const [school, setSchool] = useState<SchoolData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');

    // Share credentials modal
    const [shareParent, setShareParent] = useState<Parent | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [parentsRes, schoolRes] = await Promise.allSettled([
                api.get('/users?role=parent'),
                api.get('/schools/my'),
            ]);
            if (parentsRes.status === 'fulfilled') setParents(parentsRes.value.data || []);
            if (schoolRes.status === 'fulfilled') setSchool(schoolRes.value.data);
            setError('');
        } catch {
            setError('Failed to load parents.');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleActive = async (parent: Parent) => {
        const newState = !parent.is_active;
        try {
            await api.patch(`/users/${parent.id}/active`, { is_active: newState });
            setParents(prev =>
                prev.map(p => p.id === parent.id ? { ...p, is_active: newState } : p)
            );
        } catch {
            alert('Failed to update parent status.');
        }
    };

    const buildShareText = (parent: Parent) => {
        const slug = school?.slug || 'your-school';
        const link = `http://${slug}.ddriver.app/login`;
        const lines = [
            `Hello ${parent.name}, your child's bus portal login:`,
            `Email: ${parent.email}`,
            `Link: ${link}`,
        ];
        if (parent.is_first_login) {
            lines.push('Temp Password: parent123 (please change after first login)');
        }
        return lines.join('\n');
    };

    const handleCopy = (parent: Parent) => {
        navigator.clipboard.writeText(buildShareText(parent));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleWhatsApp = (parent: Parent) => {
        const phone = parent.phone?.replace(/\D/g, '') || '';
        const msg = encodeURIComponent(buildShareText(parent));
        window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
    };

    const filtered = parents.filter(p => {
        const q = search.toLowerCase();
        const studentNames = (p.students || []).map(s => s.name).join(' ').toLowerCase();
        return (
            p.name?.toLowerCase().includes(q) ||
            p.phone?.toLowerCase().includes(q) ||
            p.email?.toLowerCase().includes(q) ||
            studentNames.includes(q)
        );
    });

    return (
        <div className="space-y-6 animate-in">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Parents</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Manage parent accounts and share login credentials.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full px-2.5 py-0.5 text-xs font-medium">
                        {parents.length} parent{parents.length !== 1 ? 's' : ''}
                    </span>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 border border-red-200 rounded-xl p-3 text-sm">{error}</div>
            )}

            {/* Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                    <div className="relative w-full max-w-md">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by name, phone, or student..."
                            className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 pl-10 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Parent</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Phone</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Students</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Route</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-3">
                                        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin"></div></div>
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-3">
                                        <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">
                                            <UserCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                            <p>No parents found.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(parent => {
                                    const isActive = parent.is_active !== false;
                                    const studentNames = (parent.students || []).map(s => s.name).join(', ') || '—';
                                    const routeName = parent.students?.[0]?.route?.name || '—';
                                    return (
                                        <tr key={parent.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                                            {/* Parent */}
                                            <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                                <div className="flex items-center gap-3">
                                                    <Avatar name={parent.name || '?'} />
                                                    <div>
                                                        <p className="font-semibold text-slate-800 dark:text-white">{parent.name}</p>
                                                        <p className="text-xs text-slate-400">{parent.email}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Phone */}
                                            <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                                {parent.phone || '—'}
                                            </td>

                                            {/* Students */}
                                            <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 max-w-[180px]">
                                                <span className="truncate block" title={studentNames}>{studentNames}</span>
                                            </td>

                                            {/* Route */}
                                            <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                                {routeName !== '—' ? (
                                                    <span className="inline-flex items-center bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full px-2.5 py-0.5 text-xs font-medium">
                                                        {routeName}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 text-xs">—</span>
                                                )}
                                            </td>

                                            {/* Status */}
                                            <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                                <button
                                                    onClick={() => handleToggleActive(parent)}
                                                    className="flex items-center gap-1.5 text-xs font-semibold transition-colors"
                                                    title={isActive ? 'Click to deactivate' : 'Click to activate'}
                                                >
                                                    {isActive ? (
                                                        <>
                                                            <ToggleRight className="w-5 h-5 text-emerald-500" />
                                                            <span className="text-emerald-600">Active</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <ToggleLeft className="w-5 h-5 text-slate-400" />
                                                            <span className="text-slate-400">Inactive</span>
                                                        </>
                                                    )}
                                                </button>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => { setShareParent(parent); setCopied(false); }}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-colors"
                                                        title="Share credentials"
                                                    >
                                                        <MessageCircle className="w-3.5 h-3.5" />
                                                        Share
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Share Credentials Modal */}
            {shareParent && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Share Credentials</h2>
                                <p className="text-xs text-slate-400 mt-0.5">{shareParent.name}</p>
                            </div>
                            <button
                                onClick={() => setShareParent(null)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-400 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Message preview */}
                            <div>
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Message Preview</p>
                                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 text-sm text-slate-700 dark:text-slate-300 font-mono whitespace-pre-line leading-relaxed border border-slate-100 dark:border-slate-600">
                                    {buildShareText(shareParent)}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => handleCopy(shareParent)}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl text-sm font-semibold"
                                >
                                    {copied ? (
                                        <><CheckCheck className="w-4 h-4 text-emerald-500" /> Copied!</>
                                    ) : (
                                        <><Copy className="w-4 h-4" /> Copy</>
                                    )}
                                </button>
                                <button
                                    onClick={() => handleWhatsApp(shareParent)}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-semibold transition-colors"
                                >
                                    <MessageCircle className="w-4 h-4" />
                                    WhatsApp
                                </button>
                            </div>

                            {!shareParent.phone && (
                                <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-700/30 rounded-lg px-3 py-2">
                                    No phone number on record — WhatsApp link may not open correctly.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
