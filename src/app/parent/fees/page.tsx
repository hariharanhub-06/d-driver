'use client';

import { useState, useEffect } from 'react';
import { CreditCard, CheckCircle2, AlertCircle, Clock, Loader2, IndianRupee } from 'lucide-react';
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
            setError('Failed to load fees');
        } finally {
            setLoading(false);
        }
    };

    const fetchSchoolConfig = async () => {
        try {
            const res = await api.get('/schools/my-school');
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
            const { order_id, amount, currency = 'INR' } = orderRes.data;

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
                theme: { color: '#2dbc75' },
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
        <div className="min-h-full bg-slate-50 dark:bg-slate-950 pb-8">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 px-5 pt-6 pb-5 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">Fee Management</h2>
                <p className="text-slate-400 text-sm mt-1">Track and pay your children's transport fees</p>

                {pendingTotal > 0 && (
                    <div className="mt-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 rounded-2xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-orange-500 shrink-0" />
                            <span className="text-sm font-bold text-orange-700 dark:text-orange-300">Total due</span>
                        </div>
                        <span className="text-xl font-black text-orange-600 dark:text-orange-400">₹{pendingTotal.toLocaleString('en-IN')}</span>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="px-4 pt-4">
                <div className="flex p-1 bg-slate-200/60 dark:bg-slate-800 rounded-2xl">
                    {(['pending', 'paid', 'all'] as Tab[]).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                                'flex-1 py-2.5 text-xs font-bold rounded-xl transition-all capitalize',
                                activeTab === tab
                                    ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                            )}
                        >
                            {tab === 'all' ? 'All' : tab === 'paid' ? 'Paid' : 'Pending'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="px-4 pt-4 space-y-4">
                {loading ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                    </div>
                ) : error ? (
                    <div className="bg-red-50 border border-red-100 text-red-600 rounded-2xl p-5 text-sm font-bold text-center">{error}</div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16">
                        <IndianRupee className="w-10 h-10 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
                        <p className="text-slate-400 font-bold text-sm">No fees in this category</p>
                    </div>
                ) : (
                    filtered.map(fee => {
                        const daysOverdue = getDaysOverdue(fee.due_date);
                        const isPaid = fee.status === 'paid';
                        const isOverdue = fee.status === 'overdue' || (fee.status === 'pending' && daysOverdue > 0);

                        return (
                            <div
                                key={fee.id}
                                className={cn(
                                    'bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border',
                                    isPaid ? 'border-slate-100 dark:border-slate-700' :
                                    isOverdue ? 'border-red-100 dark:border-red-900/30' :
                                    'border-primary-100 dark:border-primary-900/20'
                                )}
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="font-black text-slate-800 dark:text-white text-base">
                                            {fee.description || 'Transport Fee'}
                                        </h3>
                                        {fee.student_name && (
                                            <p className="text-xs text-slate-400 font-medium mt-0.5">{fee.student_name}</p>
                                        )}
                                    </div>
                                    <span className="text-2xl font-black text-slate-900 dark:text-white">
                                        ₹{fee.amount.toLocaleString('en-IN')}
                                    </span>
                                </div>

                                {isPaid ? (
                                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                                        <CheckCircle2 className="w-4 h-4" />
                                        Paid{fee.paid_date ? ` on ${new Date(fee.paid_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
                                    </div>
                                ) : (
                                    <>
                                        {fee.due_date && (
                                            <div className={cn(
                                                'flex items-center gap-2 text-xs font-bold mb-4 p-3 rounded-xl',
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
                                                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-black py-3.5 rounded-xl shadow-lg shadow-primary-600/20 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-60"
                                            >
                                                {payingId === fee.id ? (
                                                    <Loader2 className="w-5 h-5 animate-spin" />
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
                    })
                )}
            </div>
        </div>
    );
}
