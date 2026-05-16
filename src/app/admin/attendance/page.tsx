'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Clock, Search, Calendar, Download, ChevronDown } from 'lucide-react';
import api from '@/lib/api';

interface AttendanceRecord {
    id?: string;
    student?: { id: string; name: string; grade?: string };
    student_id?: string;
    student_name?: string;
    grade?: string;
    status: 'present' | 'absent' | null;
    stop?: { name: string };
    marked_at?: string;
    note?: string;
}

interface Route {
    id: string;
    name: string;
}

function StatusBadge({ status }: { status: AttendanceRecord['status'] }) {
    if (status === 'present')
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Present</span>;
    if (status === 'absent')
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Absent</span>;
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400">Not Marked</span>;
}

export default function AttendancePage() {
    const today = new Date().toISOString().split('T')[0];

    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [routes, setRoutes] = useState<Route[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [date, setDate] = useState(today);
    const [routeId, setRouteId] = useState('');
    const [search, setSearch] = useState('');
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        fetchRoutes();
    }, []);

    useEffect(() => {
        fetchAttendance();
    }, [date, routeId]);

    const fetchRoutes = async () => {
        try {
            const { data } = await api.get('/routes');
            setRoutes(data || []);
        } catch {
            // non-critical
        }
    };

    const fetchAttendance = async () => {
        setLoading(true);
        setError('');
        try {
            const params: Record<string, string> = { date };
            if (routeId) params.route_id = routeId;
            const { data } = await api.get('/attendance', { params });
            setRecords(data || []);
        } catch {
            setError('Failed to load attendance records.');
            setRecords([]);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const params: Record<string, string> = { format: 'xlsx', from: date, to: date };
            if (routeId) params.route_id = routeId;
            const response = await api.get('/reports/attendance', {
                params,
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `attendance-${date}.xlsx`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch {
            alert('Export failed. Please try again.');
        } finally {
            setExporting(false);
        }
    };

    const getName = (r: AttendanceRecord) =>
        r.student?.name || r.student_name || '—';
    const getGrade = (r: AttendanceRecord) =>
        r.student?.grade || r.grade || '—';

    const filtered = records.filter(r => {
        const q = search.toLowerCase();
        return getName(r).toLowerCase().includes(q) || getGrade(r).toLowerCase().includes(q);
    });

    const present = records.filter(r => r.status === 'present').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const notMarked = records.filter(r => !r.status).length;

    return (
        <div className="space-y-6 animate-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Attendance</h1>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-blue-500" />
                        {new Date(date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                <button
                    onClick={handleExport}
                    disabled={exporting || records.length === 0}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-colors disabled:opacity-60"
                >
                    <Download className="w-4 h-4" />
                    {exporting ? 'Exporting...' : 'Export Excel'}
                </button>
            </div>

            {/* Summary Tiles */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Present', count: present, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-100 dark:border-emerald-900/30' },
                    { label: 'Absent', count: absent, icon: XCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-100 dark:border-red-900/30' },
                    { label: 'Not Marked', count: notMarked, icon: Clock, color: 'text-gray-400', bg: 'bg-gray-50 dark:bg-slate-800', border: 'border-gray-100 dark:border-slate-700' },
                ].map(c => (
                    <div key={c.label} className={`bg-white dark:bg-slate-900 rounded-2xl border ${c.border} p-4 flex items-center gap-3 shadow-sm`}>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${c.bg}`}>
                            <c.icon className={`w-4 h-4 ${c.color}`} />
                        </div>
                        <div>
                            <p className="text-xl font-black text-gray-900 dark:text-white">{loading ? '—' : c.count}</p>
                            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{c.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 border border-red-200 rounded-xl p-3 text-sm">{error}</div>
            )}

            {/* Filters + Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 flex flex-wrap gap-3 items-center">
                    {/* Date picker */}
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <input
                            type="date"
                            value={date}
                            max={today}
                            onChange={e => setDate(e.target.value)}
                            className="text-sm bg-transparent focus:outline-none text-gray-700 dark:text-slate-300"
                        />
                    </div>

                    {/* Route filter */}
                    <div className="relative flex items-center gap-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2">
                        <select
                            value={routeId}
                            onChange={e => setRouteId(e.target.value)}
                            className="text-sm bg-transparent focus:outline-none text-gray-700 dark:text-slate-300 pr-6 appearance-none"
                        >
                            <option value="">All Routes</option>
                            {routes.map(r => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400 pointer-events-none absolute right-3" />
                    </div>

                    {/* Search */}
                    <div className="relative flex-1 min-w-[180px]">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search student..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <span className="text-xs text-gray-400 ml-auto shrink-0">
                        {present}/{records.length} present
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 dark:bg-slate-800/80 text-gray-500 dark:text-slate-400 font-medium border-b border-gray-100 dark:border-slate-800 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-3">Student</th>
                                <th className="px-6 py-3">Grade</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Stop</th>
                                <th className="px-6 py-3">Marked At</th>
                                <th className="px-6 py-3">Note</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16 text-center">
                                        <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16 text-center">
                                        <Calendar className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                                        <p className="text-gray-400 text-sm">No attendance records for this date.</p>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((r, i) => (
                                    <tr key={r.id || i} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center font-black text-blue-600 text-[10px] shrink-0">
                                                    {getName(r).charAt(0)}
                                                </div>
                                                <span className="font-semibold text-gray-800 dark:text-white text-sm">{getName(r)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 text-gray-500 text-xs font-medium">{getGrade(r)}</td>
                                        <td className="px-6 py-3"><StatusBadge status={r.status} /></td>
                                        <td className="px-6 py-3 text-gray-500 text-xs">{r.stop?.name || '—'}</td>
                                        <td className="px-6 py-3 text-gray-500 text-xs">
                                            {r.marked_at
                                                ? new Date(r.marked_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                                                : '—'}
                                        </td>
                                        <td className="px-6 py-3 text-gray-400 text-xs max-w-[160px] truncate">{r.note || '—'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
