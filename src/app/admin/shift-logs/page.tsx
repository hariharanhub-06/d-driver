'use client';

import { useState, useEffect } from 'react';
import { Clock, ChevronDown, ChevronRight, Loader2, Calendar } from 'lucide-react';
import api from '@/lib/api';

type KmEntry = {
    id: string;
    type: string;
    km_reading: number;
    recorded_at?: string;
};

type Shift = {
    id: string;
    driver?: { user: { name: string } };
    bus?: { bus_number: string };
    date?: string;
    start_time?: string;
    end_time?: string;
    total_km?: number;
    status?: string;
    km_entries?: KmEntry[];
};

const statusBadge = (s?: string) => {
    if (s === 'completed') return 'inline-flex items-center bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full px-2.5 py-0.5 text-xs font-medium';
    if (s === 'active') return 'inline-flex items-center bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full px-2.5 py-0.5 text-xs font-medium';
    return 'inline-flex items-center bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full px-2.5 py-0.5 text-xs font-medium';
};

export default function ShiftLogsPage() {
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    useEffect(() => { fetchShifts(); }, []);

    const fetchShifts = async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (dateFrom) params.from = dateFrom;
            if (dateTo) params.to = dateTo;
            const { data } = await api.get('/shifts', { params });
            setShifts(Array.isArray(data) ? data : (Array.isArray(data?.shifts) ? data.shifts : []));
        } catch {
            setShifts([]);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterApply = () => { fetchShifts(); };

    const fmtTime = (s?: string) => {
        if (!s) return '—';
        try {
            return new Date(s).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
        } catch { return '—'; }
    };

    const toggleExpand = (id: string) => {
        setExpandedId(prev => prev === id ? null : id);
    };

    return (
        <div className="space-y-6 animate-in">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Shift Logs</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">View driver shift history and kilometre readings.</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <input
                            type="date"
                            className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[var(--brand)] transition-colors"
                            value={dateFrom}
                            onChange={e => setDateFrom(e.target.value)}
                        />
                        <span className="text-slate-400 text-sm">–</span>
                        <input
                            type="date"
                            className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[var(--brand)] transition-colors"
                            value={dateTo}
                            onChange={e => setDateTo(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={handleFilterApply}
                        className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95"
                    >
                        Filter
                    </button>
                </div>
            </div>

            {/* Table */}
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
                            {loading ? (
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
                                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{shift.bus?.bus_number || '—'}</td>
                                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                            {shift.date ? new Date(shift.date).toLocaleDateString('en-IN') : '—'}
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs text-emerald-600 dark:text-emerald-400 font-semibold">{fmtTime(shift.start_time)}</td>
                                        <td className="px-4 py-3 font-mono text-xs text-amber-600 dark:text-amber-400 font-semibold">{fmtTime(shift.end_time)}</td>
                                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 font-bold">{shift.total_km != null ? `${shift.total_km} km` : '—'}</td>
                                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                            <span className={`${statusBadge(shift.status)} capitalize`}>
                                                {shift.status || 'unknown'}
                                            </span>
                                        </td>
                                    </tr>

                                    {/* Expanded KM Entries */}
                                    {expandedId === shift.id && (
                                        <tr key={`${shift.id}-expanded`} className="bg-slate-50 dark:bg-slate-700/30">
                                            <td colSpan={8} className="px-6 py-4">
                                                {!shift.km_entries || shift.km_entries.length === 0 ? (
                                                    <p className="text-xs text-slate-400 italic">No KM entries recorded for this shift.</p>
                                                ) : (
                                                    <div className="space-y-2">
                                                        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">KM Entries</p>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                                            {shift.km_entries.map(entry => (
                                                                <div key={entry.id} className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-xl px-4 py-2.5 border border-slate-100 dark:border-slate-700">
                                                                    <div className="w-2 h-2 rounded-full bg-[var(--brand)] shrink-0" />
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 capitalize">{entry.type?.replace('_', ' ')}</p>
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
        </div>
    );
}
