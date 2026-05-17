'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { MapPin, Plus, Trash2, Edit, Search, X, Loader2, FileUp } from 'lucide-react';
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
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Stops & Waypoints</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage bus stops, pickup times and sequence order.</p>
                </div>
                <div className="flex gap-2">
                    <input ref={importRef} type="file" className="hidden" accept=".csv,.xlsx,.xls" onChange={handleImport} />
                    <button onClick={() => importRef.current?.click()} className="flex items-center gap-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-4 py-2.5 font-semibold text-sm">
                        <FileUp className="w-4 h-4" /> Import
                    </button>
                    <button onClick={openCreate} className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95">
                        <Plus className="w-4 h-4" /> Add Stop
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-4">
                <div className="flex gap-3 flex-wrap items-center">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search stops..."
                            className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 pl-9 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <select
                        className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors"
                        value={filterRoute}
                        onChange={e => setFilterRoute(e.target.value)}
                    >
                        <option value="">All Routes</option>
                        {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                    <span className="ml-auto self-center text-xs text-slate-400 font-semibold">{filtered.length} stops</span>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Seq</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Stop Name</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Route</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pickup</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Drop</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Coordinates</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} className="px-4 py-3">
                                    <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin"></div></div>
                                </td></tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-3">
                                        <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">
                                            <MapPin className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                            <p>No stops found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filtered.map(stop => (
                                <tr key={stop.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                        <span className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center">
                                            {stop.sequence ?? '—'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-orange-400 shrink-0" />
                                            <span className="font-semibold text-slate-800 dark:text-white">{stop.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                        <span className="inline-flex items-center bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full px-2.5 py-0.5 text-xs font-medium">{stop.route?.name || '—'}</span>
                                    </td>
                                    <td className="px-4 py-3 font-mono text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                                        {stop.pickup_time || '—'}
                                    </td>
                                    <td className="px-4 py-3 font-mono text-xs text-amber-600 dark:text-amber-400 font-semibold">
                                        {stop.drop_time || '—'}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-slate-400 font-mono">
                                        {stop.latitude && stop.longitude ? `${stop.latitude}, ${stop.longitude}` : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => openEdit(stop)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"><Edit className="w-4 h-4" /></button>
                                            <button onClick={() => setDeleteId(stop.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
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
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{editStop ? 'Edit Stop' : 'Add Bus Stop'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-400 transition-all"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Stop Name *</label>
                                <input required type="text" placeholder="e.g. Oak Street Junction" className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Route</label>
                                    <select className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[var(--brand)] transition-colors" value={formData.route_id} onChange={e => setFormData({ ...formData, route_id: e.target.value })}>
                                        <option value="">No route</option>
                                        {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Sequence</label>
                                    <input type="number" min="1" placeholder="1" className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors" value={formData.sequence} onChange={e => setFormData({ ...formData, sequence: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Pickup Time</label>
                                    <input type="time" className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[var(--brand)] transition-colors" value={formData.pickup_time} onChange={e => setFormData({ ...formData, pickup_time: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Drop Time</label>
                                    <input type="time" className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[var(--brand)] transition-colors" value={formData.drop_time} onChange={e => setFormData({ ...formData, drop_time: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Latitude</label>
                                    <input type="text" placeholder="12.9716" className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors" value={formData.latitude} onChange={e => setFormData({ ...formData, latitude: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Longitude</label>
                                    <input type="text" placeholder="77.5946" className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors" value={formData.longitude} onChange={e => setFormData({ ...formData, longitude: e.target.value })} />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 flex items-center gap-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-4 py-2.5 font-semibold text-sm justify-center">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="flex-1 flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95 justify-center disabled:opacity-60">
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : editStop ? 'Save Changes' : 'Add Stop'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirm */}
            {deleteId && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
                            <h3 className="font-bold text-slate-900 dark:text-white">Remove this stop?</h3>
                            <button onClick={() => setDeleteId(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 text-center">
                            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4"><Trash2 className="w-6 h-6 text-red-500" /></div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Students assigned to this stop will become unassigned.</p>
                            <div className="flex gap-3">
                                <button onClick={() => setDeleteId(null)} className="flex-1 flex items-center gap-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-4 py-2.5 font-semibold text-sm justify-center">Cancel</button>
                                <button onClick={() => handleDelete(deleteId)} className="flex-1 flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white rounded-xl px-4 py-2.5 font-semibold text-sm justify-center">Delete</button>
                            </div>
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
            <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin"></div></div>
        }>
            <StopsContent />
        </Suspense>
    );
}
