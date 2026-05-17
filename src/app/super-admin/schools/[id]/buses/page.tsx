'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Truck, Plus, Edit, Trash2, X } from 'lucide-react';
import api from '@/lib/api';

interface Bus {
    id: string;
    bus_number: string;
    capacity?: number;
    registration_no?: string;
    mileage?: number;
    initial_fuel_liters?: number;
    routes?: { id: string; name: string }[];
}

const emptyForm = { bus_number: '', capacity: '', registration_no: '', mileage: '', initial_fuel_liters: '' };
const inputCls = "w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors";

export default function SchoolBusesPage() {
    const { id } = useParams<{ id: string }>();
    const [buses, setBuses] = useState<Bus[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Bus | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');

    useEffect(() => { fetchBuses(); }, [id]);

    const fetchBuses = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get(`/buses?school_id=${id}`);
            setBuses(Array.isArray(res.data) ? res.data : []);
        } catch (e: any) {
            setError(e.response?.data?.message || 'Failed to load buses.');
        } finally {
            setLoading(false);
        }
    };

    const openCreate = () => {
        setEditing(null);
        setForm(emptyForm);
        setFormError('');
        setModalOpen(true);
    };

    const openEdit = (bus: Bus) => {
        setEditing(bus);
        setForm({
            bus_number: bus.bus_number,
            capacity: bus.capacity?.toString() || '',
            registration_no: bus.registration_no || '',
            mileage: bus.mileage?.toString() || '',
            initial_fuel_liters: bus.initial_fuel_liters?.toString() || '',
        });
        setFormError('');
        setModalOpen(true);
    };

    const handleSubmit = async () => {
        if (!form.bus_number.trim()) { setFormError('Bus number is required.'); return; }
        setSaving(true);
        setFormError('');
        const payload = {
            bus_number: form.bus_number.trim(),
            capacity: form.capacity ? Number(form.capacity) : undefined,
            registration_no: form.registration_no || undefined,
            mileage: form.mileage ? Number(form.mileage) : undefined,
            initial_fuel_liters: form.initial_fuel_liters ? Number(form.initial_fuel_liters) : undefined,
        };
        try {
            if (editing) {
                await api.put(`/buses/${editing.id}`, payload);
            } else {
                await api.post('/buses', { ...payload, school_id: id });
            }
            setModalOpen(false);
            fetchBuses();
        } catch (e: any) {
            setFormError(e.response?.data?.message || 'Failed to save bus.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (bus: Bus) => {
        if (!window.confirm(`Delete bus "${bus.bus_number}"? This cannot be undone.`)) return;
        try {
            await api.delete(`/buses/${bus.id}`);
            fetchBuses();
        } catch (e: any) {
            alert(e.response?.data?.message || 'Failed to delete bus.');
        }
    };

    const f = (key: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm(prev => ({ ...prev, [key]: e.target.value }));

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <Truck className="w-5 h-5 text-[var(--brand)]" />
                    <h2 className="text-slate-900 dark:text-white font-bold text-lg">Buses</h2>
                    <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full px-2.5 py-0.5 font-medium">{buses.length}</span>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95"
                >
                    <Plus className="w-4 h-4" /> Add Bus
                </button>
            </div>

            {error && (
                <p className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/30 rounded-xl px-4 py-3 border border-red-200 dark:border-red-800">{error}</p>
            )}

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex justify-center py-16">
                            <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : buses.length === 0 ? (
                        <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">No buses found. Add one to get started.</div>
                    ) : (
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-700">
                                    {['Bus Number', 'Route(s)', 'Capacity', 'Registration No.', 'Mileage (km/L)', 'Fuel (L)', 'Actions'].map(col => (
                                        <th key={col} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-700/50">{col}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {buses.map(bus => (
                                    <tr key={bus.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                        <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">{bus.bus_number}</td>
                                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                                            {bus.routes && bus.routes.length > 0
                                                ? bus.routes.map(r => (
                                                    <span key={r.id} className="inline-block bg-[var(--brand)]/10 text-[var(--brand)] rounded-lg px-2 py-0.5 text-xs font-semibold mr-1">{r.name}</span>
                                                ))
                                                : <span className="text-slate-400">—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{bus.capacity ?? '—'}</td>
                                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{bus.registration_no || '—'}</td>
                                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{bus.mileage ?? '—'}</td>
                                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{bus.initial_fuel_liters ?? '—'}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => openEdit(bus)} className="flex items-center gap-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-3 py-1.5 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                                                    <Edit className="w-3 h-3" /> Edit
                                                </button>
                                                <button onClick={() => handleDelete(bus)} className="flex items-center gap-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl px-3 py-1.5 font-semibold text-xs hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
                                                    <Trash2 className="w-3 h-3" /> Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {modalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700">
                            <h2 className="text-slate-900 dark:text-white font-bold text-base">{editing ? 'Edit Bus' : 'Add Bus'}</h2>
                            <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Bus Number <span className="text-red-500">*</span></label>
                                <input className={inputCls} placeholder="e.g. KA-01-AB-1234" value={form.bus_number} onChange={f('bus_number')} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Capacity</label>
                                    <input type="number" className={inputCls} placeholder="40" value={form.capacity} onChange={f('capacity')} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Mileage (km/L)</label>
                                    <input type="number" className={inputCls} placeholder="12" value={form.mileage} onChange={f('mileage')} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Registration No.</label>
                                <input className={inputCls} placeholder="REG-XXXX" value={form.registration_no} onChange={f('registration_no')} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Initial Fuel (L)</label>
                                <input type="number" className={inputCls} placeholder="50" value={form.initial_fuel_liters} onChange={f('initial_fuel_liters')} />
                            </div>
                            {formError && (
                                <p className="text-red-600 dark:text-red-400 text-xs font-medium bg-red-50 dark:bg-red-900/30 rounded-xl px-4 py-3 border border-red-200 dark:border-red-800">{formError}</p>
                            )}
                        </div>
                        <div className="flex gap-3 px-6 pb-6">
                            <button onClick={() => setModalOpen(false)} className="flex-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-4 py-2.5 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleSubmit} disabled={saving} className="flex-1 flex items-center justify-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95 disabled:opacity-50">
                                {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                                {editing ? 'Save Changes' : 'Add Bus'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
