'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bus, Navigation, Bell, Fuel, AlertTriangle, CheckCircle, X, DollarSign, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from 'next-themes';
import api from '@/lib/api';
import { ta } from '@/lib/i18n';

interface DriverRoute { id: string; name: string; route_type?: string; }
interface DriverInfo {
    id: string;
    license_no?: string;
    user?: { id: string; name: string; phone?: string; email?: string };
    bus?: { id: string; bus_number: string; fuel_liters?: number; mileage?: number; routes?: DriverRoute[]; };
    school?: { id: string; name: string; primary_color?: string; slug?: string; logo_url?: string };
}
interface ActiveTrip { id: string; route_id: string; status: string; current_stop_index: number; }

// ── ALL EXISTING LOGIC PRESERVED — VERBATIM ───────────────────────────────
export default function DriverDashboard() {
    const { user, logout } = useAuth();
    const { theme, setTheme } = useTheme();
    const router = useRouter();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [driverInfo, setDriverInfo] = useState<DriverInfo | null>(null);
    const [activeTrips, setActiveTrips] = useState<ActiveTrip[]>([]);
    const [absenceCount, setAbsenceCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [showFuelModal, setShowFuelModal] = useState(false);
    const [fuelAmount, setFuelAmount] = useState('');
    const [fuelKm, setFuelKm] = useState('');
    const [fuelReason, setFuelReason] = useState('');
    const [fuelSubmitting, setFuelSubmitting] = useState(false);
    const [fuelSuccess, setFuelSuccess] = useState(false);

    const [showFuelFillModal, setShowFuelFillModal] = useState(false);
    const [fillLiters, setFillLiters] = useState('');
    const [fillKm, setFillKm] = useState('');

    const [pendingRouteId, setPendingRouteId] = useState<string | null>(null);
    const [showRouteTypeModal, setShowRouteTypeModal] = useState(false);
    const [startingTripType, setStartingTripType] = useState<string | null>(null);
    const [fillSubmitting, setFillSubmitting] = useState(false);
    const [fillSuccess, setFillSuccess] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        fetchAll();
        const interval = setInterval(fetchAll, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [driverRes, absenceRes, tripsRes] = await Promise.allSettled([
                api.get('/drivers/me'),
                api.get('/absence'),
                api.get('/trips/active'),
            ]);
            if (driverRes.status === 'fulfilled') {
                const d: DriverInfo = driverRes.value.data;
                setDriverInfo(d);
                if (d?.school?.primary_color) document.documentElement.style.setProperty('--brand', d.school.primary_color);
            }
            if (absenceRes.status === 'fulfilled') { const abs = absenceRes.value.data; setAbsenceCount(Array.isArray(abs) ? abs.length : 0); }
            if (tripsRes.status === 'fulfilled') { const data = tripsRes.value.data; setActiveTrips(Array.isArray(data) ? data : []); }
        } catch { setError('Failed to load dashboard data'); }
        finally { setLoading(false); }
    };

    const handleStartTrip = (routeId: string) => { setPendingRouteId(routeId); setShowRouteTypeModal(true); };

    const confirmStartTrip = async (routeType: string) => {
        if (!pendingRouteId || startingTripType) return;
        setStartingTripType(routeType);
        try {
            await api.post('/trips/start', { route_id: pendingRouteId, route_type: routeType });
            localStorage.setItem('driver_trip_type', routeType);
            router.push('/driver/ride');
        } catch (e: any) {
            setStartingTripType(null);
            alert(e.response?.data?.error || e.response?.data?.message || 'Failed to start trip');
        }
    };

    const handleFuelRequest = async () => {
        if (!fuelAmount) return;
        setFuelSubmitting(true);
        try {
            await api.post('/fuel/request', { bus_id: driverInfo?.bus?.id, amount_requested: parseFloat(fuelAmount), current_km: fuelKm ? parseFloat(fuelKm) : undefined, reason: fuelReason || undefined });
            setFuelSuccess(true);
            setFuelAmount(''); setFuelKm(''); setFuelReason('');
            setTimeout(() => { setShowFuelModal(false); setFuelSuccess(false); }, 1500);
        } catch (e: any) { alert(e.response?.data?.error || 'Failed to submit fuel request'); }
        finally { setFuelSubmitting(false); }
    };

    const handleFuelFill = async () => {
        if (!fillLiters) return;
        setFillSubmitting(true);
        try {
            await api.post('/fuel/fill', { bus_id: driverInfo?.bus?.id, liters_filled: parseFloat(fillLiters), km_at_fill: fillKm ? parseFloat(fillKm) : undefined });
            setFillSuccess(true);
            setFillLiters(''); setFillKm('');
            setTimeout(() => { setShowFuelFillModal(false); setFillSuccess(false); fetchAll(); }, 1500);
        } catch (e: any) { alert(e.response?.data?.error || 'Failed to log fuel fill'); }
        finally { setFillSubmitting(false); }
    };

    const getActiveTrip = (routeId: string) => activeTrips.find(t => t.route_id === routeId);
    const routes = driverInfo?.bus?.routes || [];
    const fuelLevel = driverInfo?.bus?.fuel_liters ?? null;
    const driverName = driverInfo?.user?.name || user?.name || 'Driver';
    const hasAnyActiveTrip = activeTrips.length > 0;

    // ─── NEW BILINGUAL UI ────────────────────────────────────────────────────
    const inputCls = "w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors";

    return (
        <div className="min-h-screen bg-slate-900">
            {/* ── Dark header ── */}
            <div className="bg-slate-900 px-4 pt-10 pb-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {driverInfo?.school?.logo_url ? (
                            <img src={driverInfo.school.logo_url} alt="" className="w-10 h-10 rounded-xl object-cover" />
                        ) : (
                            <div className="w-10 h-10 bg-[var(--brand)] rounded-xl flex items-center justify-center">
                                <Bus className="w-5 h-5 text-white" />
                            </div>
                        )}
                        <div>
                            <p className="text-white/60 text-xs">{driverInfo?.school?.name || 'D-Driver'}</p>
                            <h1 className="text-white font-black text-xl leading-tight">
                                {driverInfo?.bus?.bus_number || '—'}
                            </h1>
                            {routes.length > 0 && <p className="text-white/50 text-xs">{routes[0]?.name}</p>}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-xs">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                </div>

                {/* Absence alert */}
                {absenceCount > 0 && (
                    <div className="mt-3 bg-amber-500/20 border border-amber-500/30 rounded-xl px-4 py-3 flex items-center gap-2">
                        <Bell className="w-4 h-4 text-amber-400 shrink-0" />
                        <p className="text-amber-300 text-sm font-medium">{absenceCount} student{absenceCount > 1 ? 's' : ''} absent today</p>
                    </div>
                )}
                {error && (
                    <div className="mt-3 bg-red-500/20 border border-red-500/30 rounded-xl px-4 py-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" /><p className="text-red-300 text-sm">{error}</p>
                    </div>
                )}
            </div>

            <div className="px-4 space-y-3 pb-4">
                {/* Trip status card */}
                <div className="bg-slate-800 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-1">
                        <div className={`w-2 h-2 rounded-full ${hasAnyActiveTrip ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                        <p className={`text-xs font-bold uppercase tracking-widest ${hasAnyActiveTrip ? 'text-emerald-400' : 'text-slate-400'}`}>
                            {hasAnyActiveTrip ? `TRIP IN PROGRESS / ${ta.tripInProgress}` : `TRIP NOT STARTED / ${ta.tripNotStarted}`}
                        </p>
                    </div>
                </div>

                {/* Routes + Start/End buttons */}
                {loading ? (
                    <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" /></div>
                ) : routes.length === 0 ? (
                    <div className="bg-slate-800 rounded-2xl p-8 text-center">
                        <Navigation className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-400 text-sm">{driverInfo?.bus ? 'No routes assigned to your bus yet' : 'No bus assigned to you yet'}</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {routes.map(route => {
                            const activeTrip = getActiveTrip(route.id);
                            return (
                                <div key={route.id} className="bg-slate-800 rounded-2xl p-5 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-white font-bold">{route.name}</p>
                                            <p className="text-slate-400 text-xs mt-0.5">{ta.todayRoute}</p>
                                        </div>
                                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${activeTrip ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                                            {activeTrip ? '● Running' : '○ Ready'}
                                        </span>
                                    </div>
                                    {activeTrip ? (
                                        <a href="/driver/ride" className="flex items-center justify-center gap-2 w-full bg-[var(--brand)] text-white rounded-2xl px-4 py-4 font-black text-base active:scale-95 transition-all">
                                            <Navigation className="w-5 h-5" /> Open Live Map
                                        </a>
                                    ) : (
                                        <button onClick={() => handleStartTrip(route.id)} className="flex items-center justify-center gap-2 w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl px-4 py-4 font-black text-base active:scale-95 transition-all">
                                            ▶ {ta.startTrip}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Stats row */}
                {driverInfo?.bus && (
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-slate-800 rounded-2xl p-4 text-center">
                            <p className="text-white font-black text-xl">{fuelLevel != null ? `${Math.round(fuelLevel)}L` : '—'}</p>
                            <p className="text-slate-400 text-xs mt-0.5">Fuel</p>
                        </div>
                        <div className="bg-slate-800 rounded-2xl p-4 text-center">
                            <p className="text-white font-black text-xl">{routes.length}</p>
                            <p className="text-slate-400 text-xs mt-0.5">Routes</p>
                        </div>
                        <div className="bg-slate-800 rounded-2xl p-4 text-center">
                            <p className={`font-black text-xl ${(fuelLevel ?? 100) < 10 ? 'text-red-400' : (fuelLevel ?? 100) < 30 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                {fuelLevel != null ? ((fuelLevel / (driverInfo?.bus?.mileage ? driverInfo.bus.mileage * 10 : 100)) * 100).toFixed(0) + '%' : '—'}
                            </p>
                            <p className="text-slate-400 text-xs mt-0.5">Fuel %</p>
                        </div>
                    </div>
                )}

                {/* Quick Actions */}
                {driverInfo?.bus && (
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => { setShowFuelFillModal(true); setFillSuccess(false); setFillLiters(''); setFillKm(''); }} className="bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-2xl p-4 font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all">
                            <Fuel className="w-4 h-4" /> Log Fuel Fill
                        </button>
                        <button onClick={() => { setShowFuelModal(true); setFuelSuccess(false); }} className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-2xl p-4 font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all">
                            <DollarSign className="w-4 h-4" /> Request Fund
                        </button>
                    </div>
                )}
            </div>

            {/* ── MODALS — IDENTICAL to original ─────────────────────────────────── */}
            {showFuelModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Request Fuel Fund</h3>
                            <button onClick={() => setShowFuelModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            {fuelSuccess ? (
                                <div className="flex flex-col items-center py-6 gap-3">
                                    <CheckCircle className="w-12 h-12 text-emerald-500" />
                                    <p className="text-base font-bold text-slate-900 dark:text-white">Request Sent!</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Admin will review your request</p>
                                </div>
                            ) : (
                                <>
                                    <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Amount Requested (₹) *</label><input type="number" value={fuelAmount} onChange={e => setFuelAmount(e.target.value)} placeholder="e.g. 2000" className={inputCls} /></div>
                                    <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Current Odometer (km)</label><input type="number" min="0" value={fuelKm} onChange={e => setFuelKm(e.target.value)} placeholder="e.g. 45230" className={inputCls} /></div>
                                    <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Reason (optional)</label><input type="text" value={fuelReason} onChange={e => setFuelReason(e.target.value)} placeholder="e.g. Low fuel" className={inputCls} /></div>
                                    <div className="flex gap-3 pt-2">
                                        <button onClick={() => setShowFuelModal(false)} className="flex-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-4 py-2.5 font-semibold text-sm">Cancel</button>
                                        <button onClick={handleFuelRequest} disabled={!fuelAmount || fuelSubmitting} className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl px-4 py-2.5 font-semibold text-sm disabled:opacity-50">
                                            {fuelSubmitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Submit Request'}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showFuelFillModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2"><Fuel className="w-5 h-5 text-amber-500" /> Log Fuel Fill</h3>
                            <button onClick={() => setShowFuelFillModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            {fillSuccess ? (
                                <div className="flex flex-col items-center py-6 gap-3">
                                    <CheckCircle className="w-12 h-12 text-emerald-500" />
                                    <p className="text-base font-bold text-slate-900 dark:text-white">Fuel Logged!</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Bus fuel level updated</p>
                                </div>
                            ) : (
                                <>
                                    <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Litres Filled <span className="text-red-500">*</span></label><input type="number" value={fillLiters} onChange={e => setFillLiters(e.target.value)} placeholder="e.g. 40" className={inputCls} autoFocus /></div>
                                    <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Current Odometer (km)</label><input type="number" min="0" value={fillKm} onChange={e => setFillKm(e.target.value)} placeholder="e.g. 45230" className={inputCls} /></div>
                                    <div className="flex gap-3 pt-2">
                                        <button onClick={() => setShowFuelFillModal(false)} className="flex-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-4 py-2.5 font-semibold text-sm">Cancel</button>
                                        <button onClick={handleFuelFill} disabled={!fillLiters || fillSubmitting} className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl px-4 py-2.5 font-semibold text-sm disabled:opacity-50">
                                            {fillSubmitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Log Fill'}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showRouteTypeModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-xs p-6">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white text-center mb-1">Select Trip Type</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6">Which route are you running?</p>
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <button onClick={() => confirmStartTrip('morning')} disabled={!!startingTripType} className="flex flex-col items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-700 hover:border-amber-400 rounded-xl p-4 transition-all active:scale-95 disabled:opacity-60">
                                {startingTripType === 'morning' ? <Loader2 className="w-7 h-7 text-amber-600 animate-spin" /> : <span className="text-2xl">🌅</span>}
                                <span className="text-sm font-bold text-amber-700 dark:text-amber-400">Morning</span>
                                <span className="text-xs text-slate-500">Pickup route</span>
                            </button>
                            <button onClick={() => confirmStartTrip('afternoon')} disabled={!!startingTripType} className="flex flex-col items-center gap-2 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-700 hover:border-blue-400 rounded-xl p-4 transition-all active:scale-95 disabled:opacity-60">
                                {startingTripType === 'afternoon' ? <Loader2 className="w-7 h-7 text-blue-600 animate-spin" /> : <span className="text-2xl">🌆</span>}
                                <span className="text-sm font-bold text-blue-700 dark:text-blue-400">Evening</span>
                                <span className="text-xs text-slate-500">Drop route</span>
                            </button>
                        </div>
                        <button onClick={() => { setShowRouteTypeModal(false); setStartingTripType(null); }} disabled={!!startingTripType} className="w-full py-2.5 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 disabled:opacity-40">Cancel</button>
                    </div>
                </div>
            )}
        </div>
    );
}
