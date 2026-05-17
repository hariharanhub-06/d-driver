'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Map as MapIcon, X, Loader2, ExternalLink, ToggleLeft, ToggleRight } from 'lucide-react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';

type Route = {
    id: string;
    name: string;
    route_type?: 'morning' | 'afternoon' | 'both';
    is_active?: boolean;
    bus?: { bus_number: string };
    bus_id?: string;
    stops?: any[];
};

type Bus = { id: string; bus_number: string };

const routeTypeBadge = (t?: string) => {
    if (t === 'morning') return 'inline-flex items-center bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full px-2.5 py-0.5 text-xs font-medium';
    if (t === 'afternoon') return 'inline-flex items-center bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full px-2.5 py-0.5 text-xs font-medium';
    return 'inline-flex items-center bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full px-2.5 py-0.5 text-xs font-medium';
};

const EMPTY_FORM = { name: '', route_type: 'both' as Route['route_type'], bus_id: '' };

export default function RoutesPage() {
    const router = useRouter();
    const [routes, setRoutes] = useState<Route[]>([]);
    const [buses, setBuses] = useState<Bus[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editRoute, setEditRoute] = useState<Route | null>(null);
    const [formData, setFormData] = useState({ ...EMPTY_FORM });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [togglingId, setTogglingId] = useState<string | null>(null);

    useEffect(() => { fetchRoutes(); fetchBuses(); }, []);

    const fetchRoutes = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/routes');
            setRoutes(Array.isArray(data) ? data : []);
        } catch {
            setRoutes([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchBuses = async () => {
        try {
            const { data } = await api.get('/buses');
            setBuses(Array.isArray(data) ? data : []);
        } catch { setBuses([]); }
    };

    const openCreate = () => {
        setEditRoute(null);
        setFormData({ ...EMPTY_FORM });
        setIsModalOpen(true);
    };

    const openEdit = (r: Route) => {
        setEditRoute(r);
        setFormData({ name: r.name, route_type: r.route_type || 'both', bus_id: r.bus_id || '' });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload = { ...formData };
            if (editRoute) {
                await api.put(`/routes/${editRoute.id}`, payload);
                setRoutes(prev => prev.map(r => r.id === editRoute.id ? { ...r, ...payload } : r));
            } else {
                const { data } = await api.post('/routes', { ...payload, stops: [] });
                setRoutes(prev => [...prev, data || { id: Date.now().toString(), ...payload, is_active: true, stops: [] }]);
            }
            setIsModalOpen(false);
        } catch {
            setIsModalOpen(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        try { await api.delete(`/routes/${id}`); } catch { /* ignore */ }
        setRoutes(prev => prev.filter(r => r.id !== id));
        setDeleteId(null);
    };

    const toggleActive = async (route: Route) => {
        setTogglingId(route.id);
        try {
            await api.put(`/routes/${route.id}`, { is_active: !route.is_active });
            setRoutes(prev => prev.map(r => r.id === route.id ? { ...r, is_active: !r.is_active } : r));
        } catch { /* ignore */ }
        setTogglingId(null);
    };

    const inputCls = "w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors";
    const labelCls = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5";

    return (
        <div className="space-y-6 animate-in">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Routes</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage transport routes, bus assignments and active status.</p>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95"
                >
                    <Plus className="w-4 h-4" /> Add Route
                </button>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Route Name</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Type</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Assigned Bus</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Stops</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-3">
                                        <div className="flex justify-center py-16">
                                            <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                    </td>
                                </tr>
                            ) : routes.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">
                                        <MapIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                        <p className="font-medium">No routes defined</p>
                                        <p className="text-xs mt-1">Create your first route to get started</p>
                                    </td>
                                </tr>
                            ) : routes.map(route => (
                                <tr key={route.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-[var(--brand)]/10 flex items-center justify-center">
                                                <MapIcon className="w-4 h-4 text-[var(--brand)]" />
                                            </div>
                                            <span className="font-semibold text-slate-800 dark:text-white">{route.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                        <span className={`${routeTypeBadge(route.route_type)} capitalize`}>
                                            {route.route_type || 'Both'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                        {route.bus?.bus_number
                                            ? <span className="font-medium">{route.bus.bus_number}</span>
                                            : <span className="text-slate-400 text-xs italic">Unassigned</span>}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                        <button
                                            onClick={() => router.push(`/admin/stops?route_id=${route.id}`)}
                                            className="flex items-center gap-1 text-[var(--brand)] hover:opacity-80 text-xs font-semibold transition-all"
                                        >
                                            {route.stops?.length ?? 0} stops <ExternalLink className="w-3 h-3" />
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                        <button
                                            onClick={() => toggleActive(route)}
                                            disabled={togglingId === route.id}
                                            className="transition-all"
                                        >
                                            {route.is_active
                                                ? <ToggleRight className="w-7 h-7 text-emerald-500" />
                                                : <ToggleLeft className="w-7 h-7 text-slate-400" />}
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 text-right">
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => openEdit(route)} className="p-2 text-slate-400 hover:text-[var(--brand)] hover:bg-[var(--brand)]/10 rounded-lg transition-all"><Edit className="w-4 h-4" /></button>
                                            <button onClick={() => setDeleteId(route.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
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
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{editRoute ? 'Edit Route' : 'Add Route'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-400 transition-all"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className={labelCls}>Route Name *</label>
                                <input required type="text" placeholder="e.g. North Morning Route" className={inputCls} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div>
                                <label className={labelCls}>Route Type</label>
                                <select className={inputCls} value={formData.route_type} onChange={e => setFormData({ ...formData, route_type: e.target.value as Route['route_type'] })}>
                                    <option value="morning">Morning</option>
                                    <option value="afternoon">Afternoon</option>
                                    <option value="both">Both</option>
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>Assign Bus</label>
                                <select className={inputCls} value={formData.bus_id} onChange={e => setFormData({ ...formData, bus_id: e.target.value })}>
                                    <option value="">No bus assigned</option>
                                    {buses.map(b => <option key={b.id} value={b.id}>{b.bus_number}</option>)}
                                </select>
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
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : editRoute ? 'Save Changes' : 'Create Route'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirm */}
            {deleteId && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
                        <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                            <Trash2 className="w-6 h-6 text-red-500" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Delete this route?</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">This will remove the route and its configuration.</p>
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
            )}
        </div>
    );
}
