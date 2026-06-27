'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Users, Bus, TrendingUp, AlertCircle, Activity, ShieldCheck, X, Search, ChevronRight } from 'lucide-react';
import api from '@/lib/api';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n';

// Which per-school page a dashboard card drills into via the school picker.
type PickerTarget = 'overview' | 'students' | 'buses';

interface School {
    id: string;
    name: string;
    status: string;
    subscription_plan?: string;
    _count?: { buses: number; students: number; drivers: number };
    buses?: any[];
    students?: any[];
}

interface Invoice {
    id: string;
    school?: { name: string };
    total_amount: number;
    status: string;
    billing_month: string;
}

interface RevenueData {
    total_collected?: number;
    total_overdue?: number;
}

export default function SuperAdminDashboard() {
    const t = useT();
    const router = useRouter();
    const [schools, setSchools] = useState<School[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [revenue, setRevenue] = useState<RevenueData>({});
    const [loading, setLoading] = useState(true);
    const [picker, setPicker] = useState<PickerTarget | null>(null);
    const [pickerSearch, setPickerSearch] = useState('');

    // Destination for a chosen school, based on which card opened the picker.
    const destFor = (target: PickerTarget, schoolId: string) =>
        target === 'students' ? `/super-admin/schools/${schoolId}/students`
        : target === 'buses' ? `/super-admin/schools/${schoolId}/buses`
        : `/super-admin/schools/${schoolId}`;

    const pickerTitle = (target: PickerTarget) =>
        target === 'students' ? t('Select a school to view students', 'மாணவர்களைக் காண பள்ளியைத் தேர்ந்தெடுக்கவும்')
        : target === 'buses' ? t('Select a school to view buses', 'பேருந்துகளைக் காண பள்ளியைத் தேர்ந்தெடுக்கவும்')
        : t('Select a school to open', 'திறக்க பள்ளியைத் தேர்ந்தெடுக்கவும்');

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            try {
                const [schoolsRes, invoicesRes, revenueRes] = await Promise.allSettled([
                    api.get('/schools'),
                    api.get('/billing/invoices'),
                    api.get('/billing/revenue'),
                ]);
                if (schoolsRes.status === 'fulfilled') setSchools(Array.isArray(schoolsRes.value.data) ? schoolsRes.value.data : []);
                if (invoicesRes.status === 'fulfilled') {
                    const inv = invoicesRes.value.data;
                    setInvoices((Array.isArray(inv) ? inv : []).slice(0, 5));
                }
                if (revenueRes.status === 'fulfilled') setRevenue(revenueRes.value.data || {});
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);

    const totalStudents = schools.reduce((sum, s) => sum + (s._count?.students || s.students?.length || 0), 0);
    const totalBuses    = schools.reduce((sum, s) => sum + (s._count?.buses    || s.buses?.length    || 0), 0);

    const statCards = [
        { label: t('Total Schools', 'மொத்த பள்ளிகள்'), value: schools.length, icon: Building2, iconColor: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30', picker: 'overview' as PickerTarget },
        { label: t('Total Students', 'மொத்த மாணவர்கள்'), value: totalStudents.toLocaleString('en-IN'), icon: Users, iconColor: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30', picker: 'students' as PickerTarget },
        { label: t('Total Buses', 'மொத்த பேருந்துகள்'), value: totalBuses, icon: Bus, iconColor: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30', picker: 'buses' as PickerTarget },
        { label: t('Monthly Revenue', 'மாதாந்திர வருவாய்'), value: revenue.total_collected ? `₹${(revenue.total_collected / 1000).toFixed(0)}K` : '—', icon: TrendingUp, iconColor: 'text-[var(--brand)]', bg: 'bg-[var(--brand)]/10', href: '/super-admin/revenue' },
        { label: t('Total Overdue', 'மொத்த நிலுவை'), value: revenue.total_overdue ? `₹${(revenue.total_overdue / 1000).toFixed(0)}K` : '—', icon: AlertCircle, iconColor: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/30', href: '/super-admin/billing' },
    ];

    const getInvoiceStatusStyle = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'paid': return 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full px-2.5 py-0.5 text-xs font-medium';
            case 'overdue': return 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full px-2.5 py-0.5 text-xs font-medium';
            default: return 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full px-2.5 py-0.5 text-xs font-medium';
        }
    };

    return (
        <div className="space-y-6 animate-in">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <ShieldCheck className="w-7 h-7 text-[var(--brand)]" />
                        {t('Platform Dashboard', 'தளக் கட்டுப்பாட்டகம்')}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
                    <span className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider">{t('LIVE DATA', 'நேரடி தரவு')}</span>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {statCards.map(card => {
                    const cardClasses = 'text-left w-full bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 hover:shadow-md hover:border-[var(--brand)]/40 transition-all active:scale-[0.98]';
                    const inner = (
                        <>
                            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-4', card.bg)}>
                                <card.icon className={cn('w-5 h-5', card.iconColor)} />
                            </div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {loading ? <span className="text-slate-300 dark:text-slate-600">—</span> : card.value}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mt-1">{card.label}</p>
                        </>
                    );
                    return card.picker ? (
                        <button key={card.label} onClick={() => { setPickerSearch(''); setPicker(card.picker!); }} className={cardClasses}>
                            {inner}
                        </button>
                    ) : (
                        <Link key={card.label} href={card.href!} className={cardClasses}>
                            {inner}
                        </Link>
                    );
                })}
            </div>

            {/* Bottom grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Schools list */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                        <h3 className="font-semibold text-slate-900 dark:text-white text-sm">{t('Schools', 'பள்ளிகள்')}</h3>
                        <Link href="/super-admin/schools" className="text-[var(--brand)] text-xs font-semibold hover:opacity-80">{t('View all', 'அனைத்தையும் காண்க')} →</Link>
                    </div>
                    {loading ? (
                        <div className="flex justify-center py-16">
                            <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : schools.length === 0 ? (
                        <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">{t('No data', 'தரவு இல்லை')}</div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                            {schools.slice(0, 6).map(school => (
                                <Link key={school.id} href={`/super-admin/schools/${school.id}`} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                    <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                                        <Building2 className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-slate-900 dark:text-white font-semibold text-sm truncate">{school.name}</p>
                                        <p className="text-slate-500 dark:text-slate-400 text-xs">{school.subscription_plan || 'Basic'}</p>
                                    </div>
                                    <span className={cn(
                                        'rounded-full px-2.5 py-0.5 text-xs font-medium',
                                        school.status === 'Active'
                                            ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                            : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                    )}>
                                        {school.status === 'Active' ? t('Active', 'செயல்பாட்டில்') : school.status === 'Suspended' ? t('Suspended', 'இடைநிறுத்தப்பட்டது') : school.status}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Invoices */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                        <h3 className="font-semibold text-slate-900 dark:text-white text-sm">{t('Recent Invoices', 'சமீபத்திய விலைப்பட்டியல்கள்')}</h3>
                        <Link href="/super-admin/billing" className="text-[var(--brand)] text-xs font-semibold hover:opacity-80">{t('View all', 'அனைத்தையும் காண்க')} →</Link>
                    </div>
                    {loading ? (
                        <div className="flex justify-center py-16">
                            <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : invoices.length === 0 ? (
                        <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">{t('No invoices yet', 'விலைப்பட்டியல்கள் இல்லை')}</div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                            {invoices.map(inv => (
                                <div key={inv.id} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-slate-900 dark:text-white font-semibold text-sm truncate">{inv.school?.name || 'Unknown School'}</p>
                                        <p className="text-slate-500 dark:text-slate-400 text-xs">{inv.billing_month}</p>
                                    </div>
                                    <p className="text-slate-900 dark:text-white font-bold text-sm shrink-0">
                                        ₹{(inv.total_amount || 0).toLocaleString('en-IN')}
                                    </p>
                                    <span className={cn('shrink-0', getInvoiceStatusStyle(inv.status))}>
                                        {inv.status || 'pending'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* School picker — opened by the Schools / Students / Buses cards */}
            {picker && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setPicker(null)} />
                    <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
                            <h3 className="font-bold text-slate-900 dark:text-white text-sm">{pickerTitle(picker)}</h3>
                            <button onClick={() => setPicker(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700">
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input autoFocus value={pickerSearch} onChange={e => setPickerSearch(e.target.value)} placeholder={t('Search schools…', 'பள்ளிகளைத் தேடு…')} className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)]" />
                            </div>
                        </div>
                        <div className="overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-700/50">
                            {schools.filter(s => s.name.toLowerCase().includes(pickerSearch.toLowerCase())).length === 0 ? (
                                <div className="text-center py-12 text-slate-400 text-sm">{t('No schools found', 'பள்ளிகள் இல்லை')}</div>
                            ) : schools.filter(s => s.name.toLowerCase().includes(pickerSearch.toLowerCase())).map(school => (
                                <button key={school.id} onClick={() => router.push(destFor(picker, school.id))} className="w-full text-left px-5 py-3.5 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                                    <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                                        <Building2 className="w-4 h-4 text-slate-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{school.name}</p>
                                        <p className="text-xs text-slate-400">{school._count?.students ?? school.students?.length ?? 0} {t('students', 'மாணவர்கள்')} · {school._count?.buses ?? school.buses?.length ?? 0} {t('buses', 'பேருந்துகள்')}</p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-500 shrink-0" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
