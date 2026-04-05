'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Download, Filter, TrendingUp, Calendar } from 'lucide-react';

const stats = [
    { name: 'Jan', trips: 400, attendance: 95 },
    { name: 'Feb', trips: 350, attendance: 92 },
    { name: 'Mar', trips: 500, attendance: 98 },
    { name: 'Apr', trips: 480, attendance: 96 },
];

export default function ReportsPage() {
    return (
        <div className="space-y-6 animate-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
                <div>
                    <h1 className="text-2xl font-black tracking-tight leading-none text-slate-900 dark:text-white">Institutional Analytics</h1>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-2 flex items-center gap-2">
                        <TrendingUp className="w-3.5 h-3.5 text-primary-500" /> System-wide performance and logistics data.
                    </p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all text-slate-600">
                        <Filter className="w-3.5 h-3.5 mr-2" /> Filter
                    </button>
                    <button className="flex-1 sm:flex-none btn-primary text-[10px] font-black uppercase tracking-widest py-2 px-4 shadow-primary-100">
                        <Download className="w-3.5 h-3.5 mr-2" /> Export PDF
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card p-6 border-none shadow-xl">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-black text-sm uppercase tracking-widest text-slate-900 dark:text-white">Trip Completion Rate</h3>
                        <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-md">+14% Growth</span>
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                                <YAxis fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                <Bar dataKey="trips" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="card p-6 border-none shadow-xl">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-black text-sm uppercase tracking-widest text-slate-900 dark:text-white">Avg. Attendance %</h3>
                        <span className="text-[10px] font-black text-primary-500 bg-primary-50 px-2 py-0.5 rounded-md">Peak Reliability</span>
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={stats}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                                <YAxis domain={[80, 100]} fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                <Line type="monotone" dataKey="attendance" stroke="#10b981" strokeWidth={4} dot={{ fill: '#10b981', r: 4 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="card p-6 border-none shadow-xl bg-slate-900 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-black text-sm uppercase tracking-widest mb-1">Weekly Summary</h3>
                        <p className="text-[10px] text-slate-400 font-bold">Operational efficiency is at an all-time high of 94.2%.</p>
                    </div>
                    <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">View Archive</button>
                </div>
            </div>
        </div>
    );
}
