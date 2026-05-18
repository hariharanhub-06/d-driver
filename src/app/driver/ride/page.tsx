'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AlertTriangle, Navigation, ChevronRight, Fuel, DollarSign, X, Bus, Wrench, Check, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { connectSocket, getSocket } from '@/lib/socket';
import api from '@/lib/api';
import dynamic from 'next/dynamic';

const FreeMap = dynamic(() => import('@/components/ui/FreeMap'), { ssr: false });

interface Student {
    id: string;
    name: string;
    photo_url?: string;
    grade?: string;
    stop_id?: string;
}

interface Stop {
    id: string;
    name: string;
    sequence: number;
    lat?: number;
    lng?: number;
}

interface TripData {
    id: string;
    route_id: string;
    current_stop_index: number;
    route?: {
        name: string;
        stops: Stop[];
        students: Student[];
    };
}

export default function ActiveRide() {
    const { user } = useAuth();
    const [currentPos, setCurrentPos] = useState<[number, number]>([12.9716, 77.5946]);
    const [tripData, setTripData] = useState<TripData | null>(null);
    const [busId, setBusId] = useState<string>('');
    const busIdRef = useRef<string>('');
    const [loading, setLoading] = useState(true);
    const [noTrip, setNoTrip] = useState(false);
    const [geoError, setGeoError] = useState('');
    const [locationDenied, setLocationDenied] = useState(false);

    // Stop arrival attendance popup
    const [showAttendancePopup, setShowAttendancePopup] = useState(false);
    const [popupStudents, setPopupStudents] = useState<Student[]>([]);
    const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent'>>({});
    const [markingStudentId, setMarkingStudentId] = useState<string | null>(null);

    // Modal states
    const [showSosConfirm, setShowSosConfirm] = useState(false);
    const [showBusSwitch, setShowBusSwitch] = useState(false);
    const [showFuelFill, setShowFuelFill] = useState(false);
    const [showFuelRequest, setShowFuelRequest] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [switchForm, setSwitchForm] = useState({ reason: 'breakdown', notes: '', current_km: '' });
    const [fuelFillForm, setFuelFillForm] = useState({ liters_filled: '', current_km: '' });
    const [fuelReqForm, setFuelReqForm] = useState({ amount_requested: '', reason: '' });

    const fetchTripData = useCallback(async () => {
        try {
            // Load driver profile first to get bus_id
            let bid = '';
            try {
                const driverRes = await api.get('/drivers/me');
                bid = driverRes.data?.bus?.id ? String(driverRes.data.bus.id) : '';
                if (bid) {
                    setBusId(bid);
                    busIdRef.current = bid;
                    connectSocket(bid);
                    try {
                        const locRes = await api.get(`/location/bus/${bid}`);
                        if (locRes.data?.latitude) {
                            setCurrentPos([locRes.data.latitude, locRes.data.longitude]);
                        }
                    } catch { /* no saved location yet */ }
                }
            } catch { /* driver profile unavailable */ }

            const tripsRes = await api.get('/trips/active');
            const trips: TripData[] = Array.isArray(tripsRes.data) ? tripsRes.data : [];
            const activeTrip = trips[0];

            if (activeTrip) {
                setTripData(activeTrip);
                setNoTrip(false);
            } else {
                setNoTrip(true);
            }
        } catch {
            setNoTrip(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let watchId: number | null = null;

        const startTracking = () => {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setCurrentPos([pos.coords.latitude, pos.coords.longitude]);
                    setGeoError('');
                    setLocationDenied(false);
                },
                (err) => {
                    if (err.code === 1) setLocationDenied(true);
                    else setGeoError('Unable to get location. Please check your GPS signal.');
                },
                { enableHighAccuracy: true, timeout: 10000 }
            );
            watchId = navigator.geolocation.watchPosition(
                (pos) => {
                    const { latitude, longitude } = pos.coords;
                    setCurrentPos([latitude, longitude]);
                    setGeoError('');
                    setLocationDenied(false);
                    const currentBusId = busIdRef.current;
                    if (currentBusId) {
                        try {
                            getSocket().emit('update-location', { busId: currentBusId, lat: latitude, lng: longitude });
                        } catch { /* socket unavailable */ }
                    }
                },
                (err) => {
                    if (err.code === 1) setLocationDenied(true);
                },
                { enableHighAccuracy: true, timeout: 30000, maximumAge: 5000 }
            );
        };

        fetchTripData().then(() => {
            if (!('geolocation' in navigator)) {
                setGeoError('Geolocation is not supported by this browser.');
                return;
            }
            // Check permission state first
            if ('permissions' in navigator) {
                navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((result) => {
                    if (result.state === 'denied') {
                        setLocationDenied(true);
                    } else {
                        startTracking();
                    }
                    result.onchange = () => {
                        if (result.state === 'granted') {
                            setLocationDenied(false);
                            startTracking();
                        } else if (result.state === 'denied') {
                            setLocationDenied(true);
                        }
                    };
                });
            } else {
                startTracking();
            }
        });

        return () => {
            if (watchId !== null) navigator.geolocation.clearWatch(watchId);
        };
    }, [fetchTripData]);

    const currentStopIndex = tripData?.current_stop_index ?? 0;
    const stops = tripData?.route?.stops || [];
    const allStudents = tripData?.route?.students || [];
    const currentStop = stops[currentStopIndex];
    const nextStop = stops[currentStopIndex + 1];

    const getStudentsAtStop = (stopId: string) =>
        allStudents.filter(s => s.stop_id === stopId);

    const handleArrivedAtStop = async () => {
        if (!tripData || !currentStop) return;
        // Show attendance popup for students at this stop
        const studentsHere = getStudentsAtStop(currentStop.id);
        if (studentsHere.length > 0) {
            setPopupStudents(studentsHere);
            setShowAttendancePopup(true);
        } else {
            // No students at this stop, just advance
            await advanceStop();
        }
    };

    const advanceStop = async () => {
        if (!tripData) return;
        try {
            await api.patch(`/trips/${tripData.id}/stop-index`, { stop_index: currentStopIndex + 1 });
            setTripData(prev => prev ? { ...prev, current_stop_index: currentStopIndex + 1 } : prev);
        } catch (e: any) {
            alert(e.response?.data?.message || 'Failed to advance stop');
        }
    };

    const handleMarkAttendance = async (student: Student, status: 'present' | 'absent') => {
        setMarkingStudentId(student.id);
        try {
            await api.post('/attendance/mark', {
                student_id: student.id,
                status,
                trip_id: tripData?.id,
            });
        } catch { /* update local state regardless */ }
        setAttendance(prev => ({ ...prev, [student.id]: status }));
        setMarkingStudentId(null);
    };

    const handleDoneWithStop = async () => {
        setShowAttendancePopup(false);
        setPopupStudents([]);
        await advanceStop();
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
        if (!fuelFillForm.liters_filled) return;
        setSubmitting(true);
        try {
            await api.post('/fuel/fill', {
                bus_id: busId || undefined,
                liters_filled: parseFloat(fuelFillForm.liters_filled),
                km_at_fill: fuelFillForm.current_km ? parseFloat(fuelFillForm.current_km) : undefined,
            });
            setShowFuelFill(false);
            setFuelFillForm({ liters_filled: '', current_km: '' });
            alert(`Fuel logged: ${fuelFillForm.liters_filled}L added to bus.`);
        } catch (e: any) {
            alert(e.response?.data?.message || e.response?.data?.error || 'Failed to log fuel');
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
        { position: currentPos, title: `Bus ${busId || ''}` },
        ...stops
            .filter(s => s.lat && s.lng)
            .map(s => ({ position: [s.lat!, s.lng!] as [number, number], title: `${s.sequence}. ${s.name}` })),
    ];

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (noTrip) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                    <Navigation className="w-8 h-8 text-slate-400" />
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No Active Trip</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Start a trip from your dashboard to use the live map.</p>
                <a href="/driver/dashboard" className="bg-[var(--brand)] text-white rounded-xl px-6 py-3 font-semibold text-sm">
                    Go to Dashboard
                </a>
            </div>
        );
    }

    if (locationDenied) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mb-6">
                    <AlertTriangle className="w-10 h-10 text-amber-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-3">Location Access Required</h2>
                <p className="text-slate-400 text-sm mb-6 max-w-xs">
                    D-Driver needs your location to track the bus and show parents where you are. Please enable location and reload.
                </p>
                <div className="bg-slate-800 rounded-2xl p-5 text-left mb-6 w-full max-w-xs space-y-3">
                    <p className="text-white text-sm font-semibold">How to enable:</p>
                    <div className="flex items-start gap-3 text-slate-400 text-sm">
                        <span className="w-5 h-5 rounded-full bg-[var(--brand)] text-white text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
                        <span>Tap the <strong className="text-white">lock icon</strong> or <strong className="text-white">ⓘ</strong> in your browser's address bar</span>
                    </div>
                    <div className="flex items-start gap-3 text-slate-400 text-sm">
                        <span className="w-5 h-5 rounded-full bg-[var(--brand)] text-white text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
                        <span>Tap <strong className="text-white">Location</strong> → set to <strong className="text-white">Allow</strong></span>
                    </div>
                    <div className="flex items-start gap-3 text-slate-400 text-sm">
                        <span className="w-5 h-5 rounded-full bg-[var(--brand)] text-white text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
                        <span>Reload this page</span>
                    </div>
                </div>
                <button
                    onClick={() => window.location.reload()}
                    className="bg-[var(--brand)] text-white rounded-xl px-8 py-3 font-semibold text-sm w-full max-w-xs"
                >
                    Reload Page
                </button>
                <a href="/driver/dashboard" className="mt-4 text-sm text-slate-500 hover:text-slate-300">
                    ← Back to Dashboard
                </a>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col w-full relative overflow-hidden">
            {/* Map */}
            <div className="flex-1 bg-slate-200 dark:bg-slate-800 relative z-0" style={{ minHeight: '60vh' }}>
                <FreeMap center={currentPos} zoom={15} markers={mapMarkers} followCenter />

                <button
                    onClick={() => setShowSosConfirm(true)}
                    className="absolute top-4 right-4 w-14 h-14 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-red-500/40 transition-transform active:scale-95 z-[400] font-bold text-xs"
                >
                    SOS
                </button>

                <div className="absolute top-4 left-4 flex gap-2 z-[400]">
                    <a
                        href="/driver/dashboard"
                        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white px-3 py-2 rounded-xl flex items-center gap-1.5 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95 shadow-sm"
                    >
                        <ArrowLeft className="w-4 h-4" /> Dashboard
                    </a>
                    <button
                        onClick={() => setShowBusSwitch(true)}
                        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white px-3 py-2 rounded-xl flex items-center gap-1.5 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95 shadow-sm"
                    >
                        <Wrench className="w-4 h-4" /> Switch Bus
                    </button>
                </div>
            </div>

            {/* Geo error banner (non-permission errors only) */}
            {geoError && !locationDenied && (
                <div className="fixed top-16 left-4 right-4 z-[300] bg-red-500 text-white text-xs font-medium px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    {geoError}
                </div>
            )}

            {/* Bottom control sheet */}
            <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 rounded-t-2xl shadow-2xl border-t border-slate-100 dark:border-slate-700 p-5 z-20">
                <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-4" />

                {/* Trip complete state — all stops done */}
                {!currentStop ? (
                    <div className="text-center py-2 mb-4">
                        <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Check className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">All Stops Completed!</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">The route is complete. You can end the trip and return to your dashboard.</p>
                        <button
                            onClick={async () => {
                                if (tripData?.id) {
                                    try { await api.post(`/trips/${tripData.id}/complete`); } catch { /* best effort */ }
                                }
                                window.location.href = '/driver/dashboard';
                            }}
                            className="flex items-center justify-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-3 font-bold text-sm transition-all active:scale-95 w-full"
                        >
                            End Trip — Go to Dashboard
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Current Stop</p>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Navigation className="w-5 h-5 text-[var(--brand)] shrink-0" />
                                    {currentStop.name}
                                </h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    {getStudentsAtStop(currentStop.id).length} students at this stop
                                </p>
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

                        <button
                            onClick={handleArrivedAtStop}
                            className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95 w-full justify-center mb-3"
                        >
                            {getStudentsAtStop(currentStop.id).length > 0 ? 'Arrived — Mark Attendance' : 'Arrived at Stop'}
                        </button>
                    </>
                )}

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

            {/* Attendance Popup — students at current stop */}
            {showAttendancePopup && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center">
                    <div className="bg-white dark:bg-slate-800 rounded-t-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 shrink-0">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                    Students at {currentStop?.name}
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    {popupStudents.length} student{popupStudents.length !== 1 ? 's' : ''}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowAttendancePopup(false)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1 p-4 space-y-3">
                            {popupStudents.map(student => {
                                const marked = attendance[student.id];
                                return (
                                    <div
                                        key={student.id}
                                        className={`bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-4 flex items-center gap-4 border transition-all ${
                                            marked === 'present' ? 'border-emerald-300 dark:border-emerald-700' :
                                            marked === 'absent' ? 'border-red-300 dark:border-red-700' :
                                            'border-slate-200 dark:border-slate-600'
                                        }`}
                                    >
                                        {/* Avatar */}
                                        <div className="w-12 h-12 rounded-2xl bg-[var(--brand)]/10 flex items-center justify-center shrink-0 overflow-hidden">
                                            {student.photo_url ? (
                                                <img src={student.photo_url} alt={student.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-lg font-bold text-[var(--brand)]">
                                                    {student.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-900 dark:text-white truncate">{student.name}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{student.grade || 'Student'}</p>
                                        </div>

                                        {/* Mark buttons or status badge */}
                                        {marked ? (
                                            <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold flex items-center gap-1 ${
                                                marked === 'present'
                                                    ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
                                                    : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'
                                            }`}>
                                                {marked === 'present' ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                                {marked === 'present' ? 'Present' : 'Absent'}
                                            </span>
                                        ) : (
                                            <div className="flex gap-2 shrink-0">
                                                <button
                                                    disabled={markingStudentId === student.id}
                                                    onClick={() => handleMarkAttendance(student, 'absent')}
                                                    className="w-9 h-9 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl flex items-center justify-center hover:bg-red-100 transition-all active:scale-95 disabled:opacity-50"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                                <button
                                                    disabled={markingStudentId === student.id}
                                                    onClick={() => handleMarkAttendance(student, 'present')}
                                                    className="w-9 h-9 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center hover:bg-emerald-100 transition-all active:scale-95 disabled:opacity-50"
                                                >
                                                    <Check className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="p-4 border-t border-slate-100 dark:border-slate-700 shrink-0">
                            <button
                                onClick={handleDoneWithStop}
                                className="w-full bg-[var(--brand)] hover:opacity-90 text-white rounded-xl py-3 font-bold text-sm active:scale-95 transition-all"
                            >
                                Done — Move to Next Stop
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* SOS Confirm Modal */}
            {showSosConfirm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Send SOS Alert?</h3>
                            <button onClick={() => setShowSosConfirm(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="w-14 h-14 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle className="w-7 h-7 text-red-500" />
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6">This will immediately notify school administration of an emergency.</p>
                            <div className="flex gap-3">
                                <button onClick={() => setShowSosConfirm(false)} className="flex-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-4 py-2.5 font-semibold text-sm">Cancel</button>
                                <button onClick={handleSOS} disabled={submitting} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold disabled:opacity-50 text-sm active:scale-95 transition-all">
                                    {submitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" /> : 'Send SOS'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Bus Switch Modal */}
            {showBusSwitch && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-end justify-center p-4">
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
                                <select value={switchForm.reason} onChange={e => setSwitchForm({ ...switchForm, reason: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[var(--brand)] transition-colors">
                                    <option value="breakdown">Breakdown</option>
                                    <option value="accident">Accident</option>
                                    <option value="maintenance">Maintenance</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Notes</label>
                                <textarea value={switchForm.notes} onChange={e => setSwitchForm({ ...switchForm, notes: e.target.value })} placeholder="Describe the issue..." className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors resize-none h-20" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Current Odometer (km)</label>
                                <input type="number" value={switchForm.current_km} onChange={e => setSwitchForm({ ...switchForm, current_km: e.target.value })} placeholder="e.g. 45230" className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors" />
                            </div>
                        </div>
                        <button onClick={handleBusSwitch} disabled={submitting} className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95 w-full justify-center disabled:opacity-50">
                            {submitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Submit Switch Request'}
                        </button>
                    </div>
                </div>
            )}

            {/* Fuel Fill Modal */}
            {showFuelFill && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-end justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Fuel className="w-5 h-5 text-amber-500" /> Log Fuel Fill
                            </h3>
                            <button onClick={() => setShowFuelFill(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all"><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <div className="space-y-4 mb-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Litres Filled</label>
                                <input type="number" value={fuelFillForm.liters_filled} onChange={e => setFuelFillForm({ ...fuelFillForm, liters_filled: e.target.value })} placeholder="e.g. 40" className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Current Odometer (km)</label>
                                <input type="number" value={fuelFillForm.current_km} onChange={e => setFuelFillForm({ ...fuelFillForm, current_km: e.target.value })} placeholder="e.g. 45230" className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors" />
                            </div>
                        </div>
                        <button onClick={handleFuelFill} disabled={submitting || !fuelFillForm.liters_filled} className="py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold disabled:opacity-50 active:scale-95 transition-all w-full text-sm">
                            {submitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" /> : 'Log Fuel Fill'}
                        </button>
                    </div>
                </div>
            )}

            {/* Fuel Request Modal */}
            {showFuelRequest && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-end justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <DollarSign className="w-5 h-5 text-emerald-500" /> Request Funds
                            </h3>
                            <button onClick={() => setShowFuelRequest(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all"><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <div className="space-y-4 mb-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Amount Requested (₹)</label>
                                <input type="number" value={fuelReqForm.amount_requested} onChange={e => setFuelReqForm({ ...fuelReqForm, amount_requested: e.target.value })} placeholder="e.g. 2000" className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Reason</label>
                                <textarea value={fuelReqForm.reason} onChange={e => setFuelReqForm({ ...fuelReqForm, reason: e.target.value })} placeholder="Reason for fund request..." className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors resize-none h-20" />
                            </div>
                        </div>
                        <button onClick={handleFuelRequest} disabled={submitting || !fuelReqForm.amount_requested} className="py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold disabled:opacity-50 active:scale-95 transition-all w-full text-sm">
                            {submitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" /> : 'Submit Request'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
