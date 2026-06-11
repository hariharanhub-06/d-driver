'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Plus, Edit, Trash2, Map as MapIcon, X, Loader2, ToggleLeft, ToggleRight, MapPin, ChevronDown, ArrowUpDown } from 'lucide-react';
import api from '@/lib/api';
import type { StopPoint } from '@/components/StopMap';
import { useT } from '@/lib/i18n';

const StopMap = dynamic(() => import('@/components/StopMap'), { ssr: false });

type Route = {
    id: string;
    name: string;
    route_type?: 'morning' | 'afternoon' | 'both';
    is_active?: boolean;
    bus?: { bus_number: string };
    bus_id?: string;
    stops?: any[];
    stop_count?: number;
};

type Bus = { id: string; bus_number: string };
type Stop = StopPoint;

const routeTypeBadge = (t?: string) => {
    if (t === 'morning') return 'inline-flex items-center bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full px-2.5 py-0.5 text-xs font-medium';
    if (t === 'afternoon') return 'inline-flex items-center bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full px-2.5 py-0.5 text-xs font-medium';
    return 'inline-flex items-center bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full px-2.5 py-0.5 text-xs font-medium';
};

const EMPTY_FORM = { name: '', route_type: 'both' as Route['route_type'], bus_id: '' };

export default function RoutesPage() {
    const t = useT();
    const [routes, setRoutes] = useState<Route[]>([]);
    const [buses, setBuses] = useState<Bus[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editRoute, setEditRoute] = useState<Route | null>(null);
    const [formData, setFormData] = useState({ ...EMPTY_FORM });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [togglingId, setTogglingId] = useState<string | null>(null);
    const [fetchError, setFetchError] = useState('');
    const [formError, setFormError] = useState('');

    // Stops state
    const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
    const [stops, setStops] = useState<Stop[]>([]);
    const [stopsLoading, setStopsLoading] = useState(false);
    const [addingStop, setAddingStop] = useState(false);
    const [stopTab, setStopTab] = useState<'morning' | 'evening'>('morning');
    const [copyingStops, setCopyingStops] = useState(false);
    const [reversingStops, setReversingStops] = useState(false);

    useEffect(() => { fetchRoutes(); fetchBuses(); }, []);

    const fetchRoutes = async () => {
        setLoading(true);
        setFetchError('');
        try {
            const { data } = await api.get('/routes');
            setRoutes(Array.isArray(data) ? data : []);
        } catch {
            setRoutes([]);
            setFetchError('Failed to load routes. Please refresh.');
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

    const fetchStops = async (routeId: string) => {
        const { data } = await api.get(`/stops?route_id=${routeId}`);
        setStops(Array.isArray(data) ? data : []);
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
                trip_type: stopTab,
            });
            await fetchStops(selectedRouteId!);
        } catch (e: any) {
            alert(e.response?.data?.message || 'Failed to add stop.');
        } finally {
            setAddingStop(false);
        }
    };

    const handleDeleteStop = async (stopId: string) => {
        if (!window.confirm('Delete this stop? This cannot be undone.')) return;
        try {
            await api.delete(`/stops/${stopId}`);
            setStops(prev => prev.filter(s => s.id !== stopId));
        } catch (e: any) {
            alert(e.response?.data?.message || 'Failed to delete stop.');
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

    const openCreate = () => {
        setEditRoute(null);
        setFormData({ ...EMPTY_FORM });
        setFormError('');
        setIsModalOpen(true);
    };

    const openEdit = (r: Route) => {
        setEditRoute(r);
        setFormData({ name: r.name, route_type: r.route_type || 'both', bus_id: r.bus_id || '' });
        setFormError('');
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
        } catch (err: any) {
            setFormError(err.response?.data?.error || 'Failed to save. Try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        try { await api.delete(`/routes/${id}`); } catch { /* ignore */ }
        if (selectedRouteId === id) setSelectedRouteId(null);
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

    const selectedRoute = routes.find(r => r.id === selectedRouteId);
    const inputCls = "w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors";
    const labelCls = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5";

    return (
        <div className="space-y-6 animate-in">
            {fetchError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-300 flex items-center justify-between">
                    <span>{fetchError}</span>
                    <button onClick={fetchRoutes} className="font-medium underline ml-3">{t('Retry', 'மீண்டும் முயற்சி')}</button>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('Routes & Stops', 'வழிகள் & நிறுத்தங்கள்')}</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('Manage transport routes, bus assignments, and stops.', 'போக்குவரத்து வழிகள், பேருந்து ஒதுக்கீடுகள் மற்றும் நிறுத்தங்களை நிர்வகிக்கவும்.')}</p>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95"
                >
                    <Plus className="w-4 h-4" /> {t('Add Route', 'வழி சேர்')}
                </button>
            </div>

            {/* Routes Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('Route Name', 'வழி பெயர்')}</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('Type', 'வகை')}</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('Assigned Bus', 'ஒதுக்கப்பட்ட பேருந்து')}</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('Active', 'செயல்பாட்டில்')}</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('Actions', 'செயல்கள்')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-3">
                                        <div className="flex justify-center py-16">
                                            <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                    </td>
                                </tr>
                            ) : routes.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">
                                        <MapIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                        <p className="font-medium">{t('No routes defined', 'வழிகள் இல்லை')}</p>
                                        <p className="text-xs mt-1">{t('Create your first route to get started', 'தொடங்க உங்கள் முதல் வழியை உருவாக்கவும்')}</p>
                                    </td>
                                </tr>
                            ) : routes.map(route => (
                                <tr key={route.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-[var(--brand)]/10 flex items-center justify-center">
                                                <MapIcon className="w-4 h-4 text-[var(--brand)]" />
                                            </div>
                                            <span className="font-semibold text-slate-800 dark:text-white">{route.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={routeTypeBadge(route.route_type)}>
                                            {route.route_type === 'afternoon' ? t('Evening', 'மாலை') : route.route_type === 'morning' ? t('Morning', 'காலை') : t('Both', 'இரண்டும்')}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                        {route.bus?.bus_number
                                            ? <span className="font-medium">{route.bus.bus_number}</span>
                                            : <span className="text-slate-400 text-xs italic">{t('Unassigned', 'ஒதுக்கப்படவில்லை')}</span>}
                                    </td>
                                    <td className="px-4 py-3">
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
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <button
                                                onClick={() => openStops(route.id)}
                                                className={`flex items-center gap-1.5 border rounded-xl px-3 py-1.5 font-semibold text-xs transition-colors ${selectedRouteId === route.id ? 'bg-[var(--brand)] border-[var(--brand)] text-white' : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-600'}`}
                                            >
                                                <ChevronDown className="w-3 h-3" />
                                                {t('Stops', 'நிறுத்தங்கள்')} ({route.stops?.length ?? route.stop_count ?? 0})
                                            </button>
                                            <button onClick={() => openEdit(route)} className="flex items-center gap-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-3 py-1.5 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                                                <Edit className="w-3 h-3" /> {t('Edit', 'திருத்து')}
                                            </button>
                                            <button onClick={() => setDeleteId(route.id)} className="flex items-center gap-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl px-3 py-1.5 font-semibold text-xs hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
                                                <Trash2 className="w-3 h-3" /> {t('Delete', 'நீக்கு')}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Stops Panel */}
            {selectedRouteId && selectedRoute && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-2.5">
                            <MapPin className="w-4 h-4 text-[var(--brand)]" />
                            <span className="font-bold text-sm text-slate-900 dark:text-white">
                                {t('Stops', 'நிறுத்தங்கள்')} — <span className="text-[var(--brand)]">{selectedRoute.name}</span>
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
                                {tab === 'morning' ? `🌅 ${t('Morning', 'காலை')}` : `🌆 ${t('Evening', 'மாலை')}`}
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
                                {t('Reverse', 'தலைகீழ்')}
                            </button>
                            {stopTab === 'evening' && (
                                <button
                                    onClick={handleCopyMorningToEvening}
                                    disabled={copyingStops}
                                    className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400 rounded-xl px-3 py-1.5 text-xs font-semibold hover:bg-amber-100 transition-colors disabled:opacity-50"
                                >
                                    {copyingStops ? <div className="w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /> : '📋'}
                                    {t('Copy from Morning', 'காலையிலிருந்து நகலெடு')}
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

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{editRoute ? t('Edit Route', 'வழி திருத்து') : t('Add Route', 'வழி சேர்')}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-400 transition-all"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className={labelCls}>{t('Route Name', 'வழி பெயர்')} *</label>
                                <input required type="text" placeholder="e.g. North Morning Route" className={inputCls} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div>
                                <label className={labelCls}>{t('Route Type', 'வழி வகை')}</label>
                                <select className={inputCls} value={formData.route_type} onChange={e => setFormData({ ...formData, route_type: e.target.value as Route['route_type'] })}>
                                    <option value="morning">{t('Morning', 'காலை')}</option>
                                    <option value="afternoon">{t('Evening', 'மாலை')}</option>
                                    <option value="both">{t('Both', 'இரண்டும்')}</option>
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>{t('Assign Bus', 'பேருந்து ஒதுக்கு')}</label>
                                <select className={inputCls} value={formData.bus_id} onChange={e => setFormData({ ...formData, bus_id: e.target.value })}>
                                    <option value="">{t('No bus assigned', 'பேருந்து ஒதுக்கப்படவில்லை')}</option>
                                    {buses.map(b => <option key={b.id} value={b.id}>{b.bus_number}</option>)}
                                </select>
                            </div>
                            {formError && (
                                <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-2.5">{formError}</div>
                            )}
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all"
                                >
                                    {t('Cancel', 'ரத்து செய்')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 flex items-center justify-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95 disabled:opacity-60"
                                >
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : editRoute ? t('Save Changes', 'மாற்றங்களை சேமி') : t('Create Route', 'வழி உருவாக்கு')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirm */}
            {deleteId && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm">
                        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('Delete this route?', 'இந்த வழியை நீக்கவா?')}</h3>
                            <button onClick={() => setDeleteId(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 text-center">
                            <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="w-6 h-6 text-red-500" />
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{t('This will remove the route and its configuration.', 'இது வழியையும் அதன் அமைப்பையும் அகற்றும்.')}</p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeleteId(null)}
                                    className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all"
                                >
                                    {t('Cancel', 'ரத்து செய்')}
                                </button>
                                <button
                                    onClick={() => handleDelete(deleteId)}
                                    className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95"
                                >
                                    {t('Delete', 'நீக்கு')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
