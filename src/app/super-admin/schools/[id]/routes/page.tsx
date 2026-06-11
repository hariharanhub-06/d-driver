'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { MapPin, Plus, Edit, Trash2, X, ChevronDown, ArrowUpDown } from 'lucide-react';
import api from '@/lib/api';
import type { StopPoint } from '@/components/StopMap';
import { useT } from '@/lib/i18n';

const StopMap = dynamic(() => import('@/components/StopMap'), { ssr: false });

interface Route {
    id: string;
    name: string;
    route_type: 'morning' | 'afternoon' | 'both';
    start_point?: string;
    end_point?: string;
    is_active: boolean;
    bus?: { bus_number: string };
    stop_count?: number;
}

type Stop = StopPoint;

const emptyForm = { name: '', route_type: 'morning', start_point: '', end_point: '', is_active: true };
const inputCls = "w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors";

const typeBadge: Record<string, string> = {
    morning: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    afternoon: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    both: 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
};

export default function SchoolRoutesPage() {
    const { id } = useParams<{ id: string }>();
    const t = useT();
    const [routes, setRoutes] = useState<Route[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Route | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');

    // Stops state
    const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
    const [stops, setStops] = useState<Stop[]>([]);
    const [stopsLoading, setStopsLoading] = useState(false);
    const [addingStop, setAddingStop] = useState(false);
    const [stopTab, setStopTab] = useState<'morning' | 'evening'>('morning');
    const [copyingStops, setCopyingStops] = useState(false);
    const [reversingStops, setReversingStops] = useState(false);

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
        if (!window.confirm(t('Delete this route? This cannot be undone.', 'இந்த வழியை நீக்கவா? இதை மீண்டும் செய்ய முடியாது.'))) return;
        try {
            await api.delete(`/routes/${route.id}`);
            if (selectedRouteId === route.id) setSelectedRouteId(null);
            fetchRoutes();
        } catch (e: any) {
            alert(e.response?.data?.message || 'Failed to delete route.');
        }
    };

    const fetchStops = async (routeId: string) => {
        const res = await api.get(`/stops?route_id=${routeId}&school_id=${id}`);
        setStops(Array.isArray(res.data) ? res.data : []);
    };

    const openStops = async (routeId: string) => {
        if (selectedRouteId === routeId) { setSelectedRouteId(null); return; }
        setSelectedRouteId(routeId);
        setStopTab('morning');
        setStopsLoading(true);
        try {
            await fetchStops(routeId);
        } catch {
            setStops([]);
        } finally {
            setStopsLoading(false);
        }
    };

    const handleAddStop = async (data: { name: string; lat: number; lng: number; sequence: number; pickup_time: string }) => {
        setAddingStop(true);
        try {
            await api.post('/stops', {
                name: data.name,
                latitude: data.lat,
                longitude: data.lng,
                sequence: data.sequence,
                pickup_time: data.pickup_time || undefined,
                route_id: selectedRouteId,
                school_id: id,
                trip_type: stopTab,
            });
            await fetchStops(selectedRouteId!);
        } catch (e: any) {
            alert(e.response?.data?.message || 'Failed to add stop.');
        } finally {
            setAddingStop(false);
        }
    };

    const handleReverseSequence = async () => {
        const tabStops = stops.filter(s => (s as any).trip_type === stopTab || (stopTab === 'morning' && !(s as any).trip_type));
        if (tabStops.length < 2) { alert('Need at least 2 stops to reverse.'); return; }
        setReversingStops(true);
        try {
            const sorted = [...tabStops].sort((a, b) => a.sequence - b.sequence);
            const sequences = sorted.map(s => s.sequence);
            const reversed = [...sequences].reverse();
            await Promise.all(sorted.map((s, i) => api.put(`/stops/${s.id}`, { sequence: reversed[i] })));
            await fetchStops(selectedRouteId!);
        } catch (e: any) {
            alert(e.response?.data?.message || 'Failed to reverse sequence.');
        } finally {
            setReversingStops(false);
        }
    };

    const handleCopyMorningToEvening = async () => {
        const morningStops = stops.filter(s => !s.trip_type || s.trip_type === 'morning');
        if (morningStops.length === 0) { alert('No morning stops to copy.'); return; }
        setCopyingStops(true);
        try {
            for (const s of morningStops) {
                await api.post('/stops', {
                    name: s.name,
                    latitude: s.latitude,
                    longitude: s.longitude,
                    sequence: s.sequence,
                    pickup_time: s.pickup_time || undefined,
                    route_id: selectedRouteId,
                    school_id: id,
                    trip_type: 'evening',
                });
            }
            await fetchStops(selectedRouteId!);
        } catch (e: any) {
            alert(e.response?.data?.message || 'Failed to copy stops.');
        } finally {
            setCopyingStops(false);
        }
    };

    const handleDeleteStop = async (stopId: string) => {
        if (!window.confirm(t('Delete this stop? This cannot be undone.', 'இந்த நிறுத்தத்தை நீக்கவா? இதை மீண்டும் செய்ய முடியாது.'))) return;
        try {
            await api.delete(`/stops/${stopId}`);
            setStops(prev => prev.filter(s => s.id !== stopId));
        } catch (e: any) {
            alert(e.response?.data?.message || 'Failed to delete stop.');
        }
    };

    const selectedRoute = routes.find(r => r.id === selectedRouteId);

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
                                            <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border ${typeBadge[route.route_type] ?? ''}`}>
                                                {route.route_type === 'afternoon' ? 'Evening' : route.route_type === 'morning' ? 'Morning' : 'Both'}
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
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <button
                                                    onClick={() => openStops(route.id)}
                                                    className={`flex items-center gap-1.5 border rounded-xl px-3 py-1.5 font-semibold text-xs transition-colors ${selectedRouteId === route.id ? 'bg-[var(--brand)] border-[var(--brand)] text-white' : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-600'}`}
                                                >
                                                    <ChevronDown className="w-3 h-3" />
                                                    Stops{route.stop_count !== undefined ? ` (${route.stop_count})` : ''}
                                                </button>
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

            {/* Stops Panel */}
            {selectedRouteId && selectedRoute && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-2.5">
                            <MapPin className="w-4 h-4 text-[var(--brand)]" />
                            <span className="font-bold text-sm text-slate-900 dark:text-white">
                                Stops — <span className="text-[var(--brand)]">{selectedRoute.name}</span>
                            </span>
                            <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full px-2.5 py-0.5 font-medium">{stops.length}</span>
                        </div>
                        <button
                            onClick={() => setSelectedRouteId(null)}
                            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-slate-400 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Morning / Evening tabs */}
                    <div className="flex items-center gap-1 px-5 pt-4 pb-2 border-b border-slate-100 dark:border-slate-700">
                        {(['morning', 'evening'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setStopTab(tab)}
                                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all capitalize ${stopTab === tab ? 'bg-[var(--brand)] text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                            >
                                {tab === 'morning' ? '🌅 Morning' : '🌆 Evening'}
                                <span className="ml-1.5 opacity-70">
                                    ({stops.filter(s => (s as any).trip_type === tab || (tab === 'morning' && !(s as any).trip_type)).length})
                                </span>
                            </button>
                        ))}
                        <div className="ml-auto flex items-center gap-2">
                            <button
                                onClick={handleReverseSequence}
                                disabled={reversingStops}
                                className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                            >
                                {reversingStops ? <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> : <ArrowUpDown className="w-3 h-3" />}
                                Reverse
                            </button>
                            {stopTab === 'evening' && (
                                <button
                                    onClick={handleCopyMorningToEvening}
                                    disabled={copyingStops}
                                    className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400 rounded-xl px-3 py-1.5 text-xs font-semibold hover:bg-amber-100 transition-colors disabled:opacity-50"
                                >
                                    {copyingStops ? <div className="w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /> : '📋'}
                                    Copy from Morning
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="p-5">
                        {stopsLoading ? (
                            <div className="flex justify-center py-16">
                                <div className="w-7 h-7 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : (
                            <StopMap
                                stops={stops.filter(s => (s as any).trip_type === stopTab || (stopTab === 'morning' && !(s as any).trip_type))}
                                saving={addingStop}
                                onAddStop={handleAddStop}
                                onDeleteStop={handleDeleteStop}
                            />
                        )}
                    </div>
                </div>
            )}

            {modalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
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
                                    <option value="afternoon">Evening</option>
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
