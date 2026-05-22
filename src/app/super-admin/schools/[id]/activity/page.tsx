'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { LogIn, Navigation, Bus, Calendar, Clock } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

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

const fmtDatetime = (s: string) => {
    try {
        return new Date(s).toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true,
        });
    } catch { return '—'; }
};

export default function SchoolActivityPage() {
    const { id: schoolId } = useParams<{ id: string }>();
    const [activity, setActivity] = useState<ActivityEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    useEffect(() => { fetchActivity(); }, [schoolId]);

    const fetchActivity = async () => {
        setLoading(true);
        try {
            const params: any = { school_id: schoolId, limit: 150 };
            if (dateFrom) params.date_from = dateFrom;
            if (dateTo) params.date_to = dateTo;

            const [loginsRes, tripsRes] = await Promise.allSettled([
                api.get('/audit/login-activity', { params }),
                api.get('/trips/history', { params: { ...params, school_id: undefined, from: dateFrom, to: dateTo } }),
            ]);

            const events: ActivityEvent[] = [];

            if (loginsRes.status === 'fulfilled') {
                for (const l of (loginsRes.value.data?.logs || [])) {
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

            if (tripsRes.status === 'fulfilled') {
                for (const t of (Array.isArray(tripsRes.value.data) ? tripsRes.value.data : [])) {
                    if (t.school_id !== schoolId) continue;
                    if (t.started_at) events.push({ id: `${t.id}-start`, type: 'trip_start', route_name: t.route?.name, bus_number: t.bus?.bus_number, driver_name: t.driver?.user?.name, timestamp: t.started_at });
                    if (t.completed_at) events.push({ id: `${t.id}-end`, type: 'trip_end', route_name: t.route?.name, bus_number: t.bus?.bus_number, driver_name: t.driver?.user?.name, timestamp: t.completed_at });
                }
            }

            events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setActivity(events);
        } catch {
            setActivity([]);
        } finally {
            setLoading(false);
        }
    };

    const icon = (type: ActivityEvent['type']) => {
        if (type === 'login') return <LogIn className="w-4 h-4 text-blue-500" />;
        if (type === 'trip_start') return <Navigation className="w-4 h-4 text-emerald-500" />;
        return <Bus className="w-4 h-4 text-amber-500" />;
    };

    const bg = (type: ActivityEvent['type']) =>
        type === 'login' ? 'bg-blue-50 dark:bg-blue-900/20'
        : type === 'trip_start' ? 'bg-emerald-50 dark:bg-emerald-900/20'
        : 'bg-amber-50 dark:bg-amber-900/20';

    const badge = (type: ActivityEvent['type']) =>
        type === 'login'
            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
            : type === 'trip_start'
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';

    const label = (ev: ActivityEvent) => {
        if (ev.type === 'login') {
            const role = ev.actor_role === 'bus_staff' ? 'Bus Staff' : 'Driver';
            return <><span className="font-semibold">{ev.actor_name}</span> <span className="text-slate-500 dark:text-slate-400">({role}) logged in</span></>;
        }
        if (ev.type === 'trip_start') {
            return <><span className="font-semibold">{ev.driver_name || 'Driver'}</span> <span className="text-slate-500 dark:text-slate-400">started trip on</span> <span className="font-semibold">{ev.route_name}</span>{ev.bus_number && <span className="text-slate-400"> · Bus {ev.bus_number}</span>}</>;
        }
        return <><span className="font-semibold">{ev.driver_name || 'Driver'}</span> <span className="text-slate-500 dark:text-slate-400">completed trip on</span> <span className="font-semibold">{ev.route_name}</span>{ev.bus_number && <span className="text-slate-400"> · Bus {ev.bus_number}</span>}</>;
    };

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Login & Trip Activity</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Driver and bus staff logins · trip start and end events</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                    <input type="date" className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[var(--brand)] transition-colors" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                    <span className="text-slate-400 text-sm">–</span>
                    <input type="date" className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[var(--brand)] transition-colors" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                    <button onClick={fetchActivity} className="bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2 font-semibold text-sm transition-all active:scale-95">Filter</button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                {loading ? (
                    <div className="flex justify-center py-16">
                        <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : activity.length === 0 ? (
                    <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">
                        <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p>No activity found for this school</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {activity.map(ev => (
                            <div key={ev.id} className="flex items-start gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5', bg(ev.type))}>
                                    {icon(ev.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-slate-700 dark:text-slate-200 leading-snug">{label(ev)}</p>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{fmtDatetime(ev.timestamp)}</p>
                                </div>
                                <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 mt-1 uppercase tracking-wide', badge(ev.type))}>
                                    {ev.type === 'login' ? 'Login' : ev.type === 'trip_start' ? 'Trip Start' : 'Trip End'}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
