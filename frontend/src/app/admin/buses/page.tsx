'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash } from 'lucide-react';
import api from '@/lib/api';

export default function BusesPage() {
    const [buses, setBuses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBuses();
    }, []);

    const fetchBuses = async () => {
        try {
            const { data } = await api.get('/buses');
            setBuses(data);
        } catch (error) {
            console.error('Failed to fetch buses');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Fleet Management</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage transport vehicles, capacity, and current status.</p>
                </div>
                <button className="btn-primary">
                    <Plus className="w-5 h-5 mr-2" />
                    Add New Bus
                </button>
            </div>

            <div className="card p-0 overflow-hidden">
                <div className="p-4 border-b border-[var(--border)] flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="relative w-64">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search buses..."
                            className="pl-10 pr-4 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-sm focus:outline-none focus:border-primary-500 w-full"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-medium border-b border-[var(--border)]">
                            <tr>
                                <th className="px-6 py-4">Bus Number</th>
                                <th className="px-6 py-4">Capacity</th>
                                <th className="px-6 py-4">Assigned Driver</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Loading fleet data...</td>
                                </tr>
                            ) : buses.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No buses found. Add a vehicle to get started.</td>
                                </tr>
                            ) : (
                                buses.map((bus: any) => (
                                    <tr key={bus.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 font-semibold">{bus.bus_number}</td>
                                        <td className="px-6 py-4">{bus.capacity} Seats</td>
                                        <td className="px-6 py-4">
                                            {bus.drivers && bus.drivers.length > 0
                                                ? bus.drivers[0].user?.name
                                                : <span className="text-slate-400 italic">Unassigned</span>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                                                Active
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="text-slate-400 hover:text-primary-600 p-1 transition-colors">
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button className="text-slate-400 hover:text-red-600 p-1 ml-2 transition-colors">
                                                <Trash className="w-4 h-4" />
                                            </button>
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
