'use client';

import { useState, useEffect } from 'react';
import { Bus, Navigation, Bell, Fuel, AlertTriangle, CheckCircle, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

interface DriverInfo {
    id: string;
    name: string;
    license: string;
    bus?: { id: string; bus_number: string; fuel_liters?: number; mileage?: number };
}

interface Trip {
    id: string;
    route_id: string;
    route: { name: string; type?: string };
    status: string;
}

interface Shift {
    id: string;
    start_km: number;
    status: string;
}

export default function DriverDashboard() {
    const { user, logout } = useAuth();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [driverInfo, setDriverInfo] = useState<DriverInfo | null>(null);
    const [activeShift, setActiveShift] = useState<Shift | null>(null);
    const [trips, setTrips] = useState<Trip[]>([]);
    const [absenceCount, setAbsenceCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // KM Dialog state
    const [showKmDialog, setShowKmDialog] = useState(false);
    const [kmDialogMode, setKmDialogMode] = useState<'start' | 'end'>('start');
    const [kmValue, setKmValue] = useState('');
    const [kmSubmitting, setKmSubmitting] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [driverRes, tripsRes, absenceRes] = await Promise.allSettled([
                api.get('/drivers/me'),
                api.get('/trips/active'),
                api.get('/absence'),
            ]);

            if (driverRes.status === 'fulfilled') setDriverInfo(driverRes.value.data);
            if (tripsRes.status === 'fulfilled') {
                const data = tripsRes.value.data;
                setTrips(Array.isArray(data) ? data : data ? [data] : []);
            }
            if (absenceRes.status === 'fulfilled') {
                const abs = absenceRes.value.data;
                setAbsenceCount(Array.isArray(abs) ? abs.length : 0);
            }

            // Check active shift
            try {
                const shiftRes = await api.get('/shifts/active');
                setActiveShift(shiftRes.data || null);
            } catch {
                setActiveShift(null);
            }
        } catch (e: any) {
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
            alert(e.response?.data?.message || 'Action failed');
        } finally {
            setKmSubmitting(false);
        }
    };

    const handleStartTrip = async (routeId: string) => {
        try {
            await api.post('/trips/start', { route_id: routeId });
            fetchAll();
        } catch (e: any) {
            alert(e.response?.data?.message || 'Failed to start trip');
        }
    };

    const fuelLevel = driverInfo?.bus?.fuel_level ?? 0;

    return (
        <div className="min-h-screen bg-black text-white font-sans relative overflow-hidden pb-8">
            {/* Ambient glow */}
            <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[100px] rounded-full pointer-events-none" />

            {/* Top Navigation */}
            <div className="flex justify-between items-center p-6 pt-8 z-10 relative">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-xl">
                        <Bus className="w-6 h-6 text-black" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black tracking-tight leading-none uppercase">D-Driver</h2>
                        <span className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mt-1 block">Driver Console</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-white/30 text-xs font-bold">
                        {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button onClick={logout} className="w-11 h-11 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5 hover:bg-white/10 transition-colors">
                        <LogOut className="w-5 h-5 text-white/40" />
                    </button>
                </div>
            </div>

            <div className="px-6 space-y-5 z-10 relative">
                {/* Greeting */}
                <div>
                    <h1 className="text-3xl font-black tracking-tight">
                        {loading ? 'Loading...' : `Hey, ${(driverInfo?.name || user?.name || 'Driver').split(' ')[0]}`}
                    </h1>
                    <p className="text-white/40 font-bold uppercase tracking-widest text-xs mt-2">
                        {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
                    </p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-red-400 text-sm font-bold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
                    </div>
                )}

                {/* Absence Alert Banner */}
                {absenceCount > 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center gap-3">
                        <Bell className="w-5 h-5 text-amber-400 shrink-0" />
                        <p className="text-amber-300 text-sm font-bold">
                            {absenceCount} student{absenceCount > 1 ? 's' : ''} absent today on your route
                        </p>
                    </div>
                )}

                {/* Shift Status Card */}
                <div className="bg-[#121212] rounded-[32px] p-7 border border-white/5 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/5 rounded-full blur-3xl -mr-24 -mt-24 group-hover:bg-blue-600/10 transition-all" />
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em] mb-2">Shift Status</p>
                                {activeShift ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                        <span className="text-green-400 text-sm font-black uppercase tracking-widest">Shift Active</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-white/20" />
                                        <span className="text-white/40 text-sm font-black uppercase tracking-widest">No Active Shift</span>
                                    </div>
                                )}
                            </div>
                            {driverInfo?.bus && (
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Assigned Bus</p>
                                    <p className="text-2xl font-black text-white mt-1">{driverInfo.bus.bus_number}</p>
                                </div>
                            )}
                        </div>

                        {driverInfo?.license && (
                            <p className="text-white/30 text-xs font-bold mb-6">License: {driverInfo.license}</p>
                        )}

                        {activeShift ? (
                            <button
                                onClick={() => openShiftDialog('end')}
                                className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-red-500/20 active:scale-95 transition-all"
                            >
                                End Shift
                            </button>
                        ) : (
                            <button
                                onClick={() => openShiftDialog('start')}
                                className="w-full py-4 bg-white text-black hover:bg-blue-500 hover:text-white rounded-2xl font-black text-sm shadow-lg active:scale-95 transition-all"
                            >
                                Start Shift
                            </button>
                        )}
                    </div>
                </div>

                {/* Fuel Status */}
                {driverInfo?.bus && (
                    <div className="bg-[#121212] rounded-[28px] p-6 border border-white/5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Fuel className="w-4 h-4 text-amber-400" />
                                <span className="text-xs font-black text-white/40 uppercase tracking-widest">Fuel Level</span>
                            </div>
                            <span className="text-sm font-black text-white">{fuelLevel}%</span>
                        </div>
                        <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-1000 ${fuelLevel > 50 ? 'bg-green-500' : fuelLevel > 25 ? 'bg-amber-500' : 'bg-red-500'}`}
                                style={{ width: `${fuelLevel}%` }}
                            />
                        </div>
                        {fuelLevel < 25 && (
                            <p className="text-red-400 text-[10px] font-bold mt-2 uppercase tracking-widest">Low fuel — plan refuel</p>
                        )}
                    </div>
                )}

                {/* Today's Routes */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-black tracking-tight border-l-4 border-blue-600 pl-4 uppercase">Today's Routes</h3>
                        <span className="text-white/30 text-xs font-bold uppercase">
                            {loading ? '...' : `${trips.length} assigned`}
                        </span>
                    </div>

                    {loading ? (
                        <div className="flex justify-center p-8">
                            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : trips.length === 0 ? (
                        <div className="bg-[#121212]/60 rounded-[28px] p-8 border border-white/5 text-center">
                            <Navigation className="w-8 h-8 text-white/10 mx-auto mb-3" />
                            <p className="text-white/30 font-bold text-sm">No active trips assigned</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {trips.map((trip) => (
                                <div key={trip.id} className="bg-[#121212] rounded-[28px] p-6 border border-white/5 hover:border-white/10 transition-all">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h4 className="text-xl font-black tracking-tight mb-1">
                                                {trip.route?.name || 'Route'}
                                            </h4>
                                            {trip.route?.type && (
                                                <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest ${trip.route.type === 'Morning' ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                                    {trip.route.type}
                                                </span>
                                            )}
                                        </div>
                                        <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest ${trip.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-white/30'}`}>
                                            {trip.status}
                                        </span>
                                    </div>
                                    {trip.status !== 'active' && (
                                        <button
                                            onClick={() => handleStartTrip(trip.route_id)}
                                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-sm active:scale-95 transition-all"
                                        >
                                            Start Trip
                                        </button>
                                    )}
                                    {trip.status === 'active' && (
                                        <a
                                            href="/driver/ride"
                                            className="flex items-center justify-center gap-2 w-full py-3 bg-white text-black hover:bg-blue-500 hover:text-white rounded-2xl font-black text-sm active:scale-95 transition-all"
                                        >
                                            Open Map <Navigation className="w-4 h-4" />
                                        </a>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Quick Links */}
                <div className="grid grid-cols-2 gap-4">
                    <a href="/driver/attendance" className="bg-[#121212] rounded-[24px] p-5 border border-white/5 hover:border-white/10 transition-all flex flex-col items-start group active:scale-95">
                        <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4 border border-emerald-500/20">
                            <CheckCircle className="w-5 h-5 text-emerald-400" />
                        </div>
                        <span className="text-xs font-black text-white uppercase tracking-tight">Attendance</span>
                    </a>
                    <a href="/driver/ride" className="bg-[#121212] rounded-[24px] p-5 border border-white/5 hover:border-white/10 transition-all flex flex-col items-start group active:scale-95">
                        <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4 border border-blue-500/20">
                            <Navigation className="w-5 h-5 text-blue-400" />
                        </div>
                        <span className="text-xs font-black text-white uppercase tracking-tight">Live Ride</span>
                    </a>
                </div>
            </div>

            {/* KM Input Dialog */}
            {showKmDialog && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-end justify-center p-4">
                    <div className="bg-[#111] border border-white/10 rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl">
                        <h3 className="text-xl font-black text-white mb-1">
                            {kmDialogMode === 'start' ? 'Start Shift' : 'End Shift'}
                        </h3>
                        <p className="text-white/40 text-sm font-bold mb-6">Enter current odometer reading</p>
                        <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">
                            Current Odometer Reading (km)
                        </label>
                        <input
                            type="number"
                            value={kmValue}
                            onChange={(e) => setKmValue(e.target.value)}
                            placeholder="e.g. 45230"
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white text-lg font-bold outline-none focus:border-blue-500 transition-all mb-6"
                            autoFocus
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowKmDialog(false)}
                                className="flex-1 py-4 bg-white/5 text-white/60 rounded-2xl font-bold hover:bg-white/10 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleShiftAction}
                                disabled={!kmValue || kmSubmitting}
                                className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl font-black transition-all active:scale-95"
                            >
                                {kmSubmitting ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                                ) : (
                                    kmDialogMode === 'start' ? 'Start Shift' : 'End Shift'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
