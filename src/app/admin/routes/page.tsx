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
    if (t === 'morning') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    if (t === 'afternoon') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
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

    return (
        <div className="space-y-6 animate-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Routes</h1>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Manage transport routes, bus assignments and active status.</p>
                </div>
                <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-all">
                    <Plus className="w-4 h-4" /> Add Route
                </button>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-slate-800">
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">Route Name</th>
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">Type</th>
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">Assigned Bus</th>
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">Stops</th>
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">Active</th>
                                <th className="px-6 py-3 text-right text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                            {loading ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" /></td></tr>
                            ) : routes.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16 text-center text-gray-400">
                                        <MapIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p className="font-bold">No routes defined</p>
                                        <p className="text-xs mt-1">Create your first route to get started</p>
                                    </td>
                                </tr>
                            ) : routes.map(route => (
                                <tr key={route.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                                                <MapIcon className="w-4 h-4 text-blue-600" />
                                            </div>
                                            <span className="font-bold text-gray-800 dark:text-white">{route.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold capitalize ${routeTypeBadge(route.route_type)}`}>
                                            {route.route_type || 'Both'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {route.bus?.bus_number
                                            ? <span className="font-medium text-gray-700 dark:text-slate-200">{route.bus.bus_number}</span>
                                            : <span className="text-gray-400 text-xs italic">Unassigned</span>}
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => router.push(`/admin/stops?route_id=${route.id}`)}
                                            className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs font-bold transition-all"
                                        >
                                            {route.stops?.length ?? 0} stops <ExternalLink className="w-3 h-3" />
                                        </button>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => toggleActive(route)}
                                            disabled={togglingId === route.id}
                                            className="transition-all"
                                        >
                                            {route.is_active
                                                ? <ToggleRight className="w-7 h-7 text-emerald-500" />
                                                : <ToggleLeft className="w-7 h-7 text-gray-400" />}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => openEdit(route)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"><Edit className="w-4 h-4" /></button>
                                            <button onClick={() => setDeleteId(route.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
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
                            <h2 className="text-lg font-black text-gray-900 dark:text-white">{editRoute ? 'Edit Route' : 'Add Route'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl text-gray-400 transition-all"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Route Name *</label>
                                <input required type="text" placeholder="e.g. North Morning Route" className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Route Type</label>
                                <select className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500" value={formData.route_type} onChange={e => setFormData({ ...formData, route_type: e.target.value as Route['route_type'] })}>
                                    <option value="morning">Morning</option>
                                    <option value="afternoon">Afternoon</option>
                                    <option value="both">Both</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Assign Bus</label>
                                <select className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500" value={formData.bus_id} onChange={e => setFormData({ ...formData, bus_id: e.target.value })}>
                                    <option value="">No bus assigned</option>
                                    {buses.map(b => <option key={b.id} value={b.id}>{b.bus_number}</option>)}
                                </select>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl font-semibold text-sm hover:bg-gray-50 dark:hover:bg-slate-800 transition-all">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-60">
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : editRoute ? 'Save Changes' : 'Create Route'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirm */}
            {deleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center">
                        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4"><Trash2 className="w-6 h-6 text-red-500" /></div>
                        <h3 className="font-black text-gray-900 dark:text-white mb-2">Delete this route?</h3>
                        <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">This will remove the route and its configuration.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl font-semibold text-sm hover:bg-gray-50 dark:hover:bg-slate-800 transition-all">Cancel</button>
                            <button onClick={() => handleDelete(deleteId)} className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-all">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
