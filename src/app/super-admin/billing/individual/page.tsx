'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, Loader2, GraduationCap, IndianRupee, Check, FileText, CreditCard, RefreshCw, Trash2, Undo2 } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n';
import { loadRazorpay, confirmLivePayment } from '@/lib/razorpay';

interface Plan { id: string; name: string; plan_type?: string; }
interface StudentResult {
    id: string;
    name: string;
    grade?: string;
    school?: { id: string; name: string };
    parent?: { id: string; name: string; email?: string; phone?: string };
    individualPlan?: { id: string; name: string } | null;
}
interface StudentInvoice {
    id: string;
    billing_month: string;
    total_amount: number;
    status: string;
    paid_at?: string;
    payment_method?: string;
    razorpay_payment_id?: string;
    student?: { id: string; name: string; school?: { name: string }; parent?: { name: string; phone?: string } };
}

const inputCls = "w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors";

export default function IndividualBillingPage() {
    const t = useT();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [invoices, setInvoices] = useState<StudentInvoice[]>([]);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<StudentResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState('');
    const [busyStudent, setBusyStudent] = useState<string | null>(null);
    const [payingId, setPayingId] = useState<string | null>(null);
    const [genAll, setGenAll] = useState(false);
    const [cycleDays, setCycleDays] = useState('');
    const [savingCycle, setSavingCycle] = useState(false);

    useEffect(() => {
        api.get('/billing/plans').then(r => setPlans(Array.isArray(r.data) ? r.data : [])).catch(() => {});
        api.get('/billing/config').then(r => setCycleDays(r.data?.individual_billing_days ? String(r.data.individual_billing_days) : '')).catch(() => {});
        refreshInvoices();
    }, []);

    const saveCycle = async () => {
        const d = parseInt(cycleDays, 10);
        if (!Number.isFinite(d) || d <= 0) return;
        setSavingCycle(true);
        try {
            await api.put('/billing/config', { individual_billing_days: d });
        } catch { /* ignore */ }
        finally { setSavingCycle(false); }
    };

    const refreshInvoices = () => {
        api.get('/billing/student-invoices')
            .then(r => setInvoices(Array.isArray(r.data) ? r.data : []))
            .catch(() => {});
    };

    const search = async (e?: React.FormEvent) => {
        e?.preventDefault();
        setSearchError('');
        if (!query.trim()) { setResults([]); return; }
        setSearching(true);
        try {
            const r = await api.get('/billing/students/search', { params: { q: query.trim() } });
            setResults(Array.isArray(r.data) ? r.data : []);
        } catch (err: any) {
            setResults([]);
            setSearchError(err?.response?.data?.error || 'Search failed. Please try again.');
        }
        finally { setSearching(false); }
    };

    const assignPlan = async (studentId: string, planId: string) => {
        setBusyStudent(studentId);
        try {
            await api.put(`/billing/students/${studentId}/plan`, { plan_id: planId || null });
            setResults(prev => prev.map(s => s.id === studentId
                ? { ...s, individualPlan: planId ? { id: planId, name: plans.find(p => p.id === planId)?.name || '' } : null }
                : s));
        } catch { /* ignore */ }
        finally { setBusyStudent(null); }
    };

    const generateInvoice = async (studentId: string) => {
        setBusyStudent(studentId);
        try {
            await api.post(`/billing/students/${studentId}/generate`, {});
            refreshInvoices();
        } catch (e: any) {
            alert(e.response?.data?.error || 'Failed to generate invoice');
        } finally { setBusyStudent(null); }
    };

    const generateAll = async () => {
        setGenAll(true);
        try {
            const r = await api.post('/billing/students/generate-all', {});
            refreshInvoices();
            alert(`${r.data?.generated ?? 0} / ${r.data?.total ?? 0} ${t('invoices generated', 'விலைப்பட்டியல்கள் உருவாக்கப்பட்டன')}`);
        } catch (e: any) {
            alert(e?.response?.data?.error || 'Failed to generate invoices');
        } finally { setGenAll(false); }
    };

    // Replace an existing UNPAID invoice for the same month with freshly computed figures.
    const regenerate = async (inv: StudentInvoice) => {
        if (!inv.student?.id) return;
        if (!confirm(t(
            `Regenerate the ${inv.billing_month} invoice? The current one will be replaced.`,
            `${inv.billing_month} விலைப்பட்டியலை மீண்டும் உருவாக்கவா?`
        ))) return;
        setPayingId(inv.id);
        try {
            await api.post(`/billing/students/${inv.student.id}/generate`, {
                billing_month: inv.billing_month, force: true,
            });
            refreshInvoices();
        } catch (e: any) {
            alert(e?.response?.data?.error || 'Failed to regenerate invoice');
        } finally { setPayingId(null); }
    };

    const removeInvoice = async (inv: StudentInvoice) => {
        if (!confirm(t(
            `Delete the ${inv.billing_month} invoice? This cannot be undone.`,
            `${inv.billing_month} விலைப்பட்டியலை நீக்கவா?`
        ))) return;
        setPayingId(inv.id);
        try {
            await api.delete(`/billing/student-invoices/${inv.id}`);
            refreshInvoices();
        } catch (e: any) {
            alert(e?.response?.data?.error || 'Failed to delete invoice');
        } finally { setPayingId(null); }
    };

    // Reverts a manual cash marking so the invoice can be corrected. Razorpay-paid invoices
    // are refused server-side — those must be refunded in the Razorpay dashboard.
    const undoPayment = async (inv: StudentInvoice) => {
        if (!confirm(t('Undo this cash payment and mark the invoice pending again?', 'இந்த ரொக்கக் கட்டணத்தை மீட்டமைக்கவா?'))) return;
        setPayingId(inv.id);
        try {
            await api.post(`/billing/student-invoices/${inv.id}/undo-payment`, {});
            refreshInvoices();
        } catch (e: any) {
            alert(e?.response?.data?.error || 'Failed to undo payment');
        } finally { setPayingId(null); }
    };

    const markPaid = async (invoiceId: string) => {
        setPayingId(invoiceId);
        try {
            await api.post(`/billing/student-invoices/${invoiceId}/pay-cash`, {});
            refreshInvoices();
        } catch { /* ignore */ }
        finally { setPayingId(null); }
    };

    // Collect an individual invoice online via Razorpay Checkout (platform account).
    // The backend endpoint existed but had no UI, so this flow was unreachable.
    const payOnline = async (inv: StudentInvoice) => {
        setPayingId(inv.id);
        try {
            const loaded = await loadRazorpay();
            if (!loaded) { alert('Failed to load payment gateway.'); return; }

            const { data } = await api.post(`/billing/student-invoices/${inv.id}/pay-online`, {});
            const { order, key_id } = data || {};
            if (!order?.id || !key_id) { alert('Failed to create payment order.'); return; }

            if (!confirmLivePayment(key_id, inv.total_amount)) return;

            new (window as any).Razorpay({
                key: key_id,
                amount: order.amount,
                currency: order.currency,
                name: 'Onlive Platform',
                description: `Invoice ${inv.billing_month} — ${inv.student?.name || ''}`,
                order_id: order.id,
                theme: { color: '#2563eb' },
                handler: async (response: any) => {
                    try {
                        await api.post(`/billing/student-invoices/${inv.id}/verify`, response);
                        alert('Payment successful!');
                    } catch {
                        alert('Payment received but verification failed. Do not pay again — contact support with the payment ID.');
                    }
                    refreshInvoices();
                },
            }).open();
        } catch (e: any) {
            alert(e?.response?.data?.error || 'Failed to initiate payment');
        } finally { setPayingId(null); }
    };

    // Prefer individual-type plans in the picker, but keep all as a fallback.
    const planOptions = plans.filter(p => p.plan_type === 'individual');
    const pickable = planOptions.length > 0 ? planOptions : plans;

    const statusCls = (s: string) =>
        s === 'paid' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
            : s === 'overdue' ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'
            : 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400';

    return (
        <div className="space-y-6 animate-in">
            {/* Header */}
            <div>
                <Link href="/super-admin/billing" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors mb-2">
                    <ArrowLeft className="w-4 h-4" /> {t('Back to Billing', 'பில்லிங்கிற்கு திரும்பு')}
                </Link>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                    <GraduationCap className="w-7 h-7 text-[var(--accent)]" />
                    {t('Individual Charging', 'தனிநபர் கட்டணம்')}
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                    {t('Search any student, assign a plan, and charge them directly.', 'எந்த மாணவரையும் தேடி, திட்டத்தை ஒதுக்கி, நேரடியாக கட்டணம் வசூலிக்கவும்.')}
                </p>
            </div>

            {/* Search */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
                <form onSubmit={search} className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder={t('Student name, parent name, email, or mobile', 'மாணவர் பெயர், பெற்றோர் பெயர், மின்னஞ்சல், அல்லது மொபைல்')}
                            className={cn(inputCls, 'pl-9')}
                        />
                    </div>
                    <button type="submit" disabled={searching} className="bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-5 py-2.5 font-semibold text-sm transition-all active:scale-95 flex items-center gap-2 disabled:opacity-60">
                        {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} {t('Search', 'தேடு')}
                    </button>
                </form>

                {/* Results */}
                {results.length > 0 && (
                    <div className="mt-4 space-y-2">
                        {results.map(s => (
                            <div key={s.id} className="flex flex-wrap items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                                <div className="flex-1 min-w-[180px]">
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{s.name}{s.grade ? ` · ${s.grade}` : ''}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {s.school?.name || '—'}{s.parent ? ` · ${s.parent.name}` : ''}{s.parent?.phone ? ` · ${s.parent.phone}` : ''}
                                    </p>
                                </div>
                                <select
                                    value={s.individualPlan?.id || ''}
                                    onChange={e => assignPlan(s.id, e.target.value)}
                                    disabled={busyStudent === s.id}
                                    className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-[var(--brand)]"
                                >
                                    <option value="">{t('No plan', 'திட்டம் இல்லை')}</option>
                                    {pickable.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                                <button
                                    onClick={() => generateInvoice(s.id)}
                                    disabled={busyStudent === s.id || !s.individualPlan}
                                    title={!s.individualPlan ? t('Assign a plan first', 'முதலில் ஒரு திட்டத்தை ஒதுக்கவும்') : ''}
                                    className="bg-[var(--accent)] hover:opacity-90 text-white rounded-xl px-4 py-2 font-semibold text-xs transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-40"
                                >
                                    {busyStudent === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                                    {t('Generate Invoice', 'விலைப்பட்டியல்')}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                {searchError && (
                    <p className="mt-4 text-sm text-red-600 dark:text-red-400 text-center py-4">{searchError}</p>
                )}
                {!searching && !searchError && query.trim() && results.length === 0 && (
                    <p className="mt-4 text-sm text-slate-500 dark:text-slate-400 text-center py-4">{t('No students found. Try the parent name, mobile number, or student name.', 'மாணவர் இல்லை. பெற்றோர் பெயர், மொபைல், அல்லது மாணவர் பெயரை முயற்சிக்கவும்.')}</p>
                )}
            </div>

            {/* Individual invoices */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-semibold text-slate-900 dark:text-white text-sm">{t('Individual Invoices', 'தனிநபர் விலைப்பட்டியல்கள்')}</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Auto-billing cadence: each student is billed every N days from their plan date. */}
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs text-slate-500 dark:text-slate-400">{t('Auto every', 'தானாக ஒவ்வொரு')}</span>
                            <input
                                type="number" min={1}
                                value={cycleDays}
                                onChange={e => setCycleDays(e.target.value)}
                                placeholder="30"
                                className="w-16 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 text-sm text-slate-900 dark:text-white outline-none focus:border-[var(--brand)]"
                            />
                            <span className="text-xs text-slate-500 dark:text-slate-400">{t('days', 'நாட்கள்')}</span>
                            <button
                                onClick={saveCycle}
                                disabled={savingCycle}
                                className="bg-slate-200 dark:bg-slate-600 hover:opacity-90 text-slate-700 dark:text-white rounded-lg px-3 py-1.5 font-semibold text-xs transition-all active:scale-95 disabled:opacity-60"
                            >
                                {savingCycle ? '…' : t('Save', 'சேமி')}
                            </button>
                        </div>
                        <button
                            onClick={generateAll}
                            disabled={genAll}
                            title={t('Generate this month for every student with a plan', 'திட்டம் உள்ள அனைத்து மாணவர்களுக்கும் உருவாக்கு')}
                            className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2 font-semibold text-xs transition-all active:scale-95 disabled:opacity-60"
                        >
                            {genAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                            {t('Generate All', 'அனைத்தும் உருவாக்கு')}
                        </button>
                    </div>
                </div>
                {invoices.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-10">{t('No individual invoices yet.', 'இன்னும் தனிநபர் விலைப்பட்டியல்கள் இல்லை.')}</p>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                        {invoices.map(inv => (
                            <div key={inv.id} className="flex flex-wrap items-center gap-3 px-6 py-3">
                                <div className="flex-1 min-w-[160px]">
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{inv.student?.name || '—'}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{inv.student?.school?.name || ''} · {inv.billing_month}</p>
                                </div>
                                <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-0.5">
                                    <IndianRupee className="w-3.5 h-3.5" />{inv.total_amount.toFixed(2)}
                                </span>
                                <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase", statusCls(inv.status))}>{inv.status}</span>
                                {/* Razorpay reference + when it was paid, for reconciliation. */}
                                {inv.paid_at && (
                                    <div className="min-w-[150px]">
                                        {inv.razorpay_payment_id ? (
                                            <button
                                                onClick={() => navigator.clipboard?.writeText(inv.razorpay_payment_id!)}
                                                title={t('Copy payment ID', 'கட்டண ஐடியை நகலெடு')}
                                                className="font-mono text-[11px] text-slate-700 dark:text-slate-200 hover:text-[var(--brand)] transition-colors block truncate max-w-[170px]"
                                            >
                                                {inv.razorpay_payment_id}
                                            </button>
                                        ) : (
                                            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 capitalize">
                                                {inv.payment_method || t('Cash', 'ரொக்கம்')}
                                            </span>
                                        )}
                                        <span className="block text-[10px] text-slate-400 dark:text-slate-500">
                                            {new Date(inv.paid_at).toLocaleString('en-IN', {
                                                day: '2-digit', month: 'short', year: 'numeric',
                                                hour: '2-digit', minute: '2-digit', hour12: true,
                                            })}
                                        </span>
                                    </div>
                                )}
                                {/* Paid via cash = a manual assertion, so it can be reverted.
                                    Razorpay-paid rows have a real payment id and are refused. */}
                                {inv.status === 'paid' && !inv.razorpay_payment_id && (
                                    <button
                                        onClick={() => undoPayment(inv)}
                                        disabled={payingId === inv.id}
                                        title={t('Undo cash payment', 'ரொக்கக் கட்டணத்தை மீட்டமை')}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all disabled:opacity-50"
                                    >
                                        {payingId === inv.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Undo2 className="w-4 h-4" />}
                                    </button>
                                )}
                                {inv.status !== 'paid' && (
                                    <>
                                        <button
                                            onClick={() => regenerate(inv)}
                                            disabled={payingId === inv.id}
                                            title={t('Regenerate with current figures', 'மீண்டும் உருவாக்கு')}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-[var(--brand)] hover:bg-[var(--brand)]/10 transition-all disabled:opacity-50"
                                        >
                                            {payingId === inv.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                        </button>
                                        <button
                                            onClick={() => removeInvoice(inv)}
                                            disabled={payingId === inv.id}
                                            title={t('Delete invoice', 'நீக்கு')}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all disabled:opacity-50"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => payOnline(inv)}
                                            disabled={payingId === inv.id}
                                            className="bg-[var(--brand)] hover:opacity-90 text-white rounded-lg px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 flex items-center gap-1 disabled:opacity-60"
                                        >
                                            {payingId === inv.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
                                            {t('Pay Online', 'ஆன்லைனில் செலுத்து')}
                                        </button>
                                        <button
                                            onClick={() => markPaid(inv.id)}
                                            disabled={payingId === inv.id}
                                            className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 flex items-center gap-1 disabled:opacity-60"
                                        >
                                            {payingId === inv.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                            {t('Mark Paid', 'செலுத்தப்பட்டது')}
                                        </button>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
