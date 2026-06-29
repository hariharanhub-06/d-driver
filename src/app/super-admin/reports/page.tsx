'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { FileText, TrendingUp, BarChart3, PieChart, Info, Download, Loader2 } from 'lucide-react';
import { useT } from '@/lib/i18n';

interface School { id: string; name: string }

const REPORT_TYPES = [
    { value: 'attendance', labelEn: 'Attendance', labelTa: 'வருகை', dated: true },
    { value: 'fees',       labelEn: 'Fees',       labelTa: 'கட்டணம்', dated: false },
    { value: 'km-log',     labelEn: 'Kilometre Log',     labelTa: 'கி.மீ பதிவு', dated: true },
];

export default function ReportsPage() {
    const t = useT();
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [schools, setSchools] = useState<School[]>([]);

    // Generate-report form
    const [reportType, setReportType] = useState('attendance');
    const [schoolId, setSchoolId] = useState('');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        api.get('/dashboard/stats').then(r => setStats(r.data)).catch(() => {}).finally(() => setLoading(false));
        api.get('/schools').then(r => setSchools(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    }, []);

    const activeType = REPORT_TYPES.find(r => r.value === reportType);

    const downloadReport = async () => {
        setError('');
        if (!schoolId) { setError(t('Please select a school first.', 'முதலில் ஒரு பள்ளியைத் தேர்ந்தெடுக்கவும்.')); return; }
        setGenerating(true);
        try {
            const params: Record<string, string> = { school_id: schoolId };
            if (activeType?.dated) { if (from) params.from = from; if (to) params.to = to; }
            const res = await api.get(`/reports/${reportType}`, { params, responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `${reportType}-report.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (e: any) {
            // Blob error responses need decoding back to text.
            let msg = 'Failed to generate report';
            try { msg = JSON.parse(await e?.response?.data?.text())?.error || msg; } catch { /* keep default */ }
            setError(msg);
        } finally {
            setGenerating(false);
        }
    };

    const reportStats = [
        { label: t('Active Routes', 'செயலில் உள்ள வழிகள்'), value: stats?.activeRoutes || 0, icon: TrendingUp, iconColor: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30' },
        { label: t('Total Students', 'மொத்த மாணவர்கள்'), value: stats?.totalStudents || 0, icon: BarChart3, iconColor: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
        { label: t('Total Schools', 'மொத்த பள்ளிகள்'), value: stats?.totalSchools || 0, icon: Info, iconColor: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30' },
        { label: t('Revenue', 'வருவாய்'), value: `₹${((stats?.totalRevenue || 0) / 1000).toFixed(1)}K`, icon: PieChart, iconColor: 'text-[var(--brand)]', bg: 'bg-[var(--brand)]/10' },
    ];

    const fieldCls = "w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-[var(--brand)]";

    return (
        <div className="space-y-6 animate-in">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                    <FileText className="w-7 h-7 text-[var(--brand)]" />
                    {t('Reports', 'அறிக்கைகள்')}
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('Generate and download platform reports', 'தள அறிக்கைகளை உருவாக்கி பதிவிறக்கவும்')}</p>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {reportStats.map((stat, i) => (
                    <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.bg}`}>
                                <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
                            </div>
                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">Live</span>
                        </div>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{stat.label}</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{loading ? t('Loading...', 'ஏற்றுகிறது...') : stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Generate Report */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{t('Generate Report', 'அறிக்கை உருவாக்கு')}</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">{t('Pick a report type and school, then download the Excel file.', 'அறிக்கை வகை மற்றும் பள்ளியைத் தேர்ந்து எக்செல் கோப்பைப் பதிவிறக்கவும்.')}</p>
                </div>
                <div className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-2.5 text-sm text-red-600 dark:text-red-400">{error}</div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">{t('Report Type', 'அறிக்கை வகை')}</label>
                            <select value={reportType} onChange={e => setReportType(e.target.value)} className={fieldCls}>
                                {REPORT_TYPES.map(r => <option key={r.value} value={r.value}>{t(r.labelEn, r.labelTa)}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">{t('School', 'பள்ளி')} *</label>
                            <select value={schoolId} onChange={e => setSchoolId(e.target.value)} className={fieldCls}>
                                <option value="">{t('Select a school…', 'பள்ளியைத் தேர்ந்தெடுக்கவும்…')}</option>
                                {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        {activeType?.dated && (
                            <>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">{t('From', 'முதல்')}</label>
                                    <input type="date" value={from} onChange={e => setFrom(e.target.value)} className={fieldCls} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">{t('To', 'வரை')}</label>
                                    <input type="date" value={to} onChange={e => setTo(e.target.value)} className={fieldCls} />
                                </div>
                            </>
                        )}
                    </div>
                    <button
                        onClick={downloadReport}
                        disabled={generating}
                        className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-5 py-2.5 font-semibold text-sm transition-all active:scale-95 disabled:opacity-60"
                    >
                        {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        {generating ? t('Generating…', 'உருவாக்குகிறது…') : t('Generate & Download', 'உருவாக்கி பதிவிறக்கு')}
                    </button>
                </div>
            </div>
        </div>
    );
}
