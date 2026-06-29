'use client';

import { useState, useEffect } from 'react';
import { CreditCard, CheckCircle2, AlertCircle, Clock, IndianRupee, Calendar, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { useT } from '@/lib/i18n';

interface Fee {
    id: string;
    amount: number;
    student_name?: string;
    due_date?: string;
    paid_date?: string;
    status: 'pending' | 'paid' | 'overdue';
    description?: string;
    order_id?: string;
    source?: 'school' | 'individual';
}

interface SchoolConfig {
    razorpay_configured?: boolean;
    razorpay_key_id?: string;
}

type Tab = 'pending' | 'paid';

const todayStr = () => new Date().toLocaleDateString('en-CA');
function addDays(n: number) {
    const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA');
}

const loadRazorpay = (): Promise<boolean> =>
    new Promise(resolve => {
        if ((window as any).Razorpay) { resolve(true); return; }
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });

export default function ParentFees() {
    const t = useT();
    const [fees, setFees] = useState<Fee[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [permissionDenied, setPermissionDenied] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('pending');
    const [schoolConfig, setSchoolConfig] = useState<SchoolConfig>({});
    const [payingId, setPayingId] = useState<string | null>(null);
    const [delayModal, setDelayModal] = useState<Fee | null>(null);
    const [delayDate, setDelayDate] = useState('');
    const [delayReason, setDelayReason] = useState('');
    const [delaySubmitting, setDelaySubmitting] = useState(false);
    const [delaySuccess, setDelaySuccess] = useState<string | null>(null);

    useEffect(() => {
        fetchFees();
        fetchSchoolConfig();
    }, []);

    const fetchFees = async () => {
        setLoading(true);
        try {
            // School fees (fee_management gated) + individual super-admin charges, merged.
            const [feesRes, indivRes] = await Promise.allSettled([
                api.get('/finance/my-fees'),
                api.get('/billing/my-student-invoices'),
            ]);

            const schoolFees: Fee[] = feesRes.status === 'fulfilled' && Array.isArray(feesRes.value.data)
                ? feesRes.value.data.map((f: any) => ({ ...f, source: 'school' as const }))
                : [];
            const individual: Fee[] = indivRes.status === 'fulfilled' && Array.isArray(indivRes.value.data)
                ? indivRes.value.data.map((inv: any) => ({
                    id: `si_${inv.id}`,
                    amount: inv.total_amount,
                    student_name: inv.student?.name,
                    due_date: inv.due_date,
                    paid_date: inv.paid_at,
                    status: (inv.status === 'paid' ? 'paid' : inv.status === 'overdue' ? 'overdue' : 'pending') as Fee['status'],
                    description: 'Super Admin Charge',
                    source: 'individual' as const,
                }))
                : [];
            // Only block on the school-fee 403 if there are no individual charges to show.
            const feesForbidden = feesRes.status === 'rejected' && (feesRes.reason as any)?.response?.status === 403;
            if (feesForbidden && individual.length === 0) setPermissionDenied(true);
            setFees([...schoolFees, ...individual]);
        } catch {
            setError('Failed to load fees');
        } finally {
            setLoading(false);
        }
    };

    const fetchSchoolConfig = async () => {
        try {
            const res = await api.get('/schools/branding');
            setSchoolConfig({
                razorpay_configured: res.data?.razorpay_configured ?? false,
                razorpay_key_id: res.data?.razorpay_key_id,
            });
        } catch { /* silently ignore */ }
    };

    const getDaysOverdue = (dueDate?: string) => {
        if (!dueDate) return 0;
        const diff = Date.now() - new Date(dueDate).getTime();
        return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
    };

    const handlePayOnline = async (fee: Fee) => {
        if (!schoolConfig.razorpay_key_id) {
            alert('Online payment is not configured for your school.');
            return;
        }
        setPayingId(fee.id);
        try {
            const loaded = await loadRazorpay();
            if (!loaded) { alert('Failed to load payment gateway.'); return; }

            const orderRes = await api.post('/finance/payment/create-order', { fee_id: fee.id });
            const { order_id, amount, currency = 'INR' } = orderRes.data || {};
            if (!order_id) { alert('Failed to create payment order. Please try again.'); return; }

            const options = {
                key: schoolConfig.razorpay_key_id,
                amount,
                currency,
                order_id,
                name: 'Onlive Transport Fees',
                description: fee.description || `Fee payment`,
                handler: async (response: any) => {
                    try {
                        await api.post('/finance/payment/verify', response);
                        alert('Payment successful!');
                        fetchFees();
                    } catch {
                        alert('Payment verification failed. Please contact support.');
                    }
                },
                prefill: {},
                theme: { color: 'var(--brand)' },
            };
            new (window as any).Razorpay(options).open();
        } catch (e: any) {
            alert(e.response?.data?.message || 'Failed to initiate payment');
        } finally {
            setPayingId(null);
        }
    };

    const openDelayModal = (fee: Fee) => {
        setDelayModal(fee);
        setDelayDate(addDays(7));
        setDelayReason('');
        setDelaySuccess(null);
    };

    const handleDelaySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!delayModal) return;
        setDelaySubmitting(true);
        try {
            await api.post('/finance/fee-delay', {
                fee_id: delayModal.id,
                requested_date: delayDate,
                reason: delayReason || undefined,
            });
            setDelaySuccess('Delay request submitted! Admin will review and notify you.');
        } catch (err: any) {
            alert(err?.response?.data?.error || 'Failed to submit delay request');
        } finally { setDelaySubmitting(false); }
    };

    const filtered = fees.filter(f =>
        activeTab === 'pending' ? f.status === 'pending' || f.status === 'overdue' : f.status === 'paid'
    );

    const pendingTotal = fees
        .filter(f => f.status === 'pending' || f.status === 'overdue')
        .reduce((sum, f) => sum + f.amount, 0);

    return (
        <>
        <div className="space-y-4 p-4">
            {/* Header */}
            <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('Fee Management', 'கட்டண நிர்வாகம்')}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{t("Track and pay your children's transport fees", 'உங்கள் குழந்தைகளின் போக்குவரத்து கட்டணங்களை கண்காணி')}</p>
            </div>

            {/* Pending total hero */}
            {pendingTotal > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('Total Due', 'மொத்த நிலுவை')}</span>
                        </div>
                        <span className="text-xl font-bold text-amber-600 dark:text-amber-400">₹{pendingTotal.toLocaleString('en-IN')}</span>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                {(['pending', 'paid'] as Tab[]).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                            'flex-1 py-2.5 text-xs font-semibold rounded-xl transition-all capitalize',
                            activeTab === tab
                                ? 'bg-white dark:bg-slate-700 text-[var(--brand)] shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                        )}
                    >
                        {tab === 'paid' ? t('Paid', 'செலுத்தப்பட்டது') : t('Pending', 'நிலுவையில்')}
                    </button>
                ))}
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
                </div>
            ) : permissionDenied ? (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl p-6 text-center">
                    <CreditCard className="w-10 h-10 text-amber-400 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">{t('Fee management is not enabled for your school.', 'உங்கள் பள்ளிக்கு கட்டண நிர்வாகம் இயக்கப்படவில்லை.')}</p>
                    <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">{t('Please contact your school administrator.', 'உங்கள் பள்ளி நிர்வாகியை தொடர்பு கொள்ளுங்கள்.')}</p>
                </div>
            ) : error ? (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-2xl p-5 text-sm font-semibold text-center flex flex-col items-center gap-3">
                    <span>{error}</span>
                    <button onClick={fetchFees} className="text-xs font-medium underline hover:no-underline">{t('Try Again', 'மீண்டும் முயற்சி')}</button>
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16">
                    <IndianRupee className="w-10 h-10 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t('No fees in this category', 'இந்த பிரிவில் கட்டணங்கள் இல்லை')}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(fee => {
                        const daysOverdue = getDaysOverdue(fee.due_date);
                        const isPaid = fee.status === 'paid';
                        const isOverdue = fee.status === 'overdue' || (fee.status === 'pending' && daysOverdue > 0);

                        return (
                            <div
                                key={fee.id}
                                className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="font-bold text-slate-800 dark:text-white text-base">
                                                {fee.source === 'individual' ? t('Super Admin Charge', 'நிர்வாக கட்டணம்') : (fee.description || t('Transport Fee', 'போக்குவரத்து கட்டணம்'))}
                                            </h3>
                                            {fee.source === 'individual' && (
                                                <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[var(--accent)]/15 text-[var(--accent)]">{t('Platform', 'தளம்')}</span>
                                            )}
                                        </div>
                                        {fee.student_name && (
                                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">{fee.student_name}</p>
                                        )}
                                    </div>
                                    <span className="text-xl font-bold text-slate-900 dark:text-white">
                                        ₹{fee.amount.toLocaleString('en-IN')}
                                    </span>
                                </div>

                                {isPaid ? (
                                    <div className="flex items-center gap-2 text-xs font-medium">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        <span className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full px-2.5 py-0.5 text-xs font-medium">
                                            {t('Paid', 'செலுத்தப்பட்டது')}{fee.paid_date ? ` on ${new Date(fee.paid_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
                                        </span>
                                    </div>
                                ) : (
                                    <>
                                        {fee.due_date && (
                                            <div className={cn(
                                                'flex items-center gap-2 text-xs font-medium mb-4 p-3 rounded-xl',
                                                isOverdue
                                                    ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                                                    : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                                            )}>
                                                <Clock className="w-3.5 h-3.5 shrink-0" />
                                                {isOverdue
                                                    ? `${daysOverdue} ${t('day', 'நாள்')}${daysOverdue > 1 ? 's' : ''} ${t('overdue', 'தாமதமானது')}`
                                                    : `${t('Due by', 'கட்டண தேதி')} ${new Date(fee.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
                                                }
                                            </div>
                                        )}
                                        <div className="flex gap-2">
                                            {fee.source === 'individual' && (
                                                <div className="flex-1 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/40 rounded-xl px-3 py-2.5">
                                                    {t('Payable to the platform — your school admin will collect this.', 'தளத்திற்கு செலுத்த வேண்டியது — உங்கள் பள்ளி நிர்வாகி வசூலிப்பார்.')}
                                                </div>
                                            )}
                                            {schoolConfig.razorpay_configured && fee.source !== 'individual' && (
                                                <button
                                                    onClick={() => handlePayOnline(fee)}
                                                    disabled={payingId === fee.id}
                                                    className="flex-1 flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95 justify-center disabled:opacity-60"
                                                >
                                                    {payingId === fee.id ? (
                                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                    ) : (
                                                        <><CreditCard className="w-4 h-4" /> {t('Pay Now', 'இப்போது செலுத்து')}</>
                                                    )}
                                                </button>
                                            )}
                                            {fee.source !== 'individual' && (
                                                <button
                                                    onClick={() => openDelayModal(fee)}
                                                    className="flex items-center gap-1.5 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                                >
                                                    <Calendar className="w-3.5 h-3.5" /> {t('Delay', 'தாமதம்')}
                                                </button>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>

            {/* Delay Request Modal */}
            {delayModal && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={(e) => { if (e.target === e.currentTarget) { setDelayModal(null); } }}>
                    <div className="bg-white dark:bg-slate-800 rounded-t-3xl w-full max-w-lg p-6 pb-8 shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('Request Payment Delay', 'கட்டண தாமதம் கோரு')}</h3>
                            <button onClick={() => setDelayModal(null)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {delaySuccess ? (
                            <div className="flex flex-col items-center py-6 text-center">
                                <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-3" />
                                <p className="text-sm text-slate-600 dark:text-slate-300">{delaySuccess}</p>
                                <button onClick={() => setDelayModal(null)} className="mt-4 bg-[var(--brand)] text-white rounded-xl px-5 py-2.5 font-semibold text-sm">{t('Done', 'முடிந்தது')}</button>
                            </div>
                        ) : (
                            <form onSubmit={handleDelaySubmit} className="space-y-4">
                                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3">
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{t('Fee', 'கட்டணம்')}</p>
                                    <p className="font-bold text-slate-900 dark:text-white text-sm mt-0.5">{delayModal.description || t('Transport Fee', 'போக்குவரத்து கட்டணம்')}</p>
                                    {delayModal.student_name && <p className="text-xs text-slate-400 mt-0.5">{delayModal.student_name}</p>}
                                    <p className="text-base font-black text-[var(--brand)] mt-1">₹{delayModal.amount.toLocaleString('en-IN')}</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">{t('New Requested Date', 'புதிய கோரிய தேதி')}</label>
                                    <input type="date" value={delayDate} min={addDays(1)} onChange={e => setDelayDate(e.target.value)} required className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[var(--brand)]" />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">{t('Reason', 'காரணம்')} <span className="font-normal text-slate-400">({t('optional', 'விருப்பமானது')})</span></label>
                                    <textarea value={delayReason} onChange={e => setDelayReason(e.target.value)} rows={3} required placeholder="e.g. Salary delayed this month..." className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] resize-none" />
                                </div>

                                <button type="submit" disabled={delaySubmitting || !delayReason.trim() || !delayDate} className="w-full bg-[var(--brand)] text-white rounded-2xl py-3 font-semibold text-sm disabled:opacity-50 active:scale-95 transition-all">
                                    {delaySubmitting ? t('Submitting...', 'சமர்ப்பிக்கிறது...') : t('Submit Request', 'கோரிக்கை சமர்ப்பி')}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
