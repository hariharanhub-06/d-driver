'use client';

import { useState, useEffect } from 'react';
import { Bus, Navigation, Bell, Fuel, AlertTriangle, CheckCircle, LogOut, X, Moon, Sun, DollarSign } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from 'next-themes';
import api from '@/lib/api';

interface DriverRoute {
    id: string;
    name: string;
}

interface DriverInfo {
    id: string;
    license_no?: string;
    user?: { id: string; name: string; phone?: string; email?: string };
    bus?: {
        id: string;
        bus_number: string;
        fuel_liters?: number;
        mileage?: number;
        routes?: DriverRoute[];
    };
    school?: { id: string; name: string; primary_color?: string; slug?: string; logo_url?: string };
}

interface ActiveTrip {
    id: string;
    route_id: string;
    status: string;
    current_stop_index: number;
}

interface Shift {
    id: string;
    start_km: number;
    status: string;
}

export default function DriverDashboard() {
    const { user, logout } = useAuth();
    const { theme, setTheme } = useTheme();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [driverInfo, setDriverInfo] = useState<DriverInfo | null>(null);
    const [activeShift, setActiveShift] = useState<Shift | null>(null);
    const [activeTrips, setActiveTrips] = useState<ActiveTrip[]>([]);
    const [absenceCount, setAbsenceCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [showKmDialog, setShowKmDialog] = useState(false);
    const [kmDialogMode, setKmDialogMode] = useState<'start' | 'end'>('start');
    const [kmValue, setKmValue] = useState('');
    const [kmSubmitting, setKmSubmitting] = useState(false);

    const [showFuelModal, setShowFuelModal] = useState(false);
    const [fuelAmount, setFuelAmount] = useState('');
    const [fuelKm, setFuelKm] = useState('');
    const [fuelReason, setFuelReason] = useState('');
    const [fuelSubmitting, setFuelSubmitting] = useState(false);
    const [fuelSuccess, setFuelSuccess] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => { fetchAll(); }, []);

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
                if (d?.school?.primary_color) {
                    document.documentElement.style.setProperty('--brand', d.school.primary_color);
                }
            }

            if (absenceRes.status === 'fulfilled') {
                const abs = absenceRes.value.data;
                setAbsenceCount(Array.isArray(abs) ? abs.length : 0);
            }

            if (tripsRes.status === 'fulfilled') {
                const data = tripsRes.value.data;
                setActiveTrips(Array.isArray(data) ? data : []);
            }

            try {
                const shiftRes = await api.get('/shifts/active');
                setActiveShift(shiftRes.data || null);
            } catch {
                setActiveShift(null);
            }
        } catch {
            setError('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const openShiftDialog = (mode: 'start' | 'end') => {
        setKmDialogMode(mode);
        setKmValue('');
        setShowKmDialog(true);
    };

    const handleShiftAction = async () => {
        if (!kmValue) return;
        setKmSubmitting(true);
        try {
            if (kmDialogMode === 'start') {
                const res = await api.post('/shifts/start', {
                    bus_id: driverInfo?.bus?.id,
                    start_km: parseFloat(kmValue),
                });
                setActiveShift(res.data);
            } else {
                await api.post('/shifts/end', { end_km: parseFloat(kmValue) });
                setActiveShift(null);
            }
            setShowKmDialog(false);
        } catch (e: any) {
            alert(e.response?.data?.error || e.response?.data?.message || 'Action failed');
        } finally {
            setKmSubmitting(false);
        }
    };

    const handleStartTrip = async (routeId: string) => {
        try {
            await api.post('/trips/start', { route_id: routeId });
            await fetchAll();
        } catch (e: any) {
            alert(e.response?.data?.error || e.response?.data?.message || 'Failed to start trip');
        }
    };

    const handleFuelRequest = async () => {
        if (!fuelAmount) return;
        setFuelSubmitting(true);
        try {
            await api.post('/fuel/request', {
                bus_id: driverInfo?.bus?.id,
                amount_requested: parseFloat(fuelAmount),
                current_km: fuelKm ? parseFloat(fuelKm) : undefined,
                reason: fuelReason || undefined,
            });
            setFuelSuccess(true);
            setFuelAmount('');
            setFuelKm('');
            setFuelReason('');
            setTimeout(() => { setShowFuelModal(false); setFuelSuccess(false); }, 1500);
        } catch (e: any) {
            alert(e.response?.data?.error || 'Failed to submit fuel request');
        } finally {
            setFuelSubmitting(false);
        }
    };

    const getActiveTrip = (routeId: string) => activeTrips.find(t => t.route_id === routeId);

    const routes = driverInfo?.bus?.routes || [];
    const fuelLevel = driverInfo?.bus?.fuel_liters ?? 0;
    const driverName = driverInfo?.user?.name || user?.name || 'Driver';

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-8">
            <header className="bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 px-4 h-14 flex items-center justify-between sticky top-0 z-40">
                <div className="flex items-center gap-3">
                    {driverInfo?.school?.logo_url ? (
                        <img src={driverInfo.school.logo_url} alt={driverInfo.school.name || 'School'} className="w-9 h-9 rounded-xl object-cover" />
                    ) : (
                        <div className="w-9 h-9 rounded-xl bg-[var(--brand)] flex items-center justify-center shadow-sm">
                            <Bus className="w-5 h-5 text-white" />
                        </div>
                    )}
                    <div>
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-none">
                            {driverInfo?.school?.name || 'D-Driver'}
                        </h2>
                        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Driver Console</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-slate-400 dark:text-slate-500 text-xs font-medium hidden sm:block">
                        {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        className="w-9 h-9 bg-slate-50 dark:bg-slate-700 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                        title="Toggle theme"
                    >
                        {theme === 'dark'
                            ? <Sun className="w-4 h-4 text-amber-400" />
                            : <Moon className="w-4 h-4 text-slate-500" />}
                    </button>
                    <button
                        onClick={logout}
                        className="w-9 h-9 bg-slate-50 dark:bg-slate-700 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                        title="Logout"
                    >
                        <LogOut className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    </button>
                </div>
            </header>

            <div className="space-y-4 p-4">
                <div>
                    <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                        {loading ? 'Loading...' : `Hey, ${driverName.split(' ')[0]}`}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 text-red-600 dark:text-red-400 text-sm font-semibold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
                    </div>
                )}

                {absenceCount > 0 && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex items-center gap-3">
                        <Bell className="w-5 h-5 text-amber-500 shrink-0" />
                        <p className="text-amber-700 dark:text-amber-300 text-sm font-semibold">
                            {absenceCount} student{absenceCount > 1 ? 's' : ''} absent today on your route
                        </p>
                    </div>
                )}

                {/* Shift Status */}
                {activeShift ? (
                    <div className="bg-[var(--brand)] text-white rounded-2xl p-6 shadow-lg">
                        <div className="flex justify-between items-start mb-5">
                            <div>
                                <p className="text-white/70 text-xs font-medium uppercase tracking-widest mb-2">Shift Status</p>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                    <span className="text-white text-sm font-bold uppercase tracking-widest">Shift Active</span>
                                </div>
                            </div>
                            {driverInfo?.bus && (
                                <div className="text-right">
                                    <p className="text-white/70 text-xs font-medium uppercase tracking-widest">Assigned Bus</p>
                                    <p className="text-2xl font-bold text-white mt-1">{driverInfo.bus.bus_number}</p>
                                </div>
                            )}
                        </div>
                        {driverInfo?.license_no && (
                            <p className="text-white/70 text-xs font-medium mb-5">License: {driverInfo.license_no}</p>
                        )}
                        <button
                            onClick={() => openShiftDialog('end')}
                            className="w-full py-2.5 bg-white text-[var(--brand)] hover:bg-white/90 rounded-xl font-bold text-sm active:scale-95 transition-all"
                        >
                            End Shift
                        </button>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
                        <div className="flex justify-between items-start mb-5">
                            <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-widest mb-2">Shift Status</p>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                                    <span className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-widest">No Active Shift</span>
                                </div>
                            </div>
                            {driverInfo?.bus && (
                                <div className="text-right">
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-widest">Assigned Bus</p>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{driverInfo.bus.bus_number}</p>
                                </div>
                            )}
                        </div>
                        {driverInfo?.license_no && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-5">License: {driverInfo.license_no}</p>
                        )}
                        <button
                            onClick={() => openShiftDialog('start')}
                            className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95 w-full justify-center"
                        >
                            Start Shift
                        </button>
                    </div>
                )}

                {/* Fuel Status */}
                {driverInfo?.bus && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Fuel className="w-4 h-4 text-amber-500" />
                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Fuel Level</span>
                            </div>
                            <span className="text-sm font-bold text-slate-900 dark:text-white">{Math.round(fuelLevel)}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-1000 ${fuelLevel > 50 ? 'bg-emerald-500' : fuelLevel > 25 ? 'bg-amber-500' : 'bg-red-500'}`}
                                style={{ width: `${Math.min(Math.max(fuelLevel, 0), 100)}%` }}
                            />
                        </div>
                        {fuelLevel < 25 && (
                            <p className="text-red-500 dark:text-red-400 text-xs font-medium mt-2">Low fuel — plan refuel</p>
                        )}
                    </div>
                )}

                {/* Fuel Request */}
                {driverInfo?.bus && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
                                <DollarSign className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">Fuel Fund Request</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Request funds from admin</p>
                            </div>
                        </div>
                        <button
                            onClick={() => { setShowFuelModal(true); setFuelSuccess(false); }}
                            className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl px-4 py-2 text-sm font-semibold active:scale-95 transition-all"
                        >
                            Request
                        </button>
                    </div>
                )}

                {/* Today's Routes — from driver's bus.routes */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Today's Routes</h2>
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                            {loading ? '...' : `${routes.length} assigned`}
                        </span>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : routes.length === 0 ? (
                        <div className="text-center py-8">
                            <Navigation className="w-8 h-8 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {driverInfo?.bus ? 'No routes assigned to your bus yet' : 'No bus assigned to you yet'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {routes.map((route) => {
                                const activeTrip = getActiveTrip(route.id);
                                return (
                                    <div key={route.id} className="border border-slate-100 dark:border-slate-700 rounded-xl p-4">
                                        <div className="flex justify-between items-center mb-3">
                                            <h4 className="font-bold text-slate-900 dark:text-white">{route.name}</h4>
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${activeTrip ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                                                {activeTrip ? 'Running' : 'Ready'}
                                            </span>
                                        </div>
                                        {activeTrip ? (
                                            <a
                                                href="/driver/ride"
                                                className="flex items-center justify-center gap-2 w-full bg-[var(--brand)]/10 border border-[var(--brand)]/30 text-[var(--brand)] rounded-xl px-4 py-2.5 font-semibold text-sm active:scale-95 transition-all"
                                            >
                                                Open Live Map <Navigation className="w-4 h-4" />
                                            </a>
                                        ) : (
                                            <button
                                                onClick={() => handleStartTrip(route.id)}
                                                className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95 w-full justify-center"
                                            >
                                                Start Trip
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Quick Links */}
                <div className="grid grid-cols-2 gap-3">
                    <a href="/driver/attendance" className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5 flex flex-col items-start active:scale-95 transition-all">
                        <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center mb-3">
                            <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <span className="text-sm font-semibold text-slate-700 dark:text-white">Attendance</span>
                    </a>
                    <a href="/driver/ride" className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5 flex flex-col items-start active:scale-95 transition-all">
                        <div className="w-10 h-10 bg-[var(--brand)]/10 rounded-xl flex items-center justify-center mb-3">
                            <Navigation className="w-5 h-5 text-[var(--brand)]" />
                        </div>
                        <span className="text-sm font-semibold text-slate-700 dark:text-white">Live Ride</span>
                    </a>
                </div>
            </div>

            {/* Fuel Request Modal */}
            {showFuelModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Request Fuel Fund</h3>
                            <button onClick={() => setShowFuelModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
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
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Amount Requested (₹) *</label>
                                        <input
                                            type="number"
                                            value={fuelAmount}
                                            onChange={e => setFuelAmount(e.target.value)}
                                            placeholder="e.g. 2000"
                                            className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Current Odometer (km)</label>
                                        <input
                                            type="number"
                                            value={fuelKm}
                                            onChange={e => setFuelKm(e.target.value)}
                                            placeholder="e.g. 45230"
                                            className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Reason (optional)</label>
                                        <input
                                            type="text"
                                            value={fuelReason}
                                            onChange={e => setFuelReason(e.target.value)}
                                            placeholder="e.g. Low fuel before morning route"
                                            className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors"
                                        />
                                    </div>
                                    <div className="flex gap-3 pt-2">
                                        <button
                                            onClick={() => setShowFuelModal(false)}
                                            className="flex-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-4 py-2.5 font-semibold text-sm"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleFuelRequest}
                                            disabled={!fuelAmount || fuelSubmitting}
                                            className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl px-4 py-2.5 font-semibold text-sm disabled:opacity-50"
                                        >
                                            {fuelSubmitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Submit Request'}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* KM Input Dialog */}
            {showKmDialog && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                {kmDialogMode === 'start' ? 'Start Shift' : 'End Shift'}
                            </h3>
                            <button onClick={() => setShowKmDialog(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">Enter current odometer reading</p>
                            <div className="mb-5">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                    Current Odometer Reading (km)
                                </label>
                                <input
                                    type="number"
                                    value={kmValue}
                                    onChange={(e) => setKmValue(e.target.value)}
                                    placeholder="e.g. 45230"
                                    className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors"
                                    autoFocus
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowKmDialog(false)}
                                    className="flex-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-4 py-2.5 font-semibold text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleShiftAction}
                                    disabled={!kmValue || kmSubmitting}
                                    className="flex-1 flex items-center justify-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm disabled:opacity-50"
                                >
                                    {kmSubmitting
                                        ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        : kmDialogMode === 'start' ? 'Start Shift' : 'End Shift'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
