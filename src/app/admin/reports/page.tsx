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
            <div>
                <h1 className="text-2xl font-black tracking-tight leading-none text-slate-900 dark:text-white">Reports</h1>
                <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest mt-2 flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5 text-primary-500" />
                    Download attendance, fee, and KM reports as Excel files.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Attendance Report */}
                <div className="card p-6 border-none shadow-xl flex flex-col gap-5">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                            <Activity className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                            <h3 className="font-black text-sm uppercase tracking-widest text-slate-900 dark:text-white">Attendance Report</h3>
                            <p className="text-[11px] text-slate-400 mt-1 font-medium">Student bus attendance by date range and route.</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">From</label>
                            <input
                                type="date"
                                value={attFrom}
                                onChange={e => setAttFrom(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-primary-500 transition-all"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">To</label>
                            <input
                                type="date"
                                value={attTo}
                                onChange={e => setAttTo(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-primary-500 transition-all"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">Route (optional)</label>
                            <select
                                value={attRoute}
                                onChange={e => setAttRoute(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-primary-500 transition-all"
                            >
                                <option value="">All Routes</option>
                                {routes.map(r => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {attError && (
                        <p className="text-red-500 text-xs font-bold bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2.5 border border-red-100 dark:border-red-500/20">
                            {attError}
                        </p>
                    )}

                    <button
                        onClick={handleAttendance}
                        disabled={attLoading || !attFrom || !attTo}
                        className="mt-auto flex items-center justify-center gap-2 w-full py-3 btn-primary text-[11px] font-black uppercase tracking-widest disabled:opacity-50 transition-all"
                    >
                        {attLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        Download Excel
                    </button>
                </div>

                {/* Fee Report */}
                <div className="card p-6 border-none shadow-xl flex flex-col gap-5">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                            <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                            <h3 className="font-black text-sm uppercase tracking-widest text-slate-900 dark:text-white">Fee Report</h3>
                            <p className="text-[11px] text-slate-400 mt-1 font-medium">Monthly fee collection and outstanding dues.</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">Month</label>
                            <input
                                type="month"
                                value={feeMonth}
                                onChange={e => setFeeMonth(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-primary-500 transition-all"
                            />
                        </div>
                    </div>

                    {feeError && (
                        <p className="text-red-500 text-xs font-bold bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2.5 border border-red-100 dark:border-red-500/20">
                            {feeError}
                        </p>
                    )}

                    <button
                        onClick={handleFees}
                        disabled={feeLoading || !feeMonth}
                        className="mt-auto flex items-center justify-center gap-2 w-full py-3 btn-primary text-[11px] font-black uppercase tracking-widest disabled:opacity-50 transition-all"
                    >
                        {feeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        Download Excel
                    </button>
                </div>

                {/* KM Log */}
                <div className="card p-6 border-none shadow-xl flex flex-col gap-5">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                            <TrendingUp className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                            <h3 className="font-black text-sm uppercase tracking-widest text-slate-900 dark:text-white">KM Log</h3>
                            <p className="text-[11px] text-slate-400 mt-1 font-medium">Bus mileage and distance covered per trip.</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">From</label>
                            <input
                                type="date"
                                value={kmFrom}
                                onChange={e => setKmFrom(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-primary-500 transition-all"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">To</label>
                            <input
                                type="date"
                                value={kmTo}
                                onChange={e => setKmTo(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-primary-500 transition-all"
                            />
                        </div>
                    </div>

                    {kmError && (
                        <p className="text-red-500 text-xs font-bold bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2.5 border border-red-100 dark:border-red-500/20">
                            {kmError}
                        </p>
                    )}

                    <button
                        onClick={handleKmLog}
                        disabled={kmLoading || !kmFrom || !kmTo}
                        className="mt-auto flex items-center justify-center gap-2 w-full py-3 btn-primary text-[11px] font-black uppercase tracking-widest disabled:opacity-50 transition-all"
                    >
                        {kmLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        Download Excel
                    </button>
                </div>
            </div>
        </div>
    );
}
