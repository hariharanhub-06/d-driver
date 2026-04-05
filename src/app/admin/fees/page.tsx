'use client';

import { useState } from 'react';
import { IndianRupee, AlertCircle, CheckCircle2, Plus, X, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const feeData = [
    { month: 'Jan', collected: 45000, pending: 12000 },
    { month: 'Feb', collected: 52000, pending: 8000 },
    { month: 'Mar', collected: 48000, pending: 15000 },
    { month: 'Apr', collected: 61000, pending: 4000 },
];

export default function FeesPage() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('overview');
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [paymentData, setPaymentData] = useState({ student_id: '', amount: '', fee_id: '' });
    const [feeDataInput, setFeeDataInput] = useState({ student_id: '', total_amount: '', due_date: '' });

    const handleRecordPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await api.post('/payments', paymentData);
            setIsPaymentModalOpen(false);
            setPaymentData({ student_id: '', amount: '', fee_id: '' });
            alert('Payment recorded successfully!');
        } catch {
            alert('Failed to record payment.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePostFee = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await api.post('/fees', {
                ...feeDataInput,
                school_id: user?.school_id,
                due_amount: feeDataInput.total_amount
            });
            setIsFeeModalOpen(false);
            setFeeDataInput({ student_id: '', total_amount: '', due_date: '' });
            alert('Fee structure assigned successfully!');
        } catch {
            alert('Failed to post fee.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 animate-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
                <div>
                    <h1 className="display-title text-2xl md:text-3xl font-bold tracking-tight">Financial Treasury</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Financial overview, pending dues, and payment collections.</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button onClick={() => setIsFeeModalOpen(true)} className="btn-secondary flex-1 sm:flex-none text-xs py-2 px-4">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Fee
                    </button>
                    <button onClick={() => setIsPaymentModalOpen(true)} className="btn-primary flex-1 sm:flex-none text-xs py-2 px-4 shadow-primary-100">
                        <IndianRupee className="w-4 h-4 mr-2" />
                        Record Payment
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card bg-gradient-to-br from-primary-600 to-primary-800 text-white border-none p-5 shadow-lg">
                    <p className="text-primary-100 text-[10px] font-black uppercase tracking-widest">Total Collected (YTD)</p>
                    <h3 className="text-3xl font-black mt-2 leading-none">₹4,25,000</h3>
                    <div className="mt-4 text-[10px] text-primary-200 font-bold flex items-center">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                        +12% from last year
                    </div>
                </div>
                <div className="card p-5">
                    <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">Pending Dues</p>
                    <h3 className="text-3xl font-black mt-2 leading-none text-orange-600 dark:text-orange-400">₹38,500</h3>
                    <div className="mt-4 text-[10px] text-slate-500 font-bold flex items-center">
                        <AlertCircle className="w-3.5 h-3.5 mr-1.5 text-orange-500" />
                        142 students pending
                    </div>
                </div>
                <div className="card p-5">
                    <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">Overdue (30+ Days)</p>
                    <h3 className="text-3xl font-black mt-2 leading-none text-red-600 dark:text-red-400">₹12,400</h3>
                    <div className="mt-4 text-[10px] text-slate-500 font-bold flex items-center">
                        <AlertCircle className="w-3.5 h-3.5 mr-1.5 text-red-500" />
                        Immediate action required
                    </div>
                </div>
            </div>

            <div className="card p-0 overflow-hidden border-none shadow-xl">
                <div className="border-b border-border bg-slate-50/50 dark:bg-slate-800/50 p-1.5 flex gap-1.5">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-3 py-1.5 text-[11px] font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === 'overview' ? 'bg-white dark:bg-slate-900 shadow-sm text-primary-600 dark:text-primary-400' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}
                    >
                        Collection Trends
                    </button>
                    <button
                        onClick={() => setActiveTab('students')}
                        className={`px-3 py-1.5 text-[11px] font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === 'students' ? 'bg-white dark:bg-slate-900 shadow-sm text-primary-600 dark:text-primary-400' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}
                    >
                        Student Directory
                    </button>
                </div>

                <div className="p-6">
                    {activeTab === 'overview' ? (
                        <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={feeData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} fontSize={10} fontWeight="bold" />
                                    <YAxis axisLine={false} tickLine={false} tickFormatter={(val: number) => `₹${val / 1000}k`} fontSize={10} fontWeight="bold" />
                                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                    <Bar dataKey="collected" name="Collected" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="pending" name="Pending" fill="#f97316" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="text-center py-12 text-[10px] text-slate-400 font-bold uppercase tracking-widest">Student fee grid component loads here...</div>
                    )}
                </div>
            </div>

            {isPaymentModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="modal-container-compact">
                        <div className="px-6 pt-6 pb-0 flex items-center justify-between mb-4">
                            <h2 className="text-lg font-black text-slate-900 dark:text-white leading-none">Record Payment</h2>
                            <button onClick={() => setIsPaymentModalOpen(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400"><X size={16} /></button>
                        </div>
                        <form onSubmit={handleRecordPayment} className="px-6 pb-6 space-y-3.5">
                            <div>
                                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Student Record ID</label>
                                <input required type="text" placeholder="e.g. 64b..." className="input-field" value={paymentData.student_id} onChange={e => setPaymentData({ ...paymentData, student_id: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Amount Collected</label>
                                <div className="relative">
                                    <IndianRupee className="w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input required type="number" placeholder="0.00" className="input-field pl-8" value={paymentData.amount} onChange={e => setPaymentData({ ...paymentData, amount: e.target.value })} />
                                </div>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="flex-1 py-2.5 border border-border rounded-xl font-bold hover:bg-slate-50 transition-colors text-xs">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 text-xs py-2.5 shadow-primary-100">
                                    {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : 'Record Payment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isFeeModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="modal-container-compact">
                        <div className="px-6 pt-6 pb-0 flex items-center justify-between mb-4">
                            <h2 className="text-lg font-black text-slate-900 dark:text-white leading-none">Assign Fee</h2>
                            <button onClick={() => setIsFeeModalOpen(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400"><X size={16} /></button>
                        </div>
                        <form onSubmit={handlePostFee} className="px-6 pb-6 space-y-3.5">
                            <div>
                                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Student Record ID</label>
                                <input required type="text" className="input-field" value={feeDataInput.student_id} onChange={e => setFeeDataInput({ ...feeDataInput, student_id: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Annual Total Amount</label>
                                <input required type="number" className="input-field" value={feeDataInput.total_amount} onChange={e => setFeeDataInput({ ...feeDataInput, total_amount: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Due Date</label>
                                <input required type="date" className="input-field" value={feeDataInput.due_date} onChange={e => setFeeDataInput({ ...feeDataInput, due_date: e.target.value })} />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsFeeModalOpen(false)} className="flex-1 py-2.5 border border-border rounded-xl font-bold hover:bg-slate-50 transition-colors text-xs">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 text-xs py-2.5 bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200">
                                    {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : 'Confirm Assignment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
