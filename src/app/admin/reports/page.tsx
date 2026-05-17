'use client';

import { useState, useEffect } from 'react';
import { Download, FileSpreadsheet, TrendingUp, Activity, Loader2 } from 'lucide-react';
import api from '@/lib/api';

const downloadReport = async (url: string, filename: string) => {
    const res = await api.get(url, { responseType: 'blob' });
    const href = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = href;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(href);
};

function formatDate(date: Date) {
    return date.toISOString().split('T')[0];
}

export default function ReportsPage() {
    const today = formatDate(new Date());
    const thirtyDaysAgo = formatDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const currentMonth = today.slice(0, 7); // YYYY-MM

    // Attendance state
    const [attFrom, setAttFrom] = useState(thirtyDaysAgo);
    const [attTo, setAttTo] = useState(today);
    const [attRoute, setAttRoute] = useState('');
    const [attLoading, setAttLoading] = useState(false);
    const [attError, setAttError] = useState('');

    // Fee state
    const [feeMonth, setFeeMonth] = useState(currentMonth);
    const [feeLoading, setFeeLoading] = useState(false);
    const [feeError, setFeeError] = useState('');

    // KM Log state
    const [kmFrom, setKmFrom] = useState(thirtyDaysAgo);
    const [kmTo, setKmTo] = useState(today);
    const [kmLoading, setKmLoading] = useState(false);
    const [kmError, setKmError] = useState('');

    // Routes for filter
    const [routes, setRoutes] = useState<{ id: string; name: string }[]>([]);
    useEffect(() => {
        api.get('/routes').then(r => {
            setRoutes(Array.isArray(r.data) ? r.data : []);
        }).catch(() => {});
    }, []);

    const handleAttendance = async () => {
        setAttLoading(true);
        setAttError('');
        try {
            const params = new URLSearchParams({ format: 'xlsx', from: attFrom, to: attTo });
            if (attRoute) params.set('route_id', attRoute);
            await downloadReport(`/reports/attendance?${params.toString()}`, 'attendance.xlsx');
        } catch {
            setAttError('Failed to generate report. Please try again.');
        } finally {
            setAttLoading(false);
        }
    };

    const handleFees = async () => {
        setFeeLoading(true);
        setFeeError('');
        try {
            await downloadReport(`/reports/fees?format=xlsx&month=${feeMonth}`, 'fees.xlsx');
        } catch {
            setFeeError('Failed to generate report. Please try again.');
        } finally {
            setFeeLoading(false);
        }
    };

    const handleKmLog = async () => {
        setKmLoading(true);
        setKmError('');
        try {
            await downloadReport(`/reports/km-log?format=xlsx&from=${kmFrom}&to=${kmTo}`, 'km-log.xlsx');
        } catch {
            setKmError('Failed to generate report. Please try again.');
        } finally {
            setKmLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reports</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                        <TrendingUp className="w-3.5 h-3.5" />
                        Download attendance, fee, and KM reports as Excel files.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Attendance Report */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 flex flex-col gap-5">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                            <Activity className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Attendance Report</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Student bus attendance by date range and route.</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">From</label>
                            <input
                                type="date"
                                value={attFrom}
                                onChange={e => setAttFrom(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">To</label>
                            <input
                                type="date"
                                value={attTo}
                                onChange={e => setAttTo(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Route (optional)</label>
                            <select
                                value={attRoute}
                                onChange={e => setAttRoute(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[var(--brand)] transition-colors"
                            >
                                <option value="">All Routes</option>
                                {routes.map(r => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {attError && (
                        <p className="text-red-500 text-xs bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2.5 border border-red-100 dark:border-red-900/30">
                            {attError}
                        </p>
                    )}

                    <button
                        onClick={handleAttendance}
                        disabled={attLoading || !attFrom || !attTo}
                        className="mt-auto flex items-center justify-center gap-2 w-full py-2.5 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 font-semibold text-sm transition-all active:scale-95 disabled:opacity-50"
                    >
                        {attLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        Download Excel
                    </button>
                </div>

                {/* Fee Report */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 flex flex-col gap-5">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center shrink-0">
                            <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Fee Report</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Monthly fee collection and outstanding dues.</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Month</label>
                            <input
                                type="month"
                                value={feeMonth}
                                onChange={e => setFeeMonth(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors"
                            />
                        </div>
                    </div>

                    {feeError && (
                        <p className="text-red-500 text-xs bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2.5 border border-red-100 dark:border-red-900/30">
                            {feeError}
                        </p>
                    )}

                    <button
                        onClick={handleFees}
                        disabled={feeLoading || !feeMonth}
                        className="mt-auto flex items-center justify-center gap-2 w-full py-2.5 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 font-semibold text-sm transition-all active:scale-95 disabled:opacity-50"
                    >
                        {feeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        Download Excel
                    </button>
                </div>

                {/* KM Log */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 flex flex-col gap-5">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shrink-0">
                            <TrendingUp className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white">KM Log</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Bus mileage and distance covered per trip.</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">From</label>
                            <input
                                type="date"
                                value={kmFrom}
                                onChange={e => setKmFrom(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">To</label>
                            <input
                                type="date"
                                value={kmTo}
                                onChange={e => setKmTo(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors"
                            />
                        </div>
                    </div>

                    {kmError && (
                        <p className="text-red-500 text-xs bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2.5 border border-red-100 dark:border-red-900/30">
                            {kmError}
                        </p>
                    )}

                    <button
                        onClick={handleKmLog}
                        disabled={kmLoading || !kmFrom || !kmTo}
                        className="mt-auto flex items-center justify-center gap-2 w-full py-2.5 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 font-semibold text-sm transition-all active:scale-95 disabled:opacity-50"
                    >
                        {kmLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        Download Excel
                    </button>
                </div>
            </div>
        </div>
    );
}
