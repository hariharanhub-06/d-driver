'use client';

import { Users, Bus, Map as MapIcon, IndianRupee } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
    { name: 'Mon', revenue: 4000 },
    { name: 'Tue', revenue: 3000 },
    { name: 'Wed', revenue: 2000 },
    { name: 'Thu', revenue: 2780 },
    { name: 'Fri', revenue: 1890 },
];

export default function Dashboard() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold tracking-tight">Overview Dashboard</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="card flex items-center">
                    <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-4 shrink-0">
                        <Users className="w-6 h-6 text-blue-600 dark:text-blue-300" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Students</p>
                        <h3 className="text-2xl font-bold">1,248</h3>
                    </div>
                </div>

                <div className="card flex items-center">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center mr-4 shrink-0">
                        <Bus className="w-6 h-6 text-emerald-600 dark:text-emerald-300" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Active Buses</p>
                        <h3 className="text-2xl font-bold">42</h3>
                    </div>
                </div>

                <div className="card flex items-center">
                    <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center mr-4 shrink-0">
                        <MapIcon className="w-6 h-6 text-orange-600 dark:text-orange-300" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Trips Today</p>
                        <h3 className="text-2xl font-bold">84</h3>
                    </div>
                </div>

                <div className="card flex-col items-start p-6">
                    <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4">
                        <IndianRupee className="w-6 h-6 text-purple-600 dark:text-purple-300" />
                    </div>
                    <p className="text-slate-500 text-sm font-medium">Revenue (MTD)</p>
                    <h3 className="text-2xl font-bold">₹1,24,500</h3>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                <div className="card lg:col-span-2">
                    <h3 className="font-bold text-lg mb-4">Revenue Trend</h3>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip cursor={{ fill: 'transparent' }} />
                                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="card">
                    <h3 className="font-bold text-lg mb-4">Urgent Alerts</h3>
                    <ul className="space-y-4">
                        <li className="flex items-start">
                            <span className="w-2 h-2 rounded-full bg-red-500 mt-2 mr-3 border-2 border-red-200 shrink-0"></span>
                            <div>
                                <p className="text-sm font-semibold">Bus 12 Offline</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">GPS signal lost 5 mins ago</p>
                            </div>
                        </li>
                        <li className="flex items-start">
                            <span className="w-2 h-2 rounded-full bg-orange-500 mt-2 mr-3 border-2 border-orange-200 shrink-0"></span>
                            <div>
                                <p className="text-sm font-semibold">Driver Delay</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Route A is running 15 mins late</p>
                            </div>
                        </li>
                        <li className="flex items-start">
                            <span className="w-2 h-2 rounded-full bg-blue-500 mt-2 mr-3 border-2 border-blue-200 shrink-0"></span>
                            <div>
                                <p className="text-sm font-semibold">Maintenance Due</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Bus 4 requires scheduled oil change</p>
                            </div>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
