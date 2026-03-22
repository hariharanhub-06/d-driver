'use client';

import { useState } from 'react';
import { CreditCard, History, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ParentFees() {
    const [activeTab, setActiveTab] = useState('pending');

    const pendingFees = [
        { id: '1', month: 'March 2024', amount: 1500, due: 'Mar 31', status: 'pending' },
    ];

    const history = [
        { id: '2', month: 'February 2024', amount: 1500, date: 'Feb 05', status: 'paid' },
        { id: '3', month: 'January 2024', amount: 1500, date: 'Jan 07', status: 'paid' },
    ];

    return (
        <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-950 min-h-full">
            <div className="mb-6 mt-2 text-center sm:text-left">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">Fee Management</h2>
                <p className="text-slate-500 text-sm">Track and pay your children's transport fees.</p>
            </div>

            <div className="flex p-1 bg-slate-200/50 dark:bg-slate-800 rounded-xl mb-6">
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'pending' ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-slate-500'}`}
                >
                    Pending
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'history' ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-slate-500'}`}
                >
                    Paid History
                </button>
            </div>

            <div className="space-y-4">
                {activeTab === 'pending' ? (
                    pendingFees.map(fee => (
                        <div key={fee.id} className="bg-white dark:bg-slate-800 border-2 border-primary-100 dark:border-primary-900/30 rounded-2xl p-5 shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-lg">{fee.month}</h3>
                                    <p className="text-xs text-slate-400">Due by {fee.due}</p>
                                </div>
                                <span className="text-2xl font-black text-slate-800 dark:text-white">₹{fee.amount}</span>
                            </div>
                            <div className="bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 p-3 rounded-lg text-xs flex items-center mb-6">
                                <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
                                Unpaid for 12 days. Please pay before month end.
                            </div>
                            <button className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-primary-600/20 flex items-center justify-center">
                                <CreditCard className="w-5 h-5 mr-2" /> Pay Now
                            </button>
                        </div>
                    ))
                ) : (
                    history.map(fee => (
                        <div key={fee.id} className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-5 shadow-sm flex items-center justify-between">
                            <div className="flex items-center">
                                <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-full flex items-center justify-center mr-4">
                                    <CheckCircle2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800 dark:text-white">{fee.month}</h4>
                                    <p className="text-xs text-slate-400">Paid on {fee.date}</p>
                                </div>
                            </div>
                            <span className="font-bold text-slate-600 dark:text-slate-300">₹{fee.amount}</span>
                        </div>
                    ))
                )}
            </div>

            <div className="mt-8 p-5 bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl text-white">
                <div className="flex items-center mb-2">
                    <History className="w-4 h-4 mr-2 text-primary-400" />
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Auto-Pay</span>
                </div>
                <p className="text-sm font-medium mb-3">Never miss a payment!</p>
                <button className="text-xs font-bold bg-white/10 hover:bg-white/20 py-2 px-4 rounded-lg transition-colors border border-white/10">
                    Enable Auto-Debit
                </button>
            </div>
        </div>
    );
}
