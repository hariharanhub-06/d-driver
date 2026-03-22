'use client';

import { useState, useEffect } from 'react';
import { IndianRupee, AlertCircle, CheckCircle2, Plus, Search, Filter, CreditCard, History, User, Calendar, NotebookIcon as Notebook, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '@/lib/api';
import Modal from '@/components/ui/Modal';
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
        } catch (error) {
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
        } catch (error) {
            alert('Failed to post fee.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 animate-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="display-title text-2xl md:text-3xl font-bold tracking-tight">Financial Treasury</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Financial overview, pending dues, and payment collections.</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button onClick={() => setIsFeeModalOpen(true)} className="btn-secondary flex-1 sm:flex-none">
                        <Plus className="w-5 h-5 mr-2" />
                        Add Fee
                    </button>
                    <button onClick={() => setIsPaymentModalOpen(true)} className="btn-primary flex-1 sm:flex-none">
                        <IndianRupee className="w-5 h-5 mr-2" />
                        Record Payment
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card bg-gradient-to-br from-primary-600 to-primary-800 text-white border-none">
                    <p className="text-primary-100 text-sm font-medium">Total Collected (YTD)</p>
                    <h3 className="text-3xl font-bold mt-2">₹4,25,000</h3>
                    <div className="mt-4 text-sm text-primary-200 flex items-center">
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        +12% from last year
                    </div>
                </div>
                <div className="card">
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Pending Dues</p>
                    <h3 className="text-3xl font-bold mt-2 text-orange-600 dark:text-orange-400">₹38,500</h3>
                    <div className="mt-4 text-sm text-slate-500 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1 text-orange-500" />
                        142 students pending
                    </div>
                </div>
                <div className="card">
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Overdue (30+ Days)</p>
                    <h3 className="text-3xl font-bold mt-2 text-red-600 dark:text-red-400">₹12,400</h3>
                    <div className="mt-4 text-sm text-slate-500 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1 text-red-500" />
                        Immediate action required
                    </div>
                </div>
            </div>

            <div className="card p-0 overflow-hidden">
                <div className="border-b border-[var(--border)] bg-slate-50/50 dark:bg-slate-800/50 p-2 flex gap-2">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'overview' ? 'bg-white dark:bg-slate-900 shadow-sm text-primary-600 dark:text-primary-400' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'}`}
                    >
                        Collection Trends
                    </button>
                    <button
                        onClick={() => setActiveTab('students')}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'students' ? 'bg-white dark:bg-slate-900 shadow-sm text-primary-600 dark:text-primary-400' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'}`}
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
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} />
                                    <YAxis axisLine={false} tickLine={false} tickFormatter={(val: number) => `₹${val / 1000}k`} />
                                    <Tooltip cursor={{ fill: 'transparent' }} formatter={(val: any) => `₹${val}`} />
                                    <Bar dataKey="collected" name="Collected" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="pending" name="Pending" fill="#f97316" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="text-center py-12 text-slate-500">Student fee grid component loads here...</div>
                    )}
                </div>
            </div>

            <Modal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                title="Record Student Payment"
            >
                <form onSubmit={handleRecordPayment} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 text-black">Student Record ID</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. 64b..."
                            className="input-field"
                            value={paymentData.student_id}
                            onChange={(e) => setPaymentData({ ...paymentData, student_id: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 text-black">Amount Collected</label>
                        <div className="relative">
                            <IndianRupee className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="number"
                                required
                                placeholder="0.00"
                                className="input-field pl-10"
                                value={paymentData.amount}
                                onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="pt-4 flex gap-3">
                        <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="flex-1 py-3 border border-border rounded-xl font-bold">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
                            {isSubmitting ? 'Recording...' : 'Record Payment'}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={isFeeModalOpen}
                onClose={() => setIsFeeModalOpen(false)}
                title="Assign Fee Structure"
            >
                <form onSubmit={handlePostFee} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 text-black">Student Record ID</label>
                        <input
                            type="text"
                            required
                            className="input-field"
                            value={feeDataInput.student_id}
                            onChange={(e) => setFeeDataInput({ ...feeDataInput, student_id: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 text-black">Annual Total Amount</label>
                        <input
                            type="number"
                            required
                            className="input-field"
                            value={feeDataInput.total_amount}
                            onChange={(e) => setFeeDataInput({ ...feeDataInput, total_amount: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 text-black">Due Date</label>
                        <input
                            type="date"
                            required
                            className="input-field"
                            value={feeDataInput.due_date}
                            onChange={(e) => setFeeDataInput({ ...feeDataInput, due_date: e.target.value })}
                        />
                    </div>
                    <div className="pt-4 flex gap-3">
                        <button type="button" onClick={() => setIsFeeModalOpen(false)} className="flex-1 py-3 border border-border rounded-xl font-bold">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200">
                            {isSubmitting ? 'Assigning...' : 'Confirm Assignment'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
