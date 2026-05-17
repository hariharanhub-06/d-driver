'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Navigation, ChevronRight, Fuel, DollarSign, X, Bus, Wrench } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { connectSocket, getSocket } from '@/lib/socket';
import api from '@/lib/api';
import dynamic from 'next/dynamic';

const FreeMap = dynamic(() => import('@/components/ui/FreeMap'), { ssr: false });

interface Stop {
    id: string;
    name: string;
    sequence: number;
    lat?: number;
    lng?: number;
    student_count?: number;
}

interface TripData {
    id: string;
    route_id: string;
    stop_index: number;
    route?: { name: string; stops: Stop[] };
}

export default function ActiveRide() {
    const { user } = useAuth();
    const [currentPos, setCurrentPos] = useState<[number, number]>([12.9716, 77.5946]);
    const [tripData, setTripData] = useState<TripData | null>(null);
    const [stops, setStops] = useState<Stop[]>([]);
    const [busId, setBusId] = useState<string>('');
    const [loading, setLoading] = useState(true);

    // Modal states
    const [showSosConfirm, setShowSosConfirm] = useState(false);
    const [showBusSwitch, setShowBusSwitch] = useState(false);
    const [showFuelFill, setShowFuelFill] = useState(false);
    const [showFuelRequest, setShowFuelRequest] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Bus switch form
    const [switchForm, setSwitchForm] = useState({ reason: 'breakdown', notes: '', current_km: '' });
    // Fuel fill form
    const [fuelFillForm, setFuelFillForm] = useState({ liters_filled: '', current_km: '' });
    // Fuel request form
    const [fuelReqForm, setFuelReqForm] = useState({ amount_requested: '', reason: '' });

    useEffect(() => {
        let watchId: number | null = null;

        fetchTripData().then(() => {
            if ('geolocation' in navigator) {
                watchId = navigator.geolocation.watchPosition(
                    (pos) => {
                        const { latitude, longitude } = pos.coords;
                        setCurrentPos([latitude, longitude]);
                        if (busId) {
                            getSocket().emit('update-location', { busId, lat: latitude, lng: longitude });
                        }
                    },
                    () => {},
                    { enableHighAccuracy: true }
                );
            }
        });

        return () => {
            if (watchId !== null) navigator.geolocation.clearWatch(watchId);
        };
    }, []);

    const fetchTripData = async () => {
        try {
            const tripsRes = await api.get('/trips/active');
            const trips = Array.isArray(tripsRes.data) ? tripsRes.data : tripsRes.data ? [tripsRes.data] : [];
            const activeTrip: TripData | undefined = trips[0];

            if (activeTrip) {
                setTripData(activeTrip);
                const routeRes = await api.get(`/routes/${activeTrip.route_id}`);
                const route = routeRes.data;
                const routeStops: Stop[] = route.stops || [];
                setStops(routeStops);

                // Get bus id
                try {
                    const driverRes = await api.get('/drivers/me');
                    const bid = driverRes.data?.bus?.id || driverRes.data?.bus_id;
                    if (!bid) throw new Error('No bus assigned to this driver');
                    setBusId(String(bid));
                    connectSocket(String(bid));

                    // Initial location
                    const locRes = await api.get(`/location/bus/${bid}`);
                    if (locRes.data?.latitude) {
                        setCurrentPos([locRes.data.latitude, locRes.data.longitude]);
                    }
                } catch {
                    // Bus not yet assigned — no fallback to avoid cross-school contamination
                }
            }
        } catch {
            // Trip fetch failed — stay on loading state
        } finally {
            setLoading(false);
        }
    };

    const currentStopIndex = tripData?.stop_index ?? 0;
    const currentStop = stops[currentStopIndex];
    const nextStop = stops[currentStopIndex + 1];

    const handleArrivedAtStop = async () => {
        if (!tripData) return;
        try {
            await api.patch(`/trips/${tripData.id}/stop-index`, { stop_index: currentStopIndex + 1 });
            setTripData(prev => prev ? { ...prev, stop_index: currentStopIndex + 1 } : prev);
        } catch (e: any) {
            alert(e.response?.data?.message || 'Failed to advance stop');
        }
    };

    const handleSOS = async () => {
        setSubmitting(true);
        try {
            getSocket().emit('trigger-alert', { message: `SOS EMERGENCY: Bus ${busId} is in distress!`, type: 'error' });
            await api.post('/notifications', {
                type: 'alert',
                title: 'SOS Alert',
                message: `SOS EMERGENCY: Driver ${user?.name || 'Driver'} on Bus ${busId} needs help!`,
            });
            setShowSosConfirm(false);
            alert('SOS Alert sent to administration!');
        } catch {
            alert('Failed to send SOS. Please call emergency services immediately.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleBusSwitch = async () => {
        setSubmitting(true);
        try {
            await api.post('/bus-switch', {
                reason: switchForm.reason,
                notes: switchForm.notes,
                current_km: parseFloat(switchForm.current_km) || 0,
            });
            setShowBusSwitch(false);
            alert('Bus switch request submitted.');
        } catch (e: any) {
            alert(e.response?.data?.message || 'Failed to submit switch request');
        } finally {
            setSubmitting(false);
        }
    };

    const handleFuelFill = async () => {
        setSubmitting(true);
        try {
            await api.post('/fuel/fill', {
                liters_filled: parseFloat(fuelFillForm.liters_filled),
                current_km: parseFloat(fuelFillForm.current_km),
            });
            setShowFuelFill(false);
            setFuelFillForm({ liters_filled: '', current_km: '' });
            alert('Fuel log submitted.');
        } catch (e: any) {
            alert(e.response?.data?.message || 'Failed to log fuel');
        } finally {
            setSubmitting(false);
        }
    };

    const handleFuelRequest = async () => {
        setSubmitting(true);
        try {
            await api.post('/fuel/request', {
                amount_requested: parseFloat(fuelReqForm.amount_requested),
                reason: fuelReqForm.reason,
            });
            setShowFuelRequest(false);
            setFuelReqForm({ amount_requested: '', reason: '' });
            alert('Fund request submitted.');
        } catch (e: any) {
            alert(e.response?.data?.message || 'Failed to submit request');
        } finally {
            setSubmitting(false);
        }
    };

    const mapMarkers = [
        { position: currentPos, title: `Bus ${busId}` },
        ...stops
            .filter(s => s.lat && s.lng)
            .map(s => ({ position: [s.lat!, s.lng!] as [number, number], title: `${s.sequence}. ${s.name}` })),
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col w-full relative overflow-hidden">
            {/* Map */}
            <div className="flex-1 bg-slate-200 dark:bg-slate-800 relative z-0" style={{ minHeight: '60vh' }}>
                {!loading && (
                    <FreeMap center={currentPos} zoom={15} markers={mapMarkers} />
                )}

                {/* SOS Button — keep red */}
                <button
                    onClick={() => setShowSosConfirm(true)}
                    className="absolute top-4 right-4 w-14 h-14 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-red-500/40 transition-transform active:scale-95 z-[400] font-bold text-xs"
                >
                    SOS
                </button>

                {/* Switch Bus Button */}
                <button
                    onClick={() => setShowBusSwitch(true)}
                    className="absolute top-4 left-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white px-4 py-2 rounded-xl flex items-center gap-2 z-[400] text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95 shadow-sm"
                >
                    <Wrench className="w-4 h-4" /> Switch Bus
                </button>
            </div>

            {/* Bottom control sheet */}
            <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 rounded-t-2xl shadow-2xl border-t border-slate-100 dark:border-slate-700 p-5 z-20">
                <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-4" />

                {/* Current stop info */}
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Current Stop</p>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Navigation className="w-5 h-5 text-[var(--brand)] shrink-0" />
                            {currentStop?.name || 'No stop data'}
                        </h2>
                        {currentStop?.student_count !== undefined && (
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{currentStop.student_count} students at this stop</p>
                        )}
                    </div>
                    {nextStop && (
                        <div className="text-right">
                            <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Next</p>
                            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                                {nextStop.name} <ChevronRight className="w-3 h-3" />
                            </p>
                        </div>
                    )}
                </div>

                {/* Arrived button */}
                <button
                    onClick={handleArrivedAtStop}
                    className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95 w-full justify-center mb-3"
                >
                    Arrived at Stop
                </button>

                {/* Fuel row */}
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => setShowFuelFill(true)}
                        className="py-2.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-xl font-semibold flex items-center justify-center gap-2 text-sm border border-amber-100 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-all active:scale-95"
                    >
                        <Fuel className="w-4 h-4" /> Log Fuel Fill
                    </button>
                    <button
                        onClick={() => setShowFuelRequest(true)}
                        className="py-2.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-xl font-semibold flex items-center justify-center gap-2 text-sm border border-emerald-100 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all active:scale-95"
                    >
                        <DollarSign className="w-4 h-4" /> Request Funds
                    </button>
                </div>
            </div>

            {/* SOS Confirm Modal */}
            {showSosConfirm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Send SOS Alert?</h3>
                            <button onClick={() => setShowSosConfirm(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6">
                        <div className="w-14 h-14 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle className="w-7 h-7 text-red-500" />
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6">This will immediately notify school administration of an emergency.</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowSosConfirm(false)}
                                className="flex items-center gap-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-4 py-2.5 font-semibold text-sm flex-1 justify-center"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSOS}
                                disabled={submitting}
                                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold disabled:opacity-50 text-sm active:scale-95 transition-all"
                            >
                                {submitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" /> : 'Send SOS'}
                            </button>
                        </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Bus Switch Modal */}
            {showBusSwitch && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Bus className="w-5 h-5 text-[var(--brand)]" /> Switch Bus
                            </h3>
                            <button onClick={() => setShowBusSwitch(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                        <div className="space-y-4 mb-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Reason</label>
                                <select
                                    value={switchForm.reason}
                                    onChange={e => setSwitchForm({ ...switchForm, reason: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[var(--brand)] transition-colors"
                                >
                                    <option value="breakdown">Breakdown</option>
                                    <option value="accident">Accident</option>
                                    <option value="maintenance">Maintenance</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Notes</label>
                                <textarea
                                    value={switchForm.notes}
                                    onChange={e => setSwitchForm({ ...switchForm, notes: e.target.value })}
                                    placeholder="Describe the issue..."
                                    className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors resize-none h-20"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Current Odometer (km)</label>
                                <input
                                    type="number"
                                    value={switchForm.current_km}
                                    onChange={e => setSwitchForm({ ...switchForm, current_km: e.target.value })}
                                    placeholder="e.g. 45230"
                                    className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors"
                                />
                            </div>
                        </div>
                        <button
                            onClick={handleBusSwitch}
                            disabled={submitting}
                            className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95 w-full justify-center disabled:opacity-50"
                        >
                            {submitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Submit Switch Request'}
                        </button>
                    </div>
                </div>
            )}

            {/* Fuel Fill Modal */}
            {showFuelFill && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Fuel className="w-5 h-5 text-amber-500" /> Log Fuel Fill
                            </h3>
                            <button onClick={() => setShowFuelFill(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                        <div className="space-y-4 mb-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Litres Filled</label>
                                <input
                                    type="number"
                                    value={fuelFillForm.liters_filled}
                                    onChange={e => setFuelFillForm({ ...fuelFillForm, liters_filled: e.target.value })}
                                    placeholder="e.g. 40"
                                    className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Current Odometer (km)</label>
                                <input
                                    type="number"
                                    value={fuelFillForm.current_km}
                                    onChange={e => setFuelFillForm({ ...fuelFillForm, current_km: e.target.value })}
                                    placeholder="e.g. 45230"
                                    className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors"
                                />
                            </div>
                        </div>
                        <button
                            onClick={handleFuelFill}
                            disabled={submitting || !fuelFillForm.liters_filled}
                            className="py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold disabled:opacity-50 active:scale-95 transition-all w-full text-sm"
                        >
                            {submitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" /> : 'Log Fuel Fill'}
                        </button>
                    </div>
                </div>
            )}

            {/* Fuel Request Modal */}
            {showFuelRequest && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <DollarSign className="w-5 h-5 text-emerald-500" /> Request Funds
                            </h3>
                            <button onClick={() => setShowFuelRequest(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                        <div className="space-y-4 mb-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Amount Requested (₹)</label>
                                <input
                                    type="number"
                                    value={fuelReqForm.amount_requested}
                                    onChange={e => setFuelReqForm({ ...fuelReqForm, amount_requested: e.target.value })}
                                    placeholder="e.g. 2000"
                                    className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Reason</label>
                                <textarea
                                    value={fuelReqForm.reason}
                                    onChange={e => setFuelReqForm({ ...fuelReqForm, reason: e.target.value })}
                                    placeholder="Reason for fund request..."
                                    className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors resize-none h-20"
                                />
                            </div>
                        </div>
                        <button
                            onClick={handleFuelRequest}
                            disabled={submitting || !fuelReqForm.amount_requested}
                            className="py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold disabled:opacity-50 active:scale-95 transition-all w-full text-sm"
                        >
                            {submitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" /> : 'Submit Request'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
