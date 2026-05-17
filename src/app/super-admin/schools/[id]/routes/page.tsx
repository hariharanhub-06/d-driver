'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { MapPin, Plus, Edit, Trash2, X } from 'lucide-react';
import api from '@/lib/api';

interface Route {
    id: string;
    name: string;
    route_type: 'morning' | 'afternoon' | 'both';
    start_point?: string;
    end_point?: string;
    is_active: boolean;
    bus?: { bus_number: string };
}

const emptyForm = { name: '', route_type: 'morning', start_point: '', end_point: '', is_active: true };
const inputCls = "w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors";

const typeBadge: Record<string, string> = {
    morning: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    afternoon: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    both: 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
};

export default function SchoolRoutesPage() {
    const { id } = useParams<{ id: string }>();
    const [routes, setRoutes] = useState<Route[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Route | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');

    useEffect(() => { fetchRoutes(); }, [id]);

    const fetchRoutes = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get(`/routes?school_id=${id}`);
            setRoutes(Array.isArray(res.data) ? res.data : []);
        } catch (e: any) {
            setError(e.response?.data?.message || 'Failed to load routes.');
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

    const openEdit = (route: Route) => {
        setEditing(route);
        setForm({
            name: route.name,
            route_type: route.route_type,
            start_point: route.start_point || '',
            end_point: route.end_point || '',
            is_active: route.is_active,
        });
        setFormError('');
        setModalOpen(true);
    };

    const handleSubmit = async () => {
        if (!form.name.trim()) { setFormError('Route name is required.'); return; }
        setSaving(true);
        setFormError('');
        try {
            if (editing) {
                await api.put(`/routes/${editing.id}`, {
                    name: form.name.trim(),
                    route_type: form.route_type,
                    start_point: form.start_point || undefined,
                    end_point: form.end_point || undefined,
                    is_active: form.is_active,
                });
            } else {
                await api.post('/routes', {
                    name: form.name.trim(),
                    route_type: form.route_type,
                    start_point: form.start_point || undefined,
                    end_point: form.end_point || undefined,
                    school_id: id,
                });
            }
            setModalOpen(false);
            fetchRoutes();
        } catch (e: any) {
            setFormError(e.response?.data?.message || 'Failed to save route.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (route: Route) => {
        if (!window.confirm(`Delete route "${route.name}"? This cannot be undone.`)) return;
        try {
            await api.delete(`/routes/${route.id}`);
            fetchRoutes();
        } catch (e: any) {
            alert(e.response?.data?.message || 'Failed to delete route.');
        }
    };

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <MapPin className="w-5 h-5 text-[var(--brand)]" />
                    <h2 className="text-slate-900 dark:text-white font-bold text-lg">Routes</h2>
                    <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full px-2.5 py-0.5 font-medium">{routes.length}</span>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95"
                >
                    <Plus className="w-4 h-4" /> Add Route
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
                    ) : routes.length === 0 ? (
                        <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">No routes found. Add one to get started.</div>
                    ) : (
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-700">
                                    {['Name', 'Type', 'Start → End', 'Bus', 'Active', 'Actions'].map(col => (
                                        <th key={col} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-700/50">{col}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {routes.map(route => (
                                    <tr key={route.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                        <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">{route.name}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${typeBadge[route.route_type] ?? ''}`}>
                                                {route.route_type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                                            {route.start_point || '—'} → {route.end_point || '—'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{route.bus?.bus_number || '—'}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border ${route.is_active ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800' : 'bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600'}`}>
                                                {route.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => openEdit(route)} className="flex items-center gap-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-3 py-1.5 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                                                    <Edit className="w-3 h-3" /> Edit
                                                </button>
                                                <button onClick={() => handleDelete(route)} className="flex items-center gap-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl px-3 py-1.5 font-semibold text-xs hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
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
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700">
                            <h2 className="text-slate-900 dark:text-white font-bold text-base">{editing ? 'Edit Route' : 'Add Route'}</h2>
                            <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Route Name <span className="text-red-500">*</span></label>
                                <input className={inputCls} placeholder="e.g. North Zone Morning" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Type</label>
                                <select className={inputCls} value={form.route_type} onChange={e => setForm(p => ({ ...p, route_type: e.target.value }))}>
                                    <option value="morning">Morning</option>
                                    <option value="afternoon">Afternoon</option>
                                    <option value="both">Both</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Start Point</label>
                                    <input className={inputCls} placeholder="e.g. Main Gate" value={form.start_point} onChange={e => setForm(p => ({ ...p, start_point: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">End Point</label>
                                    <input className={inputCls} placeholder="e.g. School" value={form.end_point} onChange={e => setForm(p => ({ ...p, end_point: e.target.value }))} />
                                </div>
                            </div>
                            {editing && (
                                <div className="flex items-center gap-3">
                                    <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} className="w-4 h-4 accent-[var(--brand)]" />
                                    <label htmlFor="is_active" className="text-sm font-medium text-slate-700 dark:text-slate-300">Active</label>
                                </div>
                            )}
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
                                {editing ? 'Save Changes' : 'Add Route'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
