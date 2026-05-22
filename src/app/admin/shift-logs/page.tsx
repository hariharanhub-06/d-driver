'use client';

import { useState, useEffect } from 'react';
import { Clock, ChevronDown, ChevronRight, Loader2, Calendar, LogIn, Bus, Navigation } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

type KmEntry = {
    id: string;
    entry_type: string;
    km_reading: number;
    recorded_at?: string;
};

type Shift = {
    id: string;
    driver?: { user: { name: string } };
    bus_number?: string;
    date?: string;
    start_time?: string;
    end_time?: string;
    total_km?: number | null;
    status?: string;
    kmEntries?: KmEntry[];
};

type ActivityEvent = {
    id: string;
    type: 'login' | 'trip_start' | 'trip_end';
    actor_name?: string;
    actor_role?: string;
    route_name?: string;
    bus_number?: string;
    driver_name?: string;
    timestamp: string;
};

const statusBadge = (s?: string) => {
    if (s === 'completed') return 'inline-flex items-center bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full px-2.5 py-0.5 text-xs font-medium';
    if (s === 'active') return 'inline-flex items-center bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full px-2.5 py-0.5 text-xs font-medium';
    return 'inline-flex items-center bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full px-2.5 py-0.5 text-xs font-medium';
};

const fmtDatetime = (s?: string) => {
    if (!s) return '—';
    try {
        return new Date(s).toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true,
        });
    } catch { return '—'; }
};

const fmtTime = (s?: string) => {
    if (!s) return '—';
    try {
        return new Date(s).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch { return '—'; }
};

export default function ShiftLogsPage() {
    const [tab, setTab] = useState<'shifts' | 'activity'>('shifts');

    // Shifts state
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [shiftsLoading, setShiftsLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Activity state
    const [activity, setActivity] = useState<ActivityEvent[]>([]);
    const [activityLoading, setActivityLoading] = useState(true);

    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    useEffect(() => {
        fetchShifts();
        fetchActivity();
    }, []);

    const fetchShifts = async () => {
        setShiftsLoading(true);
        try {
            const params: any = {};
            if (dateFrom) params.from = dateFrom;
            if (dateTo) params.to = dateTo;
            const { data } = await api.get('/shifts', { params });
            setShifts(Array.isArray(data) ? data : (Array.isArray(data?.shifts) ? data.shifts : []));
        } catch {
            setShifts([]);
        } finally {
            setShiftsLoading(false);
        }
    };

    const fetchActivity = async () => {
        setActivityLoading(true);
        try {
            const params: any = { limit: 100 };
            if (dateFrom) params.date_from = dateFrom;
            if (dateTo) params.date_to = dateTo;

            const [loginsRes, tripsRes] = await Promise.allSettled([
                api.get('/audit/login-activity', { params: { ...params, role: undefined } }),
                api.get('/trips/history', { params }),
            ]);

            const events: ActivityEvent[] = [];

            // Login events
            if (loginsRes.status === 'fulfilled') {
                const logs = loginsRes.value.data?.logs || [];
                for (const l of logs) {
                    if (l.actor_role === 'driver' || l.actor_role === 'bus_staff') {
                        events.push({
                            id: l.id,
                            type: 'login',
                            actor_name: l.actor_name,
                            actor_role: l.actor_role,
                            timestamp: l.created_at,
                        });
                    }
                }
            }

            // Trip events
            if (tripsRes.status === 'fulfilled') {
                const trips = Array.isArray(tripsRes.value.data) ? tripsRes.value.data : [];
                for (const t of trips) {
                    if (t.started_at) {
                        events.push({
                            id: `${t.id}-start`,
                            type: 'trip_start',
                            route_name: t.route?.name,
                            bus_number: t.bus?.bus_number,
                            driver_name: t.driver?.user?.name,
                            timestamp: t.started_at,
                        });
                    }
                    if (t.completed_at) {
                        events.push({
                            id: `${t.id}-end`,
                            type: 'trip_end',
                            route_name: t.route?.name,
                            bus_number: t.bus?.bus_number,
                            driver_name: t.driver?.user?.name,
                            timestamp: t.completed_at,
                        });
                    }
                }
            }

            events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setActivity(events);
        } catch {
            setActivity([]);
        } finally {
            setActivityLoading(false);
        }
    };

    const handleFilter = () => {
        fetchShifts();
        fetchActivity();
    };

    const toggleExpand = (id: string) => {
        setExpandedId(prev => prev === id ? null : id);
    };

    const eventIcon = (type: ActivityEvent['type']) => {
        if (type === 'login') return <LogIn className="w-4 h-4 text-blue-500" />;
        if (type === 'trip_start') return <Navigation className="w-4 h-4 text-emerald-500" />;
        return <Bus className="w-4 h-4 text-amber-500" />;
    };

    const eventLabel = (ev: ActivityEvent) => {
        if (ev.type === 'login') {
            const role = ev.actor_role === 'bus_staff' ? 'Bus Staff' : 'Driver';
            return <><span className="font-semibold text-slate-800 dark:text-white">{ev.actor_name}</span> <span className="text-slate-500 dark:text-slate-400">({role}) logged in</span></>;
        }
        if (ev.type === 'trip_start') {
            return <><span className="font-semibold text-slate-800 dark:text-white">{ev.driver_name || 'Driver'}</span> <span className="text-slate-500 dark:text-slate-400">started trip on route</span> <span className="font-semibold text-slate-800 dark:text-white">{ev.route_name}</span>{ev.bus_number && <span className="text-slate-400"> · Bus {ev.bus_number}</span>}</>;
        }
        return <><span className="font-semibold text-slate-800 dark:text-white">{ev.driver_name || 'Driver'}</span> <span className="text-slate-500 dark:text-slate-400">completed trip on route</span> <span className="font-semibold text-slate-800 dark:text-white">{ev.route_name}</span>{ev.bus_number && <span className="text-slate-400"> · Bus {ev.bus_number}</span>}</>;
    };

    const eventBg = (type: ActivityEvent['type']) => {
        if (type === 'login') return 'bg-blue-50 dark:bg-blue-900/20';
        if (type === 'trip_start') return 'bg-emerald-50 dark:bg-emerald-900/20';
        return 'bg-amber-50 dark:bg-amber-900/20';
    };

    return (
        <div className="space-y-6 animate-in">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Shift Logs</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Driver shift history, KM readings, and login/trip activity.</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <input
                            type="date"
                            className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[var(--brand)] transition-colors"
                            value={dateFrom}
                            onChange={e => setDateFrom(e.target.value)}
                        />
                        <span className="text-slate-400 text-sm">–</span>
                        <input
                            type="date"
                            className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[var(--brand)] transition-colors"
                            value={dateTo}
                            onChange={e => setDateTo(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={handleFilter}
                        className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95"
                    >
                        Filter
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-2xl p-1 w-fit">
                {(['shifts', 'activity'] as const).map(t => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={cn(
                            'px-5 py-2 rounded-xl text-sm font-semibold capitalize transition-all',
                            tab === t
                                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        )}
                    >
                        {t === 'shifts' ? 'Shift KM Logs' : 'Login & Trip Activity'}
                    </button>
                ))}
            </div>

            {/* ── Shifts Tab ── */}
            {tab === 'shifts' && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-10"></th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Driver</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Bus</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Start</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">End</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total KM</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {shiftsLoading ? (
                                    <tr><td colSpan={8} className="px-4 py-3">
                                        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin"></div></div>
                                    </td></tr>
                                ) : shifts.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-3">
                                            <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">
                                                <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                                <p>No shift logs found</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : shifts.map(shift => (
                                    <>
                                        <tr
                                            key={shift.id}
                                            onClick={() => toggleExpand(shift.id)}
                                            className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer"
                                        >
                                            <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                                {expandedId === shift.id
                                                    ? <ChevronDown className="w-4 h-4 text-slate-400" />
                                                    : <ChevronRight className="w-4 h-4 text-slate-400" />}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 font-medium">{shift.driver?.user?.name || '—'}</td>
                                            <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{shift.bus_number || '—'}</td>
                                            <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                                {shift.date ? new Date(shift.date).toLocaleDateString('en-IN') : '—'}
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs text-emerald-600 dark:text-emerald-400 font-semibold">{fmtTime(shift.start_time)}</td>
                                            <td className="px-4 py-3 font-mono text-xs text-amber-600 dark:text-amber-400 font-semibold">{fmtTime(shift.end_time)}</td>
                                            <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 font-bold">{shift.total_km != null ? `${Number(shift.total_km).toFixed(1)} km` : '—'}</td>
                                            <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                                <span className={`${statusBadge(shift.status)} capitalize`}>
                                                    {shift.status || 'unknown'}
                                                </span>
                                            </td>
                                        </tr>

                                        {expandedId === shift.id && (
                                            <tr key={`${shift.id}-expanded`} className="bg-slate-50 dark:bg-slate-700/30">
                                                <td colSpan={8} className="px-6 py-4">
                                                    {!shift.kmEntries || shift.kmEntries.length === 0 ? (
                                                        <p className="text-xs text-slate-400 italic">No KM entries recorded for this shift.</p>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">KM Entries</p>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                                                {shift.kmEntries.map(entry => (
                                                                    <div key={entry.id} className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-xl px-4 py-2.5 border border-slate-100 dark:border-slate-700">
                                                                        <div className="w-2 h-2 rounded-full bg-[var(--brand)] shrink-0" />
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 capitalize">{entry.entry_type?.replace(/_/g, ' ')}</p>
                                                                            <p className="text-xs text-slate-400">{entry.recorded_at ? new Date(entry.recorded_at).toLocaleString('en-IN') : '—'}</p>
                                                                        </div>
                                                                        <span className="font-mono font-bold text-sm text-slate-800 dark:text-white">{entry.km_reading} km</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── Activity Tab ── */}
            {tab === 'activity' && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                    {activityLoading ? (
                        <div className="flex justify-center py-16">
                            <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : activity.length === 0 ? (
                        <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">
                            <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p>No activity found</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                            {activity.map(ev => (
                                <div key={ev.id} className="flex items-start gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5', eventBg(ev.type))}>
                                        {eventIcon(ev.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-slate-700 dark:text-slate-200 leading-snug">{eventLabel(ev)}</p>
                                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{fmtDatetime(ev.timestamp)}</p>
                                    </div>
                                    <span className={cn(
                                        'text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 mt-1 uppercase tracking-wide',
                                        ev.type === 'login' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                        : ev.type === 'trip_start' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                        : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                    )}>
                                        {ev.type === 'login' ? 'Login' : ev.type === 'trip_start' ? 'Trip Start' : 'Trip End'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
