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
    if (s === 'completed') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    if (s === 'active') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    return 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300';
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
            setShifts(Array.isArray(data) ? data : []);
        } catch {
            setShifts([]);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterApply = () => { fetchShifts(); };

    const toggleExpand = (id: string) => {
        setExpandedId(prev => prev === id ? null : id);
    };

    return (
        <div className="space-y-6 animate-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Shift Logs</h1>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">View driver shift history and kilometre readings.</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <input
                            type="date"
                            className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={dateFrom}
                            onChange={e => setDateFrom(e.target.value)}
                        />
                        <span className="text-gray-400 text-sm">–</span>
                        <input
                            type="date"
                            className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={dateTo}
                            onChange={e => setDateTo(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={handleFilterApply}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-all"
                    >
                        Filter
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-slate-800">
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider w-10"></th>
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">Driver</th>
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">Bus</th>
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">Start</th>
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">End</th>
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">Total KM</th>
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={8} className="px-6 py-12 text-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" /></td></tr>
                            ) : shifts.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-16 text-center text-gray-400">
                                        <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p className="font-bold">No shift logs found</p>
                                    </td>
                                </tr>
                            ) : shifts.map(shift => (
                                <>
                                    <tr
                                        key={shift.id}
                                        onClick={() => toggleExpand(shift.id)}
                                        className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer border-b border-gray-50 dark:border-slate-800"
                                    >
                                        <td className="px-6 py-4">
                                            {expandedId === shift.id
                                                ? <ChevronDown className="w-4 h-4 text-gray-400" />
                                                : <ChevronRight className="w-4 h-4 text-gray-400" />}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-800 dark:text-white">{shift.driver?.user?.name || '—'}</td>
                                        <td className="px-6 py-4 text-gray-500 dark:text-slate-400">{shift.bus?.bus_number || '—'}</td>
                                        <td className="px-6 py-4 text-gray-500 dark:text-slate-400 text-xs">
                                            {shift.date ? new Date(shift.date).toLocaleDateString('en-IN') : '—'}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs text-emerald-600 dark:text-emerald-400 font-bold">{shift.start_time || '—'}</td>
                                        <td className="px-6 py-4 font-mono text-xs text-amber-600 dark:text-amber-400 font-bold">{shift.end_time || '—'}</td>
                                        <td className="px-6 py-4 font-bold text-gray-800 dark:text-white">{shift.total_km != null ? `${shift.total_km} km` : '—'}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold capitalize ${statusBadge(shift.status)}`}>
                                                {shift.status || 'unknown'}
                                            </span>
                                        </td>
                                    </tr>

                                    {/* Expanded KM Entries */}
                                    {expandedId === shift.id && (
                                        <tr key={`${shift.id}-expanded`} className="bg-gray-50 dark:bg-slate-800/40">
                                            <td colSpan={8} className="px-8 py-4">
                                                {!shift.km_entries || shift.km_entries.length === 0 ? (
                                                    <p className="text-xs text-gray-400 italic">No KM entries recorded for this shift.</p>
                                                ) : (
                                                    <div className="space-y-2">
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">KM Entries</p>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                                            {shift.km_entries.map(entry => (
                                                                <div key={entry.id} className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-xl px-4 py-2.5 border border-gray-100 dark:border-slate-700">
                                                                    <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-xs font-bold text-gray-700 dark:text-slate-200 capitalize">{entry.type?.replace('_', ' ')}</p>
                                                                        <p className="text-[10px] text-gray-400">{entry.recorded_at ? new Date(entry.recorded_at).toLocaleString('en-IN') : '—'}</p>
                                                                    </div>
                                                                    <span className="font-mono font-black text-sm text-gray-800 dark:text-white">{entry.km_reading} km</span>
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
