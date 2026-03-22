'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Download, Filter } from 'lucide-react';

const stats = [
    { name: 'Jan', trips: 400, attendance: 95 },
    { name: 'Feb', trips: 350, attendance: 92 },
    { name: 'Mar', trips: 500, attendance: 98 },
];

export default function ReportsPage() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Analytics & Reports</h1>
                    <p className="text-slate-500 text-sm mt-1">Institutional data analysis and export center.</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 group">
                        <Filter className="w-4 h-4 mr-2 text-slate-400 group-hover:text-primary-500" /> Filter
                    </button>
                    <button className="btn-primary">
                        <Download className="w-4 h-4 mr-2" /> Export PDF
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card">
                    <h3 className="font-bold mb-4">Trip Completion Rate</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="trips" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="card">
                    <h3 className="font-bold mb-4">Avg. Student Attendance %</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={stats}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis domain={[80, 100]} />
                                <Tooltip />
                                <Line type="monotone" dataKey="attendance" stroke="#10b981" strokeWidth={3} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
