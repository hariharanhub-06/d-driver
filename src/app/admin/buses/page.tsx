'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Search, Edit, Trash2, Bus as BusIcon, Users as UsersIcon, X, Loader2, Droplets, FileUp } from 'lucide-react';
import api from '@/lib/api';

type Bus = {
    id: string;
    bus_number: string;
    capacity: number;
    registration_no?: string;
    mileage?: number;
    fuel_liters?: number;
    current_status?: string;
    drivers?: { user: { name: string } }[];
};

const EMPTY_FORM = { bus_number: '', capacity: '', registration_no: '', mileage: '', initial_fuel_liters: '' };

function fuelColor(liters?: number) {
    if (!liters && liters !== 0) return 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400';
    if (liters > 20) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    if (liters >= 10) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
}

function fuelDot(liters?: number) {
    if (!liters && liters !== 0) return 'bg-gray-400';
    if (liters > 20) return 'bg-emerald-500';
    if (liters >= 10) return 'bg-amber-500';
    return 'bg-red-500';
}

export default function BusesPage() {
    const [buses, setBuses] = useState<Bus[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editBus, setEditBus] = useState<Bus | null>(null);
    const [formData, setFormData] = useState({ ...EMPTY_FORM });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const importRef = useRef<HTMLInputElement>(null);

    useEffect(() => { fetchBuses(); }, []);

    const fetchBuses = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/buses');
            setBuses(Array.isArray(data) ? data : []);
        } catch {
            setBuses([]);
        } finally {
            setLoading(false);
        }
    };

    const openCreate = () => {
        setEditBus(null);
        setFormData({ ...EMPTY_FORM });
        setIsModalOpen(true);
    };

    const openEdit = (bus: Bus) => {
        setEditBus(bus);
        setFormData({
            bus_number: bus.bus_number,
            capacity: String(bus.capacity),
            registration_no: bus.registration_no || '',
            mileage: bus.mileage ? String(bus.mileage) : '',
            initial_fuel_liters: bus.fuel_liters ? String(bus.fuel_liters) : '',
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        try { await api.delete(`/buses/${id}`); } catch { /* ignore */ }
        setBuses(prev => prev.filter(b => b.id !== id));
        setDeleteId(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload: any = {
                bus_number: formData.bus_number,
                capacity: parseInt(formData.capacity),
                ...(formData.registration_no && { registration_no: formData.registration_no }),
                ...(formData.mileage && { mileage: parseFloat(formData.mileage) }),
                ...(formData.initial_fuel_liters && { initial_fuel_liters: parseFloat(formData.initial_fuel_liters) }),
            };
            if (editBus) {
                const { data } = await api.put(`/buses/${editBus.id}`, payload);
                setBuses(prev => prev.map(b => b.id === editBus.id ? { ...b, ...payload, ...(data || {}) } : b));
            } else {
                const { data } = await api.post('/buses', payload);
                setBuses(prev => [...prev, data || { id: Date.now().toString(), ...payload, current_status: 'active', drivers: [] }]);
            }
            setIsModalOpen(false);
        } catch {
            setIsModalOpen(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const fd = new FormData();
        fd.append('file', file);
        try {
            await api.post('/buses/bulk', fd);
            fetchBuses();
        } catch { /* ignore */ }
        if (importRef.current) importRef.current.value = '';
    };

    const filtered = buses.filter(b =>
        b.bus_number.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Fleet Management</h1>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Manage vehicles, capacity, fuel levels and assigned drivers.</p>
                </div>
                <div className="flex gap-2">
                    <input ref={importRef} type="file" className="hidden" accept=".csv,.xlsx,.xls" onChange={handleImport} />
                    <button
                        onClick={() => importRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-xl font-semibold text-sm transition-all"
                    >
                        <FileUp className="w-4 h-4" /> Import
                    </button>
                    <button
                        onClick={openCreate}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-all"
                    >
                        <Plus className="w-4 h-4" /> Add Bus
                    </button>
                </div>
            </div>

            {/* Table Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex items-center gap-3">
                    <div className="relative flex-1 max-w-xs">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by bus number..."
                            className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 pl-9 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <span className="text-xs text-gray-400 font-bold ml-auto">{filtered.length} buses</span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-slate-800">
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">Bus</th>
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">Registration</th>
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">Capacity</th>
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">Mileage</th>
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">Fuel</th>
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">Driver</th>
                                <th className="px-6 py-3 text-right text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center">
                                        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-16 text-center text-gray-400">
                                        <BusIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p className="font-bold">No buses found</p>
                                        <p className="text-xs mt-1">Add your first bus to get started</p>
                                    </td>
                                </tr>
                            ) : filtered.map(bus => (
                                <tr key={bus.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                                                <BusIcon className="w-4 h-4 text-blue-600" />
                                            </div>
                                            <span className="font-bold text-gray-800 dark:text-white">{bus.bus_number}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 dark:text-slate-400">{bus.registration_no || '—'}</td>
                                    <td className="px-6 py-4">
                                        <span className="flex items-center gap-1 text-gray-600 dark:text-slate-300">
                                            <UsersIcon className="w-3.5 h-3.5" />
                                            {bus.capacity}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 dark:text-slate-400">
                                        {bus.mileage ? `${bus.mileage} km/L` : '—'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-bold ${fuelColor(bus.fuel_liters)}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${fuelDot(bus.fuel_liters)}`} />
                                            <Droplets className="w-3 h-3" />
                                            {bus.fuel_liters != null ? `${bus.fuel_liters}L` : 'N/A'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {bus.drivers && bus.drivers.length > 0
                                            ? <span className="font-medium text-gray-700 dark:text-slate-200">{bus.drivers[0].user?.name}</span>
                                            : <span className="text-gray-400 italic text-xs">Unassigned</span>}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => openEdit(bus)}
                                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setDeleteId(bus.id)}
                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                            >
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-lg w-full mx-4 shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-black text-gray-900 dark:text-white">{editBus ? 'Edit Bus' : 'Add New Bus'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl text-gray-400 transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Bus Number *</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="e.g. BUS-001"
                                    className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={formData.bus_number}
                                    onChange={e => setFormData({ ...formData, bus_number: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Capacity *</label>
                                    <input
                                        required
                                        type="number"
                                        placeholder="40"
                                        min="1"
                                        className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.capacity}
                                        onChange={e => setFormData({ ...formData, capacity: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Registration No.</label>
                                    <input
                                        type="text"
                                        placeholder="TN-01-AB-1234"
                                        className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.registration_no}
                                        onChange={e => setFormData({ ...formData, registration_no: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Mileage (km/L)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        placeholder="12.5"
                                        className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.mileage}
                                        onChange={e => setFormData({ ...formData, mileage: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Initial Fuel (L)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        placeholder="50"
                                        className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.initial_fuel_liters}
                                        onChange={e => setFormData({ ...formData, initial_fuel_liters: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl font-semibold text-sm hover:bg-gray-50 dark:hover:bg-slate-800 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-60"
                                >
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : editBus ? 'Save Changes' : 'Add Bus'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {deleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center">
                        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                            <Trash2 className="w-6 h-6 text-red-500" />
                        </div>
                        <h3 className="font-black text-gray-900 dark:text-white mb-2">Remove this bus?</h3>
                        <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">This action cannot be undone.</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteId(null)}
                                className="flex-1 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl font-semibold text-sm hover:bg-gray-50 dark:hover:bg-slate-800 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDelete(deleteId)}
                                className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-all"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
