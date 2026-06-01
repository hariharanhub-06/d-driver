'use client';

import { useState, useEffect } from 'react';
import { Clock, ChevronDown, ChevronRight, Calendar, Activity } from 'lucide-react';
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

type LogEntry = {
    id: string;
    actor_id: string;
    actor_name?: string;
    actor_role: string;
    action: string;
    target_type?: string;
    target_id?: string;
    created_at: string;
};

// Human-readable labels for each audit action
const ACTION_LABELS: Record<string, string> = {
    login: 'Logged in',
    logout: 'Logged out',
    mark_attendance: 'Marked attendance',
    create_student: 'Added a student',
    update_student: 'Updated a student',
    delete_student: 'Deleted a student',
    create_driver: 'Added a driver',
    update_driver: 'Updated a driver',
    delete_driver: 'Removed a driver',
    create_school: 'Created a school',
    update_school: 'Updated school details',
    delete_school: 'Deleted a school',
    create_user: 'Created a user',
    delete_user: 'Removed a user',
    reset_password: 'Reset a password',
    send_reset_email: 'Sent password reset email',
    assign_sa_to_school: 'Assigned support agent',
    start_trip: 'Started a trip',
    complete_trip: 'Completed a trip',
};

const ROLE_COLORS: Record<string, string> = {
    driver:      'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    bus_staff:   'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400',
    parent:      'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    admin:       'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
    super_admin: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};

const ROLE_DOT: Record<string, string> = {
    driver:      'bg-blue-500',
    bus_staff:   'bg-violet-500',
    parent:      'bg-emerald-500',
    admin:       'bg-orange-500',
    super_admin: 'bg-red-500',
};

const ROLE_LABELS: Record<string, string> = {
    driver: 'Driver', bus_staff: 'Bus Staff', parent: 'Parent',
    admin: 'Admin', super_admin: 'Super Admin',
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
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [activityLoading, setActivityLoading] = useState(true);
    const [roleFilter, setRoleFilter] = useState('all');

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
        } catch { setShifts([]); }
        finally { setShiftsLoading(false); }
    };

    const fetchActivity = async () => {
        setActivityLoading(true);
        try {
            const params: any = { limit: 300 };
            if (dateFrom) params.date_from = dateFrom;
            if (dateTo) params.date_to = dateTo;

            // Fetch all audit logs + trip history in parallel
            const [auditRes, tripsRes] = await Promise.allSettled([
                api.get('/audit/logs', { params }),
                api.get('/trips/history', { params }),
            ]);

            const entries: LogEntry[] = [];

            if (auditRes.status === 'fulfilled') {
                const raw = auditRes.value.data?.logs || auditRes.value.data || [];
                for (const l of raw) {
                    entries.push({
                        id: l.id,
                        actor_id: l.actor_id,
                        actor_name: l.actor_name || l.actor_id,
                        actor_role: l.actor_role || 'unknown',
                        action: l.action,
                        target_type: l.target_type,
                        target_id: l.target_id,
                        created_at: l.created_at,
                    });
                }
            }

            // Add trip events from history (not in audit log yet)
            if (tripsRes.status === 'fulfilled') {
                const trips = Array.isArray(tripsRes.value.data) ? tripsRes.value.data : [];
                for (const t of trips) {
                    if (t.started_at) entries.push({
                        id: `trip-start-${t.id}`,
                        actor_id: t.driver?.user_id || '',
                        actor_name: t.driver?.user?.name || 'Driver',
                        actor_role: 'driver',
                        action: 'start_trip',
                        target_type: 'route',
                        target_id: t.route?.name,
                        created_at: t.started_at,
                    });
                    if (t.completed_at) entries.push({
                        id: `trip-end-${t.id}`,
                        actor_id: t.driver?.user_id || '',
                        actor_name: t.driver?.user?.name || 'Driver',
                        actor_role: 'driver',
                        action: 'complete_trip',
                        target_type: 'route',
                        target_id: t.route?.name,
                        created_at: t.completed_at,
                    });
                }
            }

            entries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            setLogs(entries);
        } catch { setLogs([]); }
        finally { setActivityLoading(false); }
    };

    const handleFilter = () => { fetchShifts(); fetchActivity(); };
    const toggleExpand = (id: string) => setExpandedId(prev => prev === id ? null : id);

    const filteredLogs = roleFilter === 'all' ? logs : logs.filter(l => l.actor_role === roleFilter);

    const actionLabel = (entry: LogEntry) => {
        const base = ACTION_LABELS[entry.action] || entry.action.replace(/_/g, ' ');
        if (entry.target_id && ['start_trip', 'complete_trip'].includes(entry.action)) {
            return `${base} — ${entry.target_id}`;
        }
        return base;
    };

    return (
        <div className="space-y-6 animate-in">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Logs</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Driver shift KM records and full user activity log.</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <input type="date" className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[var(--brand)] transition-colors" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                        <span className="text-slate-400 text-sm">–</span>
                        <input type="date" className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[var(--brand)] transition-colors" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                    </div>
                    <button onClick={handleFilter} className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95">
                        Filter
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-2xl p-1 w-fit">
                {(['shifts', 'activity'] as const).map(t => (
                    <button key={t} onClick={() => setTab(t)}
                        className={cn('px-5 py-2 rounded-xl text-sm font-semibold capitalize transition-all',
                            tab === t ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200')}>
                        {t === 'shifts' ? 'Shift KM Logs' : 'User Activity'}
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
                                    <th className="px-4 py-3 w-10"></th>
                                    {['Driver', 'Bus', 'Date', 'Start', 'End', 'Total KM', 'Status'].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {shiftsLoading ? (
                                    <tr><td colSpan={8} className="px-4 py-3">
                                        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin"></div></div>
                                    </td></tr>
                                ) : shifts.length === 0 ? (
                                    <tr><td colSpan={8} className="px-4 py-3">
                                        <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">
                                            <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                            <p>No shift logs found</p>
                                        </div>
                                    </td></tr>
                                ) : shifts.map(shift => (
                                    <>
                                        <tr key={shift.id} onClick={() => toggleExpand(shift.id)}
                                            className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer">
                                            <td className="px-4 py-3">
                                                {expandedId === shift.id ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300">{shift.driver?.user?.name || '—'}</td>
                                            <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{shift.bus_number || '—'}</td>
                                            <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{shift.date ? new Date(shift.date).toLocaleDateString('en-IN') : '—'}</td>
                                            <td className="px-4 py-3 font-mono text-xs text-emerald-600 dark:text-emerald-400 font-semibold">{fmtTime(shift.start_time)}</td>
                                            <td className="px-4 py-3 font-mono text-xs text-amber-600 dark:text-amber-400 font-semibold">{fmtTime(shift.end_time)}</td>
                                            <td className="px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-300">{shift.total_km != null ? `${Number(shift.total_km).toFixed(1)} km` : '—'}</td>
                                            <td className="px-4 py-3"><span className={`${statusBadge(shift.status)} capitalize`}>{shift.status || 'unknown'}</span></td>
                                        </tr>
                                        {expandedId === shift.id && (
                                            <tr key={`${shift.id}-exp`} className="bg-slate-50 dark:bg-slate-700/30">
                                                <td colSpan={8} className="px-6 py-4">
                                                    {!shift.kmEntries?.length ? (
                                                        <p className="text-xs text-slate-400 italic">No KM entries recorded.</p>
                                                    ) : (
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                                            {shift.kmEntries.map(entry => (
                                                                <div key={entry.id} className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-xl px-4 py-2.5 border border-slate-100 dark:border-slate-700">
                                                                    <div className="w-2 h-2 rounded-full bg-[var(--brand)] shrink-0" />
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 capitalize">{entry.entry_type?.replace(/_/g, ' ')}</p>
                                                                        <p className="text-xs text-slate-400">{fmtDatetime(entry.recorded_at)}</p>
                                                                    </div>
                                                                    <span className="font-mono font-bold text-sm text-slate-800 dark:text-white">{entry.km_reading} km</span>
                                                                </div>
                                                            ))}
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
                <div className="space-y-4">
                    {/* Role filter + legend */}
                    <div className="flex items-center gap-3 flex-wrap">
                        <select
                            value={roleFilter}
                            onChange={e => setRoleFilter(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[var(--brand)]"
                        >
                            <option value="all">All Roles</option>
                            <option value="driver">Driver</option>
                            <option value="bus_staff">Bus Staff</option>
                            <option value="parent">Parent</option>
                            <option value="admin">Admin</option>
                        </select>
                        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                            {Object.entries(ROLE_LABELS).filter(([r]) => r !== 'super_admin').map(([role, label]) => (
                                <span key={role} className="flex items-center gap-1.5">
                                    <span className={`w-2 h-2 rounded-full ${ROLE_DOT[role]}`} />
                                    {label}
                                </span>
                            ))}
                        </div>
                        {!activityLoading && (
                            <span className="ml-auto text-xs text-slate-400">{filteredLogs.length} events</span>
                        )}
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                        {activityLoading ? (
                            <div className="flex justify-center py-16">
                                <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : filteredLogs.length === 0 ? (
                            <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">
                                <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                <p>No activity found{roleFilter !== 'all' ? ` for ${ROLE_LABELS[roleFilter]}` : ''}</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100 dark:divide-slate-700/40">
                                {filteredLogs.map(entry => (
                                    <div key={entry.id} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                                        {/* Role dot */}
                                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${ROLE_DOT[entry.actor_role] || 'bg-slate-400'}`} />

                                        {/* Name + role badge */}
                                        <div className="w-40 shrink-0">
                                            <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{entry.actor_name || '—'}</p>
                                            <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide', ROLE_COLORS[entry.actor_role] || 'bg-slate-100 text-slate-500')}>
                                                {ROLE_LABELS[entry.actor_role] || entry.actor_role}
                                            </span>
                                        </div>

                                        {/* Action */}
                                        <p className="flex-1 text-sm text-slate-700 dark:text-slate-300 truncate">
                                            {actionLabel(entry)}
                                        </p>

                                        {/* Timestamp */}
                                        <p className="text-xs text-slate-400 dark:text-slate-500 shrink-0 text-right">
                                            {fmtDatetime(entry.created_at)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
