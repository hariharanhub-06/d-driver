'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash, UserCheck } from 'lucide-react';
import api from '@/lib/api';

export default function DriversPage() {
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDrivers();
    }, []);

    const fetchDrivers = async () => {
        try {
            const { data } = await api.get('/drivers');
            setDrivers(data);
        } catch (error) {
            console.error('Failed to fetch drivers');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Drivers Management</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage driver assignments, licenses, and availability.</p>
                </div>
                <button className="btn-primary">
                    <Plus className="w-5 h-5 mr-2" />
                    Add Driver
                </button>
            </div>

            <div className="card p-0 overflow-hidden">
                <div className="p-4 border-b border-[var(--border)] bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
                    <div className="relative w-full max-w-md">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search drivers..."
                            className="pl-10 pr-4 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-sm focus:outline-none focus:border-primary-500 w-full"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-medium border-b border-[var(--border)]">
                            <tr>
                                <th className="px-6 py-4">Driver Name</th>
                                <th className="px-6 py-4">License No.</th>
                                <th className="px-6 py-4">Assigned Bus</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                            {loading ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Loading drivers...</td></tr>
                            ) : drivers.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No drivers found.</td></tr>
                            ) : (
                                drivers.map((driver: any) => (
                                    <tr key={driver.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="px-6 py-4 font-semibold flex items-center">
                                            <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center mr-3 shrink-0">
                                                <UserCheck className="w-4 h-4" />
                                            </div>
                                            {driver.user?.name || 'Unknown'}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">{driver.license_no || 'N/A'}</td>
                                        <td className="px-6 py-4">
                                            {driver.bus?.bus_number || <span className="text-slate-400 italic">Unassigned</span>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                                Active
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
