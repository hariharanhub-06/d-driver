'use client';

import { useState, useEffect } from 'react';
import { CreditCard, CheckCircle2, AlertCircle, Clock, IndianRupee } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface Fee {
    id: string;
    amount: number;
    student_name?: string;
    due_date?: string;
    paid_date?: string;
    status: 'pending' | 'paid' | 'overdue';
    description?: string;
    order_id?: string;
}

interface SchoolConfig {
    razorpay_configured?: boolean;
    razorpay_key_id?: string;
}

type Tab = 'pending' | 'paid' | 'all';

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
    const [fees, setFees] = useState<Fee[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [permissionDenied, setPermissionDenied] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('pending');
    const [schoolConfig, setSchoolConfig] = useState<SchoolConfig>({});
    const [payingId, setPayingId] = useState<string | null>(null);

    useEffect(() => {
        fetchFees();
        fetchSchoolConfig();
    }, []);

    const fetchFees = async () => {
        setLoading(true);
        try {
            const res = await api.get('/finance/my-fees');
            setFees(Array.isArray(res.data) ? res.data : []);
        } catch (e: any) {
            if (e.response?.status === 403) {
                setPermissionDenied(true);
            } else {
                setError('Failed to load fees');
            }
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
                name: 'D-Driver Transport Fees',
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

    const filtered = fees.filter(f => {
        if (activeTab === 'all') return true;
        if (activeTab === 'pending') return f.status === 'pending' || f.status === 'overdue';
        return f.status === 'paid';
    });

    const pendingTotal = fees
        .filter(f => f.status === 'pending' || f.status === 'overdue')
        .reduce((sum, f) => sum + f.amount, 0);

    return (
        <div className="space-y-4 p-4">
            {/* Header */}
            <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Fee Management</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Track and pay your children's transport fees</p>
            </div>

            {/* Pending total hero */}
            {pendingTotal > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Total due</span>
                        </div>
                        <span className="text-xl font-bold text-amber-600 dark:text-amber-400">₹{pendingTotal.toLocaleString('en-IN')}</span>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                {(['pending', 'paid', 'all'] as Tab[]).map(tab => (
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
                        {tab === 'all' ? 'All' : tab === 'paid' ? 'Paid' : 'Pending'}
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
                    <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Fee management is not enabled for your school.</p>
                    <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">Please contact your school administrator.</p>
                </div>
            ) : error ? (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-2xl p-5 text-sm font-semibold text-center flex flex-col items-center gap-3">
                    <span>{error}</span>
                    <button onClick={fetchFees} className="text-xs font-medium underline hover:no-underline">Try Again</button>
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16">
                    <IndianRupee className="w-10 h-10 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">No fees in this category</p>
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
                                        <h3 className="font-bold text-slate-800 dark:text-white text-base">
                                            {fee.description || 'Transport Fee'}
                                        </h3>
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
                                            Paid{fee.paid_date ? ` on ${new Date(fee.paid_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
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
                                                    ? `${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue`
                                                    : `Due by ${new Date(fee.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
                                                }
                                            </div>
                                        )}
                                        {schoolConfig.razorpay_configured && (
                                            <button
                                                onClick={() => handlePayOnline(fee)}
                                                disabled={payingId === fee.id}
                                                className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95 w-full justify-center disabled:opacity-60"
                                            >
                                                {payingId === fee.id ? (
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <>
                                                        <CreditCard className="w-4 h-4" />
                                                        Pay Online
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
