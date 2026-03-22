'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash, Bus as BusIcon, Users as UsersIcon } from 'lucide-react';
import api from '@/lib/api';
import Modal from '@/components/ui/Modal';
import { useAuth } from '@/context/AuthContext';

export default function BusesPage() {
    const { user } = useAuth();
    const [buses, setBuses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ bus_number: '', capacity: '', school_id: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchBuses();
    }, []);

    const fetchBuses = async () => {
        try {
            const { data } = await api.get('/buses');
            setBuses(data);
        } catch {
            console.error('Failed to fetch buses');
        } finally {
            setLoading(false);
        }
    };

    const handleAddBus = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload = {
                ...formData,
                capacity: parseInt(formData.capacity),
                school_id: user?.role === 'super_admin' ? formData.school_id : user?.school_id
            };
            await api.post('/buses', payload);
            setIsModalOpen(false);
            setFormData({ bus_number: '', capacity: '', school_id: '' });
            fetchBuses();
        } catch {
            alert('Failed to add bus. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 animate-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="display-title text-2xl md:text-3xl">Fleet Management</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage transport vehicles, capacity, and current status.</p>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="btn-primary w-full sm:w-auto">
                    <Plus className="w-5 h-5 mr-2" />
                    Add New Bus
                </button>
            </div>

            <div className="card p-0 overflow-hidden border-none shadow-xl">
                <div className="p-4 border-b border-border flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="relative w-full max-w-sm">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search buses..."
                            className="input-field pl-10 py-2 text-sm"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-medium border-b border-border">
                            <tr>
                                <th className="px-6 py-4">Bus Details</th>
                                <th className="px-6 py-4">Capacity</th>
                                <th className="px-6 py-4">Assigned Driver</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center">
                                            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                            Loading fleet data...
                                        </div>
                                    </td>
                                </tr>
                            ) : buses.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                        <BusIcon className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                                        No buses found. Add a vehicle to get started.
                                    </td>
                                </tr>
                            ) : (
                                buses.map((bus: { id: string, bus_number: string, capacity: number, current_status: string, drivers?: { user: { name: string } }[] }) => (
                                    <tr key={bus.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mr-3">
                                                    <BusIcon className="w-5 h-5 text-primary-600" />
                                                </div>
                                                <span className="font-bold text-slate-800 dark:text-white">{bus.bus_number}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center text-slate-600 dark:text-slate-400">
                                                <UsersIcon className="w-4 h-4 mr-2" />
                                                {bus.capacity} Seats
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {bus.drivers && bus.drivers.length > 0
                                                ? <span className="font-medium">{bus.drivers[0].user?.name}</span>
                                                : <span className="text-slate-400 italic">Unassigned</span>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                                                {bus.current_status || 'Active'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-all">
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all">
                                                    <Trash className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Add New Vehicle"
            >
                <form onSubmit={handleAddBus} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Bus Number</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. BUS-001"
                            className="input-field"
                            value={formData.bus_number}
                            onChange={(e) => setFormData({ ...formData, bus_number: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Total Capacity</label>
                        <input
                            type="number"
                            required
                            placeholder="e.g. 40"
                            className="input-field"
                            value={formData.capacity}
                            onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                        />
                    </div>
                    {user?.role === 'super_admin' && (
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">School ID</label>
                            <input
                                type="text"
                                required
                                placeholder="Paste School ID here"
                                className="input-field"
                                value={formData.school_id}
                                onChange={(e) => setFormData({ ...formData, school_id: e.target.value })}
                            />
                        </div>
                    )}
                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="flex-1 py-3 px-4 border border-border rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="btn-primary flex-1"
                        >
                            {isSubmitting ? 'Saving...' : 'Add vehicle'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
