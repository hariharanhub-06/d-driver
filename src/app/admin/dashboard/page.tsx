'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bus, Map as MapIcon, GraduationCap, UserCheck, AlertTriangle, X, TrendingUp, TrendingDown, Loader2, CalendarRange } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import api from '@/lib/api';
import Link from 'next/link';
import OnboardingChecklist from '@/components/admin/OnboardingChecklist';
import { useT } from '@/lib/i18n';

const EMPTY_STATS = { students: 0, buses: 0, drivers: 0, routes: 0 };

type Period = 'current' | 'past' | 'custom';

interface SosAlert {
    id: string;
    status: string;
    triggered_at: string;
    latitude?: number;
    longitude?: number;
    driver?: { user?: { name: string; phone?: string } };
    bus?: { bus_number: string };
}

interface FinancialPoint { date: string; income: number; expense: number; }
interface FinancialSummary { total_income: number; total_expenses: number; net: number; period: string; from: string; to: string; }

interface OverviewStats { feeCollectionRate: number; busUtilization: number; routeCoverage: number; }

const todayStr = () => new Date().toLocaleDateString('en-CA');
const firstOfMonth = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString('en-CA');
};
const firstOfPastMonth = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() - 1, 1).toLocaleDateString('en-CA');
};
const lastOfPastMonth = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 0).toLocaleDateString('en-CA');
};

export default function Dashboard() {
    const t = useT();
    const [stats, setStats] = useState(EMPTY_STATS);
    const [loading, setLoading] = useState(true);
    const [schoolData, setSchoolData] = useState<any>(null);
    const [overview, setOverview] = useState<OverviewStats>({ feeCollectionRate: 0, busUtilization: 0, routeCoverage: 0 });

    // SOS
    const [sosAlerts, setSosAlerts] = useState<SosAlert[]>([]);
    const [sosLoading, setSosLoading] = useState(false);
    const [resolvingId, setResolvingId] = useState<string | null>(null);

    // Financials
    const [period, setPeriod] = useState<Period>('current');
    const [customFrom, setCustomFrom] = useState(firstOfMonth());
    const [customTo, setCustomTo] = useState(todayStr());
    const [chartData, setChartData] = useState<FinancialPoint[]>([]);
    const [summary, setSummary] = useState<FinancialSummary | null>(null);
    const [chartLoading, setChartLoading] = useState(false);
    const [showCustom, setShowCustom] = useState(false);

    const fetchSos = useCallback(async () => {
        setSosLoading(true);
        try {
            const { data } = await api.get('/sos');
            setSosAlerts((Array.isArray(data) ? data : data.alerts || []).filter((a: SosAlert) => a.status === 'active'));
        } catch { setSosAlerts([]); }
        finally { setSosLoading(false); }
    }, []);

    const fetchFinancials = useCallback(async (p: Period, from?: string, to?: string) => {
        setChartLoading(true);
        try {
            const params: Record<string, string> = { period: p };
            if (p === 'custom' && from && to) { params.from = from; params.to = to; }
            const { data } = await api.get('/dashboard/financials', { params });
            setChartData(data.chart || []);
            setSummary(data.summary || null);
        } catch { setChartData([]); setSummary(null); }
        finally { setChartLoading(false); }
    }, []);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [studentsRes, busesRes, driversRes, routesRes, schoolRes, feesRes] = await Promise.allSettled([
                    api.get('/students'), api.get('/buses'), api.get('/drivers'), api.get('/routes'),
                    api.get('/schools/my'), api.get('/finance/fees'),
                ]);
                const buses: any[] = busesRes.status === 'fulfilled' ? (busesRes.value.data || []) : [];
                const routes: any[] = routesRes.status === 'fulfilled' ? (routesRes.value.data || []) : [];
                const drivers: any[] = driversRes.status === 'fulfilled' ? (driversRes.value.data || []) : [];
                const fees: any[] = feesRes.status === 'fulfilled' ? (feesRes.value.data || []) : [];

                setStats({
                    students: studentsRes.status === 'fulfilled' ? (studentsRes.value.data?.length || 0) : 0,
                    buses: buses.length, drivers: drivers.length, routes: routes.length,
                });
                if (schoolRes.status === 'fulfilled') setSchoolData(schoolRes.value.data);

                const totalAmount = fees.reduce((s: number, f: any) => s + (f.total_amount || 0), 0);
                const totalCollected = fees.reduce((s: number, f: any) => s + Math.max(0, (f.total_amount || 0) - (f.due_amount || 0)), 0);
                const feeRate = totalAmount > 0 ? Math.round((totalCollected / totalAmount) * 100) : 0;
                const routesWithBus = routes.filter((r: any) => r.bus_id).length;
                const routeCoverage = routes.length > 0 ? Math.round((routesWithBus / routes.length) * 100) : 0;
                const busUtil = buses.length > 0 ? Math.min(100, Math.round((drivers.length / buses.length) * 100)) : 0;
                setOverview({ feeCollectionRate: feeRate, busUtilization: busUtil, routeCoverage });
            } catch { setStats(EMPTY_STATS); }
            finally { setLoading(false); }
        };
        fetchStats();
        fetchSos();
        fetchFinancials('current');
    }, [fetchSos, fetchFinancials]);

    const resolvesSos = async (id: string) => {
        setResolvingId(id);
        try {
            await api.put(`/sos/${id}/resolve`, { resolved_note: 'Resolved by admin' });
            setSosAlerts(prev => prev.filter(a => a.id !== id));
        } catch { alert('Failed to resolve SOS'); }
        finally { setResolvingId(null); }
    };

    const handlePeriodChange = (p: Period) => {
        setPeriod(p);
        setShowCustom(p === 'custom');
        if (p !== 'custom') fetchFinancials(p);
        if (p === 'custom') {
            setCustomFrom(firstOfPastMonth());
            setCustomTo(lastOfPastMonth());
        }
    };

    const statCards = [
        { label: t('Total Students', 'மொத்த மாணவர்கள்'), value: stats.students, icon: GraduationCap, href: '/admin/students', filled: true },
        { label: t('Active Buses', 'செயல்பாட்டில் பேருந்துகள்'), value: stats.buses, icon: Bus, href: '/admin/buses', filled: false },
        { label: t('Active Drivers', 'செயல்பாட்டில் ஓட்டுநர்கள்'), value: stats.drivers, icon: UserCheck, href: '/admin/drivers', filled: false },
        { label: t('Total Routes', 'மொத்த வழிகள்'), value: stats.routes, icon: MapIcon, href: '/admin/routes', filled: false },
    ];

    const overviewItems = [
        { label: t('Fee Collection Rate', 'கட்டண வசூல் விகிதம்'), value: `${overview.feeCollectionRate}%`, color: 'bg-[var(--brand)]', width: `${overview.feeCollectionRate}%` },
        { label: t('Bus Utilization', 'பேருந்து பயன்பாடு'), value: `${overview.busUtilization}%`, color: 'bg-amber-500', width: `${overview.busUtilization}%` },
        { label: t('Route Coverage', 'வழி பரப்பு'), value: `${overview.routeCoverage}%`, color: 'bg-purple-500', width: `${overview.routeCoverage}%` },
    ];

    return (
        <div className="space-y-6 animate-in">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 data-tour="dashboard" className="text-2xl font-bold text-slate-900 dark:text-white">{t('Dashboard', 'டாஷ்போர்டு')}</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">{t('Live Data', 'நேரடி தரவு')}</span>
                </div>
            </div>

            {/* SOS Alerts */}
            {!sosLoading && sosAlerts.length > 0 && (
                <div className="space-y-2">
                    {sosAlerts.map(alert => (
                        <div key={alert.id} className="bg-red-600 text-white rounded-2xl p-4 flex items-start gap-4 animate-in shadow-lg shadow-red-900/20">
                            <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center shrink-0">
                                <AlertTriangle className="w-5 h-5 animate-pulse" />
                            </div>
                            <div className="flex-1">
                                <p className="font-bold text-sm">SOS EMERGENCY ALERT</p>
                                <p className="text-red-100 text-sm mt-0.5">
                                    {alert.driver?.user?.name || t('Driver', 'ஓட்டுநர்')} · Bus {alert.bus?.bus_number || '—'}
                                    {alert.driver?.user?.phone && <> · {alert.driver.user.phone}</>}
                                </p>
                                <p className="text-red-200 text-xs mt-1">
                                    {new Date(alert.triggered_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                    {alert.latitude && alert.longitude && (
                                        <> · <a href={`https://maps.google.com/?q=${alert.latitude},${alert.longitude}`} target="_blank" rel="noreferrer" className="underline">{t('View Location', 'இடத்தை காண்க')}</a></>
                                    )}
                                </p>
                            </div>
                            <button onClick={() => resolvesSos(alert.id)} disabled={resolvingId === alert.id} className="shrink-0 bg-white text-red-600 font-bold text-xs px-4 py-2 rounded-xl disabled:opacity-70 hover:bg-red-50 transition-all active:scale-95">
                                {resolvingId === alert.id ? <Loader2 className="w-4 h-4 animate-spin" /> : t('Resolve', 'தீர்')}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Onboarding checklist */}
            {schoolData && !schoolData.onboarding_dismissed && (
                <OnboardingChecklist schoolData={schoolData} />
            )}

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((card, idx) => (
                    <Link
                        key={card.label}
                        href={card.href}
                        className={idx === 0
                            ? 'bg-[var(--brand)] text-white rounded-2xl p-6 shadow-lg hover:opacity-95 transition-all'
                            : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all'}
                    >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${idx === 0 ? 'bg-white/20' : 'bg-slate-50 dark:bg-slate-700'}`}>
                            <card.icon className={`w-5 h-5 ${idx === 0 ? 'text-white' : 'text-[var(--brand)]'}`} />
                        </div>
                        <p className={`text-3xl font-bold ${idx === 0 ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                            {loading ? '—' : card.value}
                        </p>
                        <p className={`text-sm mt-1 ${idx === 0 ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>{card.label}</p>
                    </Link>
                ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Income / Expense Chart */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
                    <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
                        <div>
                            <h3 className="text-base font-semibold text-slate-900 dark:text-white">{t('Income vs Expenses', 'வருவாய் vs செலவுகள்')}</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('Fees collected vs fuel + maintenance', 'வசூல் கட்டணம் vs எரிபொருள் + பராமரிப்பு')}</p>
                        </div>
                        <div className="flex gap-1.5">
                            {(['current', 'past'] as Period[]).map(p => (
                                <button key={p} onClick={() => handlePeriodChange(p)} className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${period === p && !showCustom ? 'bg-[var(--brand)] text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>
                                    {p === 'current' ? t('This Month', 'இந்த மாதம்') : t('Last Month', 'கடந்த மாதம்')}
                                </button>
                            ))}
                            <button onClick={() => handlePeriodChange('custom')} className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 ${showCustom ? 'bg-[var(--brand)] text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>
                                <CalendarRange className="w-3 h-3" /> {t('Custom', 'தனிப்பயன்')}
                            </button>
                        </div>
                    </div>

                    {showCustom && (
                        <div className="flex items-center gap-2 mb-4 flex-wrap">
                            <input type="date" value={customFrom} max={customTo} onChange={e => setCustomFrom(e.target.value)} className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[var(--brand)]" />
                            <span className="text-slate-400 text-sm">{t('to', 'வரை')}</span>
                            <input type="date" value={customTo} min={customFrom} max={todayStr()} onChange={e => setCustomTo(e.target.value)} className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[var(--brand)]" />
                            <button onClick={() => fetchFinancials('custom', customFrom, customTo)} className="bg-[var(--brand)] text-white rounded-xl px-4 py-2 text-sm font-semibold">{t('Apply', 'பயன்படுத்து')}</button>
                        </div>
                    )}

                    {/* Summary pills */}
                    {summary && (
                        <div className="flex gap-3 mb-4 flex-wrap">
                            <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl px-3 py-1.5">
                                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">₹{(summary.total_income || 0).toLocaleString('en-IN')} {t('income', 'வருவாய்')}</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-1.5">
                                <TrendingDown className="w-3.5 h-3.5 text-red-600" />
                                <span className="text-xs font-bold text-red-700 dark:text-red-400">₹{(summary.total_expenses || 0).toLocaleString('en-IN')} {t('expenses', 'செலவுகள்')}</span>
                            </div>
                            <div className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 ${(summary.net || 0) >= 0 ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-orange-50 dark:bg-orange-900/20'}`}>
                                <span className={`text-xs font-bold ${(summary.net || 0) >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-orange-700 dark:text-orange-400'}`}>
                                    {t('Net', 'நிகர')} ₹{Math.abs(summary.net || 0).toLocaleString('en-IN')} {(summary.net || 0) >= 0 ? t('profit', 'லாபம்') : t('loss', 'நஷ்டம்')}
                                </span>
                            </div>
                        </div>
                    )}

                    {chartLoading ? (
                        <div className="h-56 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-300" /></div>
                    ) : chartData.length === 0 ? (
                        <div className="h-56 flex flex-col items-center justify-center text-slate-400 gap-2">
                            <p className="text-sm">{t('No financial data for this period', 'இந்த காலகட்டத்தில் நிதி தரவு இல்லை')}</p>
                        </div>
                    ) : (
                        <div className="h-56 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f87171" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={d => { try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); } catch { return d; } }} interval="preserveStartEnd" />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}`} />
                                    <Tooltip formatter={(v: any, name: string) => [`₹${Number(v || 0).toLocaleString('en-IN')}`, name === 'income' ? t('Income', 'வருவாய்') : t('Expenses', 'செலவுகள்')]} labelFormatter={l => { try { return new Date(l).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' }); } catch { return l; } }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', fontSize: '12px' }} />
                                    <Area type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={2} fill="url(#incomeGrad)" dot={false} />
                                    <Area type="monotone" dataKey="expense" stroke="#f87171" strokeWidth={2} fill="url(#expenseGrad)" dot={false} />
                                    <Legend formatter={v => v === 'income' ? t('Income', 'வருவாய்') : t('Expenses', 'செலவுகள்')} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* Quick Overview */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 flex flex-col">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">{t('Quick Overview', 'விரைவு கண்ணோட்டம்')}</h3>
                    {loading ? (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="w-6 h-6 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <div className="space-y-5 flex-1">
                            {overviewItems.map(item => (
                                <div key={item.label}>
                                    <div className="flex justify-between text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                                        <span>{item.label}</span>
                                        <span>{item.value}</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div className={`h-full ${item.color} rounded-full transition-all duration-1000`} style={{ width: item.width }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    <Link href="/admin/reports" className="mt-8 w-full py-3 bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 font-semibold rounded-xl text-center text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-all">
                        {t('View Full Report', 'முழு அறிக்கையை காண்க')} →
                    </Link>
                </div>
            </div>
        </div>
    );
}
