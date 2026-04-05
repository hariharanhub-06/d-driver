'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Bus as BusIcon, Users as UsersIcon, X, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

type Bus = { id: string; bus_number: string; capacity: number; current_status: string; drivers?: { user: { name: string } }[] };

const EMPTY = { bus_number: '', capacity: '', school_id: '' };

export default function BusesPage() {
    const { user } = useAuth();
    const [buses, setBuses] = useState<Bus[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editBus, setEditBus] = useState<Bus | null>(null);
    const [formData, setFormData] = useState(EMPTY);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => { fetchBuses(); }, []);

    const fetchBuses = async () => {
        try {
            const { data } = await api.get('/buses');
            if (data && data.length > 0) setBuses(data);
            else throw new Error();
        } catch {
            setBuses([]);
        } finally {
            setLoading(false);
        }
    };

    const openCreate = () => {
        setEditBus(null);
        setFormData(EMPTY);
        setIsModalOpen(true);
    };

    const openEdit = (bus: Bus) => {
        setEditBus(bus);
        setFormData({ bus_number: bus.bus_number, capacity: String(bus.capacity), school_id: '' });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Remove this bus from the fleet?')) return;
        try { await api.delete(`/buses/${id}`); } catch { /* mock */ }
        setBuses(prev => prev.filter(b => b.id !== id));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload = { ...formData, capacity: parseInt(formData.capacity), school_id: user?.school_id || formData.school_id };
            if (editBus) {
                await api.put(`/buses/${editBus.id}`, payload);
                setBuses(prev => prev.map(b => b.id === editBus.id ? { ...b, ...payload } : b));
            } else {
                const { data } = await api.post('/buses', payload);
                setBuses(prev => [...prev, data || { id: Date.now().toString(), ...payload, current_status: 'Active', drivers: [] }]);
            }
        } catch {
            if (editBus) {
                setBuses(prev => prev.map(b => b.id === editBus.id ? { ...b, bus_number: formData.bus_number, capacity: parseInt(formData.capacity) } : b));
            } else {
                setBuses(prev => [...prev, { id: Date.now().toString(), bus_number: formData.bus_number, capacity: parseInt(formData.capacity), current_status: 'Active', drivers: [] }]);
            }
        } finally {
            setIsSubmitting(false);
            setIsModalOpen(false);
        }
    };

    const statusColor = (s: string) => s === 'Active' ? 'bg-emerald-100 text-emerald-700' : s === 'Maintenance' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
    const filtered = buses.filter(b => b.bus_number.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="space-y-6 animate-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="display-title text-2xl md:text-3xl">Fleet Management</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage transport vehicles, capacity, and current status.</p>
                </div>
                <button onClick={openCreate} className="btn-primary w-full sm:w-auto">
                    <Plus className="w-5 h-5 mr-2" /> Add New Bus
                </button>
            </div>

            <div className="card p-0 overflow-hidden border-none shadow-xl">
                <div className="p-4 border-b border-border flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="relative w-full max-w-sm">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                        <input type="text" placeholder="Search buses..." className="input-field pl-10 py-2 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
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
                                <tr><td colSpan={5} className="px-6 py-12 text-center"><Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto" /></td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500"><BusIcon className="w-12 h-12 mx-auto text-slate-300 mb-4" />No buses found.</td></tr>
                            ) : filtered.map(bus => (
                                <tr key={bus.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mr-3">
                                                <BusIcon className="w-5 h-5 text-primary-600" />
                                            </div>
                                            <span className="font-bold text-slate-800 dark:text-white">{bus.bus_number}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4"><div className="flex items-center text-slate-600 dark:text-slate-400"><UsersIcon className="w-4 h-4 mr-2" />{bus.capacity} Seats</div></td>
                                    <td className="px-6 py-4">
                                        {bus.drivers && bus.drivers.length > 0
                                            ? <span className="font-medium">{bus.drivers[0].user?.name}</span>
                                            : <span className="text-slate-400 italic">Unassigned</span>}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${statusColor(bus.current_status)}`}>
                                            {bus.current_status || 'Active'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => openEdit(bus)} className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-all" title="Edit bus">
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(bus.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all" title="Delete bus">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="modal-container-compact">
                        <div className="px-6 pt-6 pb-0 flex items-center justify-between mb-4">
                            <h2 className="text-lg font-black">{editBus ? 'Edit Bus' : 'Add New Vehicle'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400"><X size={16} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-3.5">
                            <div>
                                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Bus Number</label>
                                <input required type="text" placeholder="e.g. BUS-001" className="input-field" value={formData.bus_number} onChange={e => setFormData({ ...formData, bus_number: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Capacity</label>
                                <input required type="number" placeholder="e.g. 40" className="input-field" value={formData.capacity} onChange={e => setFormData({ ...formData, capacity: e.target.value })} />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 border border-border rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-xs">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 text-xs py-2.5">
                                    {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : editBus ? 'Save Changes' : 'Add Vehicle'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
