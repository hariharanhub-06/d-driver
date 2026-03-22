'use client';

import { useState } from 'react';
import { DollarSign, AlertCircle, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const feeData = [
    { month: 'Jan', collected: 45000, pending: 12000 },
    { month: 'Feb', collected: 52000, pending: 8000 },
    { month: 'Mar', collected: 48000, pending: 15000 },
    { month: 'Apr', collected: 61000, pending: 4000 },
];

export default function FeesPage() {
    const [activeTab, setActiveTab] = useState('overview');

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Fee Management</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Financial overview, pending dues, and payment collections.</p>
                </div>
                <button className="btn-primary">
                    <DollarSign className="w-5 h-5 mr-2" />
                    Record Payment
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card bg-gradient-to-br from-primary-600 to-primary-800 text-white border-none">
                    <p className="text-primary-100 text-sm font-medium">Total Collected (YTD)</p>
                    <h3 className="text-3xl font-bold mt-2">$425,000</h3>
                    <div className="mt-4 text-sm text-primary-200 flex items-center">
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        +12% from last year
                    </div>
                </div>
                <div className="card">
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Pending Dues</p>
                    <h3 className="text-3xl font-bold mt-2 text-orange-600 dark:text-orange-400">$38,500</h3>
                    <div className="mt-4 text-sm text-slate-500 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1 text-orange-500" />
                        142 students pending
                    </div>
                </div>
                <div className="card">
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Overdue (30+ Days)</p>
                    <h3 className="text-3xl font-bold mt-2 text-red-600 dark:text-red-400">$12,400</h3>
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
                                    <YAxis axisLine={false} tickLine={false} tickFormatter={(val: number) => `$${val / 1000}k`} />
                                    <Tooltip cursor={{ fill: 'transparent' }} formatter={(val: number) => `$${val}`} />
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
        </div>
    );
}
