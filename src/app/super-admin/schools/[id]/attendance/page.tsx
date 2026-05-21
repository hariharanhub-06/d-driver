'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ClipboardList, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '@/lib/api';

interface AttendanceRecord {
    id: string;
    student: { name: string; route?: { name: string } };
    status: 'present' | 'absent';
    marked_at?: string;
}

const inputCls = "bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[var(--brand)] transition-colors";

export default function SchoolAttendancePage() {
    const { id } = useParams<{ id: string }>();
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [date, setDate] = useState(() => new Date().toLocaleDateString('en-CA'));

    useEffect(() => { fetchAttendance(); }, [id, date]);

    const fetchAttendance = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get(`/attendance?school_id=${id}&date=${date}`);
            setRecords(Array.isArray(res.data) ? res.data : []);
        } catch (e: any) {
            setError(e.response?.data?.message || 'Failed to load attendance records.');
        } finally {
            setLoading(false);
        }
    };

    const presentCount = records.filter(r => r.status === 'present').length;
    const absentCount = records.filter(r => r.status === 'absent').length;

    const formatTime = (ts?: string) => {
        if (!ts) return '—';
        try {
            return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        } catch {
            return '—';
        }
    };

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2.5">
                    <ClipboardList className="w-5 h-5 text-[var(--brand)]" />
                    <h2 className="text-slate-900 dark:text-white font-bold text-lg">Attendance</h2>
                    <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full px-2.5 py-0.5 font-medium">{records.length} records</span>
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Date:</label>
                    <input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className={inputCls}
                    />
                </div>
            </div>

            {/* Summary counts */}
            {!loading && records.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Present</p>
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{presentCount}</p>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
                            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Absent</p>
                            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{absentCount}</p>
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <p className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/30 rounded-xl px-4 py-3 border border-red-200 dark:border-red-800">{error}</p>
            )}

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex justify-center py-16">
                            <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : records.length === 0 ? (
                        <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">
                            No attendance records for {new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}.
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-700">
                                    {['Student Name', 'Route', 'Status', 'Time'].map(col => (
                                        <th key={col} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-700/50">{col}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {records.map(record => (
                                    <tr key={record.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                        <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">{record.student.name}</td>
                                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{record.student.route?.name || '—'}</td>
                                        <td className="px-4 py-3">
                                            {record.status === 'present' ? (
                                                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800">
                                                    <CheckCircle2 className="w-3 h-3" /> Present
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800">
                                                    <AlertCircle className="w-3 h-3" /> Absent
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 tabular-nums">{formatTime(record.marked_at)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
