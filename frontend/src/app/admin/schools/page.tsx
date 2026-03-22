'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash, Building } from 'lucide-react';
import api from '@/lib/api';

export default function SchoolsPage() {
    const [schools, setSchools] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSchools();
    }, []);

    const fetchSchools = async () => {
        try {
            const { data } = await api.get('/schools');
            setSchools(data);
        } catch (error) {
            console.error('Failed to fetch schools');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Schools Management</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage tenant schools and their subscription plans.</p>
                </div>
                <button className="btn-primary">
                    <Plus className="w-5 h-5 mr-2" />
                    Onboard School
                </button>
            </div>

            <div className="card p-0 overflow-hidden">
                <div className="p-4 border-b border-[var(--border)] bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="relative w-full max-w-md">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search schools..."
                            className="pl-10 pr-4 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-sm focus:outline-none focus:border-primary-500 w-full"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-medium border-b border-[var(--border)]">
                            <tr>
                                <th className="px-6 py-4">School Name</th>
                                <th className="px-6 py-4">Address</th>
                                <th className="px-6 py-4">Subscription</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                            {loading ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Loading schools...</td></tr>
                            ) : schools.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No schools found.</td></tr>
                            ) : (
                                schools.map((school: any) => (
                                    <tr key={school.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="px-6 py-4 font-semibold flex items-center">
                                            <div className="w-8 h-8 rounded bg-primary-100 text-primary-600 flex items-center justify-center mr-3 shrink-0">
                                                <Building className="w-4 h-4" />
                                            </div>
                                            {school.name}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">{school.address}</td>
                                        <td className="px-6 py-4 capitalize">{school.subscription_plan}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${school.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'}`}>
                                                {school.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="text-slate-400 hover:text-primary-600 p-1"><Edit className="w-4 h-4" /></button>
                                            <button className="text-slate-400 hover:text-red-600 p-1 ml-2"><Trash className="w-4 h-4" /></button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
