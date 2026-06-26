'use client';

import { useState, useEffect } from 'react';
import { IndianRupee, AlertCircle, CheckCircle2, RefreshCw, X, Loader2, Search, Bell, Calendar } from 'lucide-react';
import api from '@/lib/api';
import { useT } from '@/lib/i18n';

type Fee = {
    id: string;
    student?: { id: string; name: string };
    total_amount: number;
    due_amount: number;
    amount?: number; // legacy alias
    due_date?: string;
    status: 'pending' | 'paid' | 'overdue';
    payment_method?: string;
    paid_at?: string;
};

const TABS = ['All', 'Pending', 'Paid', 'Overdue', 'Delay Requests'] as const;

type DelayRequest = {
    id: string;
    fee_id: string;
    reason: string;
    requested_date: string;
    status: string;
    admin_note?: string;
    approved_due_date?: string;
    fee?: { total_amount: number; due_date: string; student?: { name: string } };
    created_at: string;
};

const statusBadge = (s: string) => {
    if (s === 'paid') return 'inline-flex items-center bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full px-2.5 py-0.5 text-xs font-medium';
    if (s === 'overdue') return 'inline-flex items-center bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full px-2.5 py-0.5 text-xs font-medium';
    return 'inline-flex items-center bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full px-2.5 py-0.5 text-xs font-medium';
};

export default function FeesPage() {
    const t = useT();
    const [fees, setFees] = useState<Fee[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<typeof TABS[number]>('All');
    const [search, setSearch] = useState('');
    const [isPayModalOpen, setIsPayModalOpen] = useState(false);
    const [selectedFee, setSelectedFee] = useState<Fee | null>(null);
    const [payAmount, setPayAmount] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generateMsg, setGenerateMsg] = useState('');
    const [delayRequests, setDelayRequests] = useState<DelayRequest[]>([]);
    const [delayLoading, setDelayLoading] = useState(false);
    const [reminding, setReminding] = useState(false);
    const [remindMsg, setRemindMsg] = useState('');
    const [delayAction, setDelayAction] = useState<{ req: DelayRequest; action: 'approve' | 'reject' } | null>(null);
    const [delayActionDate, setDelayActionDate] = useState('');
    const [delayActionNote, setDelayActionNote] = useState('');
    const [delayActionLoading, setDelayActionLoading] = useState(false);

    useEffect(() => { fetchFees(); }, []);

    useEffect(() => {
        if (tab === 'Delay Requests') fetchDelayRequests();
    }, [tab]);

    const fetchFees = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/finance/fees');
            setFees(Array.isArray(data) ? data : (data?.fees || []));
        } catch {
            setFees([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchDelayRequests = async () => {
        setDelayLoading(true);
        try {
            const { data } = await api.get('/finance/fee-delay');
            setDelayRequests(Array.isArray(data) ? data : []);
        } catch { setDelayRequests([]); }
        finally { setDelayLoading(false); }
    };

    const handleRemindAll = async () => {
        setReminding(true); setRemindMsg('');
        try {
            const { data } = await api.post('/finance/fees/remind-all');
            setRemindMsg(`Sent reminders to ${data?.sent ?? data?.reminded ?? 0} parents.`);
        } catch { setRemindMsg('Failed to send reminders.'); }
        finally { setReminding(false); }
    };

    const handleDelayAction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!delayAction) return;
        setDelayActionLoading(true);
        try {
            await api.put(`/finance/fee-delay/${delayAction.req.id}`, {
                status: delayAction.action === 'approve' ? 'approved' : 'rejected',
                approved_due_date: delayAction.action === 'approve' ? delayActionDate : undefined,
                admin_note: delayActionNote || undefined,
            });
            setDelayAction(null);
            fetchDelayRequests();
            window.dispatchEvent(new Event('pending-counts:refresh'));
        } catch (err: any) {
            alert(err?.response?.data?.error || 'Action failed');
        } finally { setDelayActionLoading(false); }
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        setGenerateMsg('');
        try {
            const { data } = await api.post('/finance/fees/generate');
            setGenerateMsg(`Generated ${data?.count ?? 'fees'} successfully.`);
            fetchFees();
        } catch {
            setGenerateMsg('Generation failed. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleRecordPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFee) return;
        setIsSubmitting(true);
        try {
            await api.post('/finance/payment/manual', {
                fee_id: selectedFee.id,
                amount: parseFloat(payAmount),
            });
            setIsPayModalOpen(false);
            setSelectedFee(null);
            setPayAmount('');
            fetchFees();
        } catch {
            setIsPayModalOpen(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Derive status client-side if backend doesn't provide it (due_amount=0 → paid, overdue date → overdue, else pending)
    const deriveStatus = (f: Fee): string => {
        if (f.status) return f.status;
        const dueAmt = f.due_amount ?? f.total_amount ?? 0;
        if (dueAmt === 0) return 'paid';
        if (f.due_date && new Date(f.due_date) < new Date()) return 'overdue';
        return 'pending';
    };

    const filtered = fees.filter(f => {
        const status = deriveStatus(f);
        const matchTab = tab === 'All' || status.toLowerCase() === tab.toLowerCase();
        const matchSearch = !search || f.student?.name?.toLowerCase().includes(search.toLowerCase());
        return matchTab && matchSearch;
    });

    const totalOutstanding = fees.filter(f => deriveStatus(f) !== 'paid').reduce((s, f) => s + (f.total_amount || f.amount || 0), 0);
    const totalCollectedMonth = fees.filter(f => {
        if (deriveStatus(f) !== 'paid') return false;
        // payment date is in f.payments array (payment_date field) or f.paid_at
        const paidAt = (f as any).paid_at || (f as any).payments?.[0]?.payment_date;
        if (!paidAt) return true; // count it even without exact date
        const d = new Date(paidAt);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).reduce((s, f) => s + (f.total_amount || f.amount || 0), 0);
    const overdueCount = fees.filter(f => deriveStatus(f) === 'overdue').length;

    return (
        <div className="space-y-6 animate-in">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('Fees & Payments', 'கட்டணம் & கொடுப்பனவுகள்')}</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('Track outstanding fees, record payments and generate billing cycles.', 'நிலுவை கட்டணங்களை கண்காணி, கொடுப்பனவுகளை பதிவு செய் மற்றும் கட்டண சுழற்சிகளை உருவாக்கு.')}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {generateMsg && <span className="text-xs text-emerald-600 font-semibold">{generateMsg}</span>}
                    {remindMsg && <span className="text-xs text-emerald-600 font-semibold">{remindMsg}</span>}
                    <button
                        onClick={handleRemindAll}
                        disabled={reminding}
                        className="flex items-center gap-2 border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95 disabled:opacity-60"
                    >
                        {reminding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
                        {t('Remind All', 'அனைவரையும் நினைவூட்டு')}
                    </button>
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95 disabled:opacity-60"
                    >
                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        {t('Generate Fees', 'கட்டணங்கள் உருவாக்கு')}
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">{t('Total Outstanding', 'மொத்த நிலுவை')}</p>
                    <h3 className="text-3xl font-bold mt-2 text-slate-900 dark:text-white">₹{totalOutstanding.toLocaleString()}</h3>
                    <div className="mt-3 text-xs text-slate-400 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {t('Across all pending fees', 'அனைத்து நிலுவை கட்டணங்களும்')}
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">{t('Collected This Month', 'இந்த மாதம் வசூல்')}</p>
                    <h3 className="text-3xl font-bold mt-2 text-emerald-600 dark:text-emerald-400">₹{totalCollectedMonth.toLocaleString()}</h3>
                    <div className="mt-3 text-xs text-slate-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        {t('Payments recorded', 'கொடுப்பனவுகள் பதிவு செய்யப்பட்டன')}
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">{t('Overdue Fees', 'தாமதமான கட்டணங்கள்')}</p>
                    <h3 className="text-3xl font-bold mt-2 text-red-600 dark:text-red-400">{overdueCount}</h3>
                    <div className="mt-3 text-xs text-slate-400 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                        {t('Immediate action required', 'உடனடி நடவடிக்கை தேவை')}
                    </div>
                </div>
            </div>

            {/* Table Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                {/* Tabs */}
                <div className="flex gap-1 p-3 border-b border-slate-100 dark:border-slate-700 flex-wrap">
                    {TABS.map(tabItem => (
                        <button
                            key={tabItem}
                            onClick={() => setTab(tabItem)}
                            className={tab === tabItem
                                ? 'px-4 py-2 text-sm font-semibold text-[var(--brand)] border-b-2 border-[var(--brand)]'
                                : 'px-4 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border-b-2 border-transparent'}
                        >
                            {tabItem === 'All' ? t('All', 'அனைத்தும்')
                                : tabItem === 'Pending' ? t('Pending', 'நிலுவையில்')
                                : tabItem === 'Paid' ? t('Paid', 'செலுத்தப்பட்டது')
                                : tabItem === 'Overdue' ? t('Overdue', 'தாமதமானது')
                                : t('Delay Requests', 'தாமத கோரிக்கைகள்')}
                        </button>
                    ))}
                    <div className="ml-auto relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" placeholder={t('Search student...', 'மாணவரை தேடு...')} className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2 pl-8 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors" value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                </div>

                {tab === 'Delay Requests' ? (
                    <div className="p-4 space-y-3">
                        {delayLoading ? (
                            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
                        ) : delayRequests.length === 0 ? (
                            <div className="text-center py-12 text-slate-400 text-sm">
                                <Calendar className="w-8 h-8 mx-auto mb-3 opacity-30" />
                                {t('No delay requests', 'தாமத கோரிக்கைகள் இல்லை')}
                            </div>
                        ) : delayRequests.map(req => (
                            <div key={req.id} className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-200 dark:border-slate-600 p-4">
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <p className="font-semibold text-slate-800 dark:text-white text-sm">{req.fee?.student?.name || '—'}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                            ₹{(req.fee?.total_amount || 0).toLocaleString('en-IN')} · {t('Due', 'கட்டண தேதி')} {req.fee?.due_date ? new Date(req.fee.due_date).toLocaleDateString('en-IN') : '—'}
                                        </p>
                                        <p className="text-xs text-slate-400 mt-0.5">{t('Requested new date:', 'கோரிய புதிய தேதி:')} <strong>{new Date(req.requested_date).toLocaleDateString('en-IN')}</strong></p>
                                        {req.reason && <p className="text-xs text-slate-400 mt-0.5 italic">"{req.reason}"</p>}
                                    </div>
                                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${req.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : req.status === 'approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                        {req.status}
                                    </span>
                                </div>
                                {req.status === 'pending' && (
                                    <div className="flex gap-2 mt-3">
                                        <button onClick={() => { setDelayAction({ req, action: 'approve' }); setDelayActionDate(req.requested_date.slice(0, 10)); setDelayActionNote(''); }} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-2 text-xs font-semibold transition-all">{t('Approve', 'அனுமதி')}</button>
                                        <button onClick={() => { setDelayAction({ req, action: 'reject' }); setDelayActionDate(''); setDelayActionNote(''); }} className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl py-2 text-xs font-semibold transition-all">{t('Reject', 'நிராகரி')}</button>
                                    </div>
                                )}
                                {req.admin_note && <p className="text-xs text-slate-400 mt-2 border-t border-slate-200 dark:border-slate-600 pt-2">{t('Note:', 'குறிப்பு:')} {req.admin_note}</p>}
                            </div>
                        ))}
                    </div>
                ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('Student', 'மாணவர்')}</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('Amount', 'தொகை')}</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('Due Date', 'கட்டண தேதி')}</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('Status', 'நிலை')}</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('Method', 'முறை')}</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('Actions', 'செயல்கள்')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} className="px-4 py-3">
                                    <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin"></div></div>
                                </td></tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-3">
                                        <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">
                                            <IndianRupee className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                            <p>{t('No fees found', 'கட்டணங்கள் இல்லை')}</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filtered.map(fee => (
                                <tr key={fee.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 font-medium">{fee.student?.name || '—'}</td>
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 font-bold">₹{(fee.total_amount || fee.amount || 0).toLocaleString('en-IN')}</td>
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                        {fee.due_date ? new Date(fee.due_date).toLocaleDateString('en-IN') : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                        <span className={`${statusBadge(deriveStatus(fee))} capitalize`}>
                                            {deriveStatus(fee)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 capitalize">{fee.payment_method || '—'}</td>
                                    <td className="px-4 py-3 text-right">
                                        {fee.status !== 'paid' && (
                                            <button
                                                onClick={() => { setSelectedFee(fee); setPayAmount(String(fee.due_amount || fee.total_amount || fee.amount || '')); setIsPayModalOpen(true); }}
                                                className="text-xs bg-[var(--brand)] hover:opacity-90 text-white px-3 py-1.5 rounded-lg font-semibold transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                {t('Record Cash', 'பணம் பதிவு செய்')}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                )}
            </div>

            {/* Delay Action Modal */}
            {delayAction && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-700">
                            <h2 className="text-base font-bold text-slate-900 dark:text-white capitalize">{delayAction.action === 'approve' ? t('Approve', 'அனுமதி') : t('Reject', 'நிராகரி')} {t('Delay Request', 'தாமத கோரிக்கை')}</h2>
                            <button onClick={() => setDelayAction(null)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-400"><X className="w-4 h-4" /></button>
                        </div>
                        <form onSubmit={handleDelayAction} className="p-5 space-y-4">
                            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 text-sm">
                                <p className="font-semibold text-slate-800 dark:text-white">{delayAction.req.fee?.student?.name}</p>
                                <p className="text-slate-500 dark:text-slate-400 text-xs">₹{(delayAction.req.fee?.total_amount || 0).toLocaleString('en-IN')}</p>
                            </div>
                            {delayAction.action === 'approve' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('New Due Date', 'புதிய செலுத்த வேண்டிய தேதி')}</label>
                                    <input type="date" value={delayActionDate} onChange={e => setDelayActionDate(e.target.value)} required className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[var(--brand)]" />
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('Admin Note', 'நிர்வாக குறிப்பு')} <span className="text-slate-400 font-normal">({t('optional', 'விருப்பத்தேர்வு')})</span></label>
                                <input type="text" value={delayActionNote} onChange={e => setDelayActionNote(e.target.value)} placeholder={t('Optional note to parent...', 'பெற்றோருக்கு குறிப்பு (விருப்பத்தேர்வு)...')} className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[var(--brand)]" />
                            </div>
                            <div className="flex gap-3 pt-1">
                                <button type="button" onClick={() => setDelayAction(null)} className="flex-1 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl py-2.5 text-sm font-semibold">{t('Cancel', 'ரத்து செய்')}</button>
                                <button type="submit" disabled={delayActionLoading} className={`flex-1 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50 transition-all ${delayAction.action === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>
                                    {delayActionLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : `${t('Confirm', 'உறுதிப்படுத்து')} ${delayAction.action === 'approve' ? t('Approve', 'அனுமதி') : t('Reject', 'நிராகரி')}`}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            {isPayModalOpen && selectedFee && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('Record Cash Payment', 'பண கொடுப்பனவு பதிவு செய்')}</h2>
                            <button onClick={() => setIsPayModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-400 transition-all"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl text-sm">
                                <p className="text-slate-500 dark:text-slate-400">{t('Student', 'மாணவர்')}</p>
                                <p className="font-bold text-slate-800 dark:text-white">{selectedFee.student?.name}</p>
                            </div>
                            <form onSubmit={handleRecordPayment} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('Amount (₹)', 'தொகை (₹)')}</label>
                                    <div className="relative">
                                        <IndianRupee className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input required type="number" step="0.01" className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 pl-9 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors" value={payAmount} onChange={e => setPayAmount(e.target.value)} />
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setIsPayModalOpen(false)} className="flex-1 flex items-center gap-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-4 py-2.5 font-semibold text-sm justify-center">{t('Cancel', 'ரத்து செய்')}</button>
                                    <button type="submit" disabled={isSubmitting} className="flex-1 flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95 justify-center disabled:opacity-60">
                                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('Confirm Payment', 'கொடுப்பனவை உறுதிப்படுத்து')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
