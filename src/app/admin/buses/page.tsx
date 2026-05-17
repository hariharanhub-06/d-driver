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
    if (!liters && liters !== 0) return 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400';
    if (liters > 20) return 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400';
    if (liters >= 10) return 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
    return 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400';
}

function fuelDot(liters?: number) {
    if (!liters && liters !== 0) return 'bg-slate-400';
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

    const activeBuses = buses.filter(b => b.current_status === 'active').length;

    const inputCls = "w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors";
    const labelCls = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5";

    return (
        <div className="space-y-6 animate-in">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Buses</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage vehicles, capacity, fuel levels and assigned drivers.</p>
                </div>
                <div className="flex gap-2">
                    <input ref={importRef} type="file" className="hidden" accept=".csv,.xlsx,.xls" onChange={handleImport} />
                    <button
                        onClick={() => importRef.current?.click()}
                        className="flex items-center gap-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all"
                    >
                        <FileUp className="w-4 h-4" /> Import
                    </button>
                    <button
                        onClick={openCreate}
                        className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95"
                    >
                        <Plus className="w-4 h-4" /> Add Bus
                    </button>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-[var(--brand)] text-white rounded-2xl p-6 shadow-lg">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-4">
                        <BusIcon className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-3xl font-bold">{loading ? '—' : buses.length}</p>
                    <p className="text-sm text-white/80 mt-1">Total Buses</p>
                </div>
                <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
                        <BusIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{loading ? '—' : activeBuses}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Active Buses</p>
                </div>
            </div>

            {/* Table Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
                    <div className="relative flex-1 max-w-xs">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by bus number..."
                            className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 pl-9 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <span className="text-xs text-slate-400 font-medium ml-auto">{filtered.length} buses</span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Bus</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Registration</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Capacity</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Mileage</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Fuel</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Driver</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-3">
                                        <div className="flex justify-center py-16">
                                            <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">
                                        <BusIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                        <p className="font-medium">No buses found</p>
                                        <p className="text-xs mt-1">Add your first bus to get started</p>
                                    </td>
                                </tr>
                            ) : filtered.map(bus => (
                                <tr key={bus.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-[var(--brand)]/10 flex items-center justify-center">
                                                <BusIcon className="w-4 h-4 text-[var(--brand)]" />
                                            </div>
                                            <span className="font-semibold text-slate-800 dark:text-white">{bus.bus_number}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{bus.registration_no || '—'}</td>
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                        <span className="flex items-center gap-1">
                                            <UsersIcon className="w-3.5 h-3.5 text-slate-400" />
                                            {bus.capacity}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                        {bus.mileage ? `${bus.mileage} km/L` : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                        <div className="space-y-1.5">
                                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${fuelColor(bus.fuel_liters)}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${fuelDot(bus.fuel_liters)}`} />
                                                <Droplets className="w-3 h-3" />
                                                {bus.fuel_liters != null ? `${bus.fuel_liters}L` : 'N/A'}
                                            </span>
                                            {bus.fuel_liters != null && (
                                                <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-[var(--brand)] rounded-full"
                                                        style={{ width: `${Math.min(100, (bus.fuel_liters / 60) * 100)}%` }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                        {bus.drivers && bus.drivers.length > 0
                                            ? <span className="font-medium">{bus.drivers[0].user?.name}</span>
                                            : <span className="text-slate-400 italic text-xs">Unassigned</span>}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 text-right">
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => openEdit(bus)}
                                                className="p-2 text-slate-400 hover:text-[var(--brand)] hover:bg-[var(--brand)]/10 rounded-lg transition-all"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setDeleteId(bus.id)}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
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
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{editBus ? 'Edit Bus' : 'Add New Bus'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-400 transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className={labelCls}>Bus Number *</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="e.g. BUS-001"
                                    className={inputCls}
                                    value={formData.bus_number}
                                    onChange={e => setFormData({ ...formData, bus_number: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelCls}>Capacity *</label>
                                    <input
                                        required
                                        type="number"
                                        placeholder="40"
                                        min="1"
                                        className={inputCls}
                                        value={formData.capacity}
                                        onChange={e => setFormData({ ...formData, capacity: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>Registration No.</label>
                                    <input
                                        type="text"
                                        placeholder="TN-01-AB-1234"
                                        className={inputCls}
                                        value={formData.registration_no}
                                        onChange={e => setFormData({ ...formData, registration_no: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelCls}>Mileage (km/L)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        placeholder="12.5"
                                        className={inputCls}
                                        value={formData.mileage}
                                        onChange={e => setFormData({ ...formData, mileage: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>Initial Fuel (L)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        placeholder="50"
                                        className={inputCls}
                                        value={formData.initial_fuel_liters}
                                        onChange={e => setFormData({ ...formData, initial_fuel_liters: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 flex items-center justify-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95 disabled:opacity-60"
                                >
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : editBus ? 'Save Changes' : 'Add Bus'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {deleteId && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Remove this bus?</h3>
                            <button onClick={() => setDeleteId(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 text-center">
                            <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="w-6 h-6 text-red-500" />
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">This action cannot be undone.</p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeleteId(null)}
                                    className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleDelete(deleteId)}
                                    className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
