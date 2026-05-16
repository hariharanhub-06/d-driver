'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { MapPin, Plus, Trash2, Edit, Search, X, Loader2, FileUp, Clock } from 'lucide-react';
import api from '@/lib/api';
import { useSearchParams } from 'next/navigation';

type Stop = {
    id: string;
    name: string;
    sequence?: number;
    pickup_time?: string;
    drop_time?: string;
    latitude?: number;
    longitude?: number;
    route?: { id: string; name: string };
    route_id?: string;
    students_count?: number;
};

type Route = { id: string; name: string };

const EMPTY_FORM = { name: '', route_id: '', sequence: '', latitude: '', longitude: '', pickup_time: '07:00', drop_time: '15:30' };

function StopsContent() {
    const searchParams = useSearchParams();
    const initialRouteId = searchParams.get('route_id') || '';

    const [stops, setStops] = useState<Stop[]>([]);
    const [routes, setRoutes] = useState<Route[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterRoute, setFilterRoute] = useState(initialRouteId);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editStop, setEditStop] = useState<Stop | null>(null);
    const [formData, setFormData] = useState({ ...EMPTY_FORM, route_id: initialRouteId });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const importRef = useRef<HTMLInputElement>(null);

    useEffect(() => { fetchRoutes(); }, []);
    useEffect(() => { fetchStops(); }, [filterRoute]);

    const fetchStops = async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (filterRoute) params.route_id = filterRoute;
            const { data } = await api.get('/stops', { params });
            setStops(Array.isArray(data) ? data : []);
        } catch {
            setStops([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchRoutes = async () => {
        try {
            const { data } = await api.get('/routes');
            setRoutes(Array.isArray(data) ? data : []);
        } catch { setRoutes([]); }
    };

    const openCreate = () => {
        setEditStop(null);
        setFormData({ ...EMPTY_FORM, route_id: filterRoute });
        setIsModalOpen(true);
    };

    const openEdit = (s: Stop) => {
        setEditStop(s);
        setFormData({
            name: s.name,
            route_id: s.route_id || s.route?.id || '',
            sequence: s.sequence ? String(s.sequence) : '',
            latitude: s.latitude ? String(s.latitude) : '',
            longitude: s.longitude ? String(s.longitude) : '',
            pickup_time: s.pickup_time || '07:00',
            drop_time: s.drop_time || '15:30',
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload: any = {
                name: formData.name,
                route_id: formData.route_id,
                pickup_time: formData.pickup_time,
                drop_time: formData.drop_time,
                ...(formData.sequence && { sequence: parseInt(formData.sequence) }),
                ...(formData.latitude && { latitude: parseFloat(formData.latitude) }),
                ...(formData.longitude && { longitude: parseFloat(formData.longitude) }),
            };
            if (editStop) {
                await api.put(`/stops/${editStop.id}`, payload);
                setStops(prev => prev.map(s => s.id === editStop.id ? { ...s, ...payload } : s));
            } else {
                const { data } = await api.post('/stops', payload);
                setStops(prev => [...prev, data || { id: Date.now().toString(), ...payload }]);
            }
            setIsModalOpen(false);
        } catch {
            setIsModalOpen(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        try { await api.delete(`/stops/${id}`); } catch { /* ignore */ }
        setStops(prev => prev.filter(s => s.id !== id));
        setDeleteId(null);
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const fd = new FormData();
        fd.append('file', file);
        try { await api.post('/stops/bulk', fd); fetchStops(); } catch { /* ignore */ }
        if (importRef.current) importRef.current.value = '';
    };

    const filtered = stops.filter(s =>
        s.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.route?.name?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Stops & Waypoints</h1>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Manage bus stops, pickup times and sequence order.</p>
                </div>
                <div className="flex gap-2">
                    <input ref={importRef} type="file" className="hidden" accept=".csv,.xlsx,.xls" onChange={handleImport} />
                    <button onClick={() => importRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-xl font-semibold text-sm transition-all">
                        <FileUp className="w-4 h-4" /> Import
                    </button>
                    <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-all">
                        <Plus className="w-4 h-4" /> Add Stop
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-3 flex-wrap">
                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Search stops..." className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-56" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={filterRoute} onChange={e => setFilterRoute(e.target.value)}>
                    <option value="">All Routes</option>
                    {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <span className="ml-auto self-center text-xs text-gray-400 font-bold">{filtered.length} stops</span>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-slate-800">
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">Seq</th>
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">Stop Name</th>
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">Route</th>
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">Pickup</th>
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">Drop</th>
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">Coordinates</th>
                                <th className="px-6 py-3 text-right text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                            {loading ? (
                                <tr><td colSpan={7} className="px-6 py-12 text-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" /></td></tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-16 text-center text-gray-400">
                                        <MapPin className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p className="font-bold">No stops found</p>
                                    </td>
                                </tr>
                            ) : filtered.map(stop => (
                                <tr key={stop.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <span className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-black flex items-center justify-center">
                                            {stop.sequence ?? '—'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-orange-400 shrink-0" />
                                            <span className="font-bold text-gray-800 dark:text-white">{stop.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-bold">{stop.route?.name || '—'}</span>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                                        {stop.pickup_time || '—'}
                                    </td>
                                    <td className="px-6 py-4 font-mono text-xs text-amber-600 dark:text-amber-400 font-bold">
                                        {stop.drop_time || '—'}
                                    </td>
                                    <td className="px-6 py-4 text-xs text-gray-400 font-mono">
                                        {stop.latitude && stop.longitude ? `${stop.latitude}, ${stop.longitude}` : '—'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => openEdit(stop)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"><Edit className="w-4 h-4" /></button>
                                            <button onClick={() => setDeleteId(stop.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
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
                            <h2 className="text-lg font-black text-gray-900 dark:text-white">{editStop ? 'Edit Stop' : 'Add Bus Stop'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl text-gray-400 transition-all"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Stop Name *</label>
                                <input required type="text" placeholder="e.g. Oak Street Junction" className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Route</label>
                                    <select className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500" value={formData.route_id} onChange={e => setFormData({ ...formData, route_id: e.target.value })}>
                                        <option value="">No route</option>
                                        {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Sequence</label>
                                    <input type="number" min="1" placeholder="1" className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500" value={formData.sequence} onChange={e => setFormData({ ...formData, sequence: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Pickup Time</label>
                                    <input type="time" className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500" value={formData.pickup_time} onChange={e => setFormData({ ...formData, pickup_time: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Drop Time</label>
                                    <input type="time" className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500" value={formData.drop_time} onChange={e => setFormData({ ...formData, drop_time: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Latitude</label>
                                    <input type="text" placeholder="12.9716" className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500" value={formData.latitude} onChange={e => setFormData({ ...formData, latitude: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Longitude</label>
                                    <input type="text" placeholder="77.5946" className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500" value={formData.longitude} onChange={e => setFormData({ ...formData, longitude: e.target.value })} />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl font-semibold text-sm hover:bg-gray-50 dark:hover:bg-slate-800 transition-all">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-60">
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : editStop ? 'Save Changes' : 'Add Stop'}
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
                        <h3 className="font-black text-gray-900 dark:text-white mb-2">Remove this stop?</h3>
                        <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">Students assigned to this stop will become unassigned.</p>
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

export default function StopsPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        }>
            <StopsContent />
        </Suspense>
    );
}
