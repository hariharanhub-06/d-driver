'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AlertTriangle, Navigation, ChevronRight, X, Bus, Wrench, Check, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { connectSocket, getSocket } from '@/lib/socket';
import api from '@/lib/api';
import dynamic from 'next/dynamic';

const DriverMap = dynamic(() => import('@/components/ui/DriverMap'), { ssr: false });

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
    latitude?: number;
    longitude?: number;
}

interface TripData {
    id: string;
    route_id: string;
    current_stop_index: number;
    route?: {
        name: string;
        route_type?: string;
        stops: Stop[];
        students: Student[];
    };
}

function EndTripSlider({ onConfirm, onCancel, isEnding }: { onConfirm: () => void; onCancel: () => void; isEnding: boolean }) {
    const [filled, setFilled] = useState(0);
    const filledRef = useRef(0);
    const trackRef = useRef<HTMLDivElement>(null);
    const dragging = useRef(false);
    const done = useRef(false);

    const toFilled = (clientX: number) => {
        const track = trackRef.current;
        if (!track) return filledRef.current;
        const rect = track.getBoundingClientRect();
        const usable = rect.width - 56;
        const relX = clientX - rect.left - 28;
        return Math.max(0, Math.min(100, (relX / usable) * 100));
    };

    const onStart = (e: React.PointerEvent) => {
        if (done.current) return;
        dragging.current = true;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    };
    const onMove = (e: React.PointerEvent) => {
        if (!dragging.current || done.current) return;
        const f = toFilled(e.clientX);
        filledRef.current = f;
        setFilled(f);
    };
    const onEnd = () => {
        if (done.current) return;
        dragging.current = false;
        if (filledRef.current >= 90) {
            done.current = true;
            setFilled(100);
            filledRef.current = 100;
            setTimeout(onConfirm, 350);
        } else {
            setFilled(0);
            filledRef.current = 0;
        }
    };

    const thumbLeft = `calc(4px + ${filled / 100} * (100% - 56px))`;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[500] flex items-center justify-center p-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
                <div className="w-12 h-12 bg-red-50 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                    <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white text-center mb-1">End Trip?</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 text-center mb-5">Slide all the way to confirm</p>

                <div
                    ref={trackRef}
                    className="relative h-14 bg-red-50 dark:bg-red-900/20 rounded-full select-none overflow-hidden"
                    style={{ touchAction: 'none' }}
                    onPointerDown={onStart}
                    onPointerMove={onMove}
                    onPointerUp={onEnd}
                    onPointerCancel={onEnd}
                >
                    {/* Fill */}
                    <div
                        className="absolute inset-y-0 left-0 bg-red-200/60 dark:bg-red-800/40 rounded-full transition-none"
                        style={{ width: `calc(4px + ${filled / 100} * (100% - 56px) + 28px)` }}
                    />
                    {/* Label */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-xs font-bold text-red-500 uppercase tracking-widest">
                            {filled >= 98 ? 'Ending trip…' : 'Slide to End →'}
                        </span>
                    </div>
                    {/* Thumb */}
                    <div
                        className="absolute top-1 bottom-1 w-12 bg-red-500 rounded-full shadow-lg flex items-center justify-center pointer-events-none"
                        style={{ left: thumbLeft }}
                    >
                        {isEnding
                            ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            : <ChevronRight className="w-5 h-5 text-white" />
                        }
                    </div>
                </div>

                <button
                    onClick={onCancel}
                    className="w-full mt-4 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 py-2 transition-colors text-center"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}

export default function ActiveRide() {
    const { user } = useAuth();
    const [currentPos, setCurrentPos] = useState<[number, number] | null>(null);
    const [heading, setHeading] = useState<number | null>(null);
    const [accuracy, setAccuracy] = useState<number | null>(null);
    const [tripData, setTripData] = useState<TripData | null>(null);
    const [busId, setBusId] = useState<string>('');
    const [busNumber, setBusNumber] = useState<string>('');
    const busIdRef = useRef<string>('');
    const headingRef = useRef<number | null>(null);
    const prevPosRef = useRef<[number, number] | null>(null);
    const [loading, setLoading] = useState(true);
    const [noTrip, setNoTrip] = useState(false);
    const [geoError, setGeoError] = useState('');
    const [locationDenied, setLocationDenied] = useState(false);

    // Auto-triggered attendance popup (proximity-based)
    const [showAttendancePopup, setShowAttendancePopup] = useState(false);
    const [popupStudents, setPopupStudents] = useState<Student[]>([]);
    const [popupCountdown, setPopupCountdown] = useState(10);
    const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent'>>({});
    const [markingStudentId, setMarkingStudentId] = useState<string | null>(null);

    // Modal states
    const [showSosConfirm, setShowSosConfirm] = useState(false);
    const [showBusSwitch, setShowBusSwitch] = useState(false);
    const [showEndTrip, setShowEndTrip] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [endingTrip, setEndingTrip] = useState(false);

    const [switchForm, setSwitchForm] = useState({ reason: 'breakdown', notes: '', km_at_switch: '', new_bus_id: '' });
    const [schoolBuses, setSchoolBuses] = useState<{ id: string; bus_number: string }[]>([]);

    // 1km skip toast
    const [skipToast, setSkipToast] = useState<string | null>(null);

    // Refs to avoid stale closures in watchPosition and countdown timer
    const currentStopRef = useRef<Stop | null>(null);
    const allStudentsRef = useRef<Student[]>([]);
    const proximityTriggeredRef = useRef(false);
    const skipAlertedStopRef = useRef<string | null>(null);
    const advanceStopRef = useRef<() => Promise<void>>(async () => {});
    const triggerProximityPopupRef = useRef<() => void>(() => {});
    const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    // Mirrors of state for use inside countdown closure and watchPosition
    const attendanceRef = useRef<Record<string, 'present' | 'absent'>>({});
    const popupStudentsRef = useRef<Student[]>([]);
    const showAttendancePopupRef = useRef(false);

    const fetchTripData = useCallback(async () => {
        try {
            let bid = '';
            try {
                const driverRes = await api.get('/drivers/me');
                bid = driverRes.data?.bus?.id ? String(driverRes.data.bus.id) : '';
                if (bid) {
                    setBusId(bid);
                    setBusNumber(driverRes.data?.bus?.bus_number || '');
                    busIdRef.current = bid;
                    connectSocket(bid);
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

    // GPS bearing from position changes (stable direction, not compass-based)

    useEffect(() => {
        let watchId: number | null = null;

        const startTracking = () => {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setCurrentPos([pos.coords.latitude, pos.coords.longitude]);
                    setAccuracy(pos.coords.accuracy ?? null);
                    if (pos.coords.heading != null) {
                        headingRef.current = pos.coords.heading;
                        setHeading(pos.coords.heading);
                    }
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
                    const { latitude, longitude, accuracy: acc, speed } = pos.coords;
                    setCurrentPos([latitude, longitude]);
                    setAccuracy(acc ?? null);
                    // Calculate bearing from position delta — stable direction, no compass spin
                    if (prevPosRef.current && (speed == null || speed > 1)) {
                        const [pLat, pLng] = prevPosRef.current;
                        const dLng = (longitude - pLng) * Math.PI / 180;
                        const lat1R = pLat * Math.PI / 180;
                        const lat2R = latitude * Math.PI / 180;
                        const y = Math.sin(dLng) * Math.cos(lat2R);
                        const x = Math.cos(lat1R) * Math.sin(lat2R) - Math.sin(lat1R) * Math.cos(lat2R) * Math.cos(dLng);
                        const bearing = ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
                        headingRef.current = bearing;
                        setHeading(bearing);
                    }
                    prevPosRef.current = [latitude, longitude];
                    setGeoError('');
                    setLocationDenied(false);
                    const currentBusId = busIdRef.current;
                    if (currentBusId) {
                        try {
                            getSocket().emit('update-location', {
                                busId: currentBusId,
                                lat: latitude,
                                lng: longitude,
                                heading: headingRef.current,
                            });
                        } catch { /* socket unavailable */ }
                    }
                    // Proximity check — auto-trigger attendance popup within 50 m of current stop
                    const stop = currentStopRef.current;
                    if (stop?.latitude && stop?.longitude) {
                        const R = 6371000;
                        const dLat = (stop.latitude - latitude) * Math.PI / 180;
                        const dLng = (stop.longitude - longitude) * Math.PI / 180;
                        const a = Math.sin(dLat / 2) ** 2 +
                            Math.cos(latitude * Math.PI / 180) * Math.cos(stop.latitude * Math.PI / 180) *
                            Math.sin(dLng / 2) ** 2;
                        const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                        if (dist <= 50 && !proximityTriggeredRef.current) {
                            proximityTriggeredRef.current = true;
                            triggerProximityPopupRef.current();
                        } else if (dist > 1000 && !proximityTriggeredRef.current && skipAlertedStopRef.current !== stop.id && !showAttendancePopupRef.current) {
                            skipAlertedStopRef.current = stop.id;
                            setSkipToast(stop.name);
                            setTimeout(() => setSkipToast(null), 3000);
                        }
                    }
                },
                (err) => {
                    if (err.code === 1) setLocationDenied(true);
                },
                { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
            );
        };

        fetchTripData().then(() => {
            if (!('geolocation' in navigator)) {
                setGeoError('Geolocation is not supported by this browser.');
                return;
            }
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
    const rawStops = tripData?.route?.stops || [];
    const isEvening = tripData?.route?.route_type === 'afternoon';
    // Filter stops by trip_type for this route; fall back to all stops for legacy routes with no trip_type set
    const hasTripTypeSplit = rawStops.some((s: any) => s.trip_type && s.trip_type !== 'morning');
    const stops = hasTripTypeSplit
        ? rawStops.filter((s: any) => s.trip_type === (isEvening ? 'evening' : 'morning') || s.trip_type === 'both')
        : isEvening ? [...rawStops].reverse() : rawStops;
    const allStudents = tripData?.route?.students || [];
    const currentStop = stops[currentStopIndex];
    const nextStop = stops[currentStopIndex + 1];

    // Straight-line distance to the current (next) stop
    const nextStopDistanceKm = useMemo(() => {
        if (!currentPos || !currentStop?.latitude || !currentStop?.longitude) return null;
        const [lat, lng] = currentPos;
        const R = 6371;
        const dLat = (currentStop.latitude - lat) * Math.PI / 180;
        const dLng = (currentStop.longitude - lng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat * Math.PI / 180) * Math.cos(currentStop.latitude * Math.PI / 180) *
            Math.sin(dLng / 2) ** 2;
        const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return dist;
    }, [currentPos, currentStop]);

    const getStudentsAtStop = (stopId: string) =>
        allStudents.filter(s => s.stop_id === stopId);

    // Keep refs in sync so watchPosition and countdown can read latest values
    useEffect(() => { currentStopRef.current = currentStop ?? null; });
    useEffect(() => { allStudentsRef.current = allStudents; });
    useEffect(() => { attendanceRef.current = attendance; }, [attendance]);
    useEffect(() => { popupStudentsRef.current = popupStudents; }, [popupStudents]);
    useEffect(() => { showAttendancePopupRef.current = showAttendancePopup; }, [showAttendancePopup]);

    // Reset proximity + skip triggers whenever stop advances so next stop can trigger again
    useEffect(() => {
        proximityTriggeredRef.current = false;
        skipAlertedStopRef.current = null;
    }, [currentStopIndex]);

    // Auto-trigger attendance popup when driver is within 50 m of the current stop
    const triggerProximityPopup = () => {
        const stop = currentStopRef.current;
        if (!stop) return;
        const students = allStudentsRef.current.filter(s => s.stop_id === stop.id);
        setPopupStudents(students);
        setAttendance({});
        setPopupCountdown(10);
        setShowAttendancePopup(true);
    };

    // Keep function refs in sync so closures in watchPosition see latest versions
    useEffect(() => { triggerProximityPopupRef.current = triggerProximityPopup; });
    useEffect(() => { advanceStopRef.current = advanceStop; });

    // Countdown — auto-advance only when ALL students are marked; otherwise reset timer
    useEffect(() => {
        if (!showAttendancePopup) return;
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

        countdownTimerRef.current = setInterval(() => {
            setPopupCountdown(prev => {
                if (prev <= 1) {
                    const students = popupStudentsRef.current;
                    const marked = attendanceRef.current;
                    const allMarked = students.every(s => marked[s.id]);
                    if (!allMarked) {
                        // Reset timer — don't advance until driver marks everyone
                        return 10;
                    }
                    clearInterval(countdownTimerRef.current!);
                    setShowAttendancePopup(false);
                    setPopupStudents([]);
                    advanceStopRef.current();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => { if (countdownTimerRef.current) clearInterval(countdownTimerRef.current); };
    }, [showAttendancePopup]);

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

    const openBusSwitch = () => {
        setSwitchForm({ reason: 'breakdown', notes: '', km_at_switch: '', new_bus_id: '' });
        setShowBusSwitch(true);
        api.get('/buses').then(res => {
            const list: { id: string; bus_number: string }[] = (res.data || []).filter((b: any) => b.id !== busId);
            setSchoolBuses(list);
        }).catch(() => {});
    };

    const handleBusSwitch = async () => {
        if (!switchForm.new_bus_id) {
            alert('Please select the replacement bus.');
            return;
        }
        setSubmitting(true);
        try {
            await api.post('/bus-switch', {
                original_bus_id: busId || undefined,
                reason: switchForm.reason,
                notes: switchForm.notes,
                km_at_switch: switchForm.km_at_switch ? parseFloat(switchForm.km_at_switch) : undefined,
                new_bus_id: switchForm.new_bus_id,
            });
            setShowBusSwitch(false);
            alert('Bus switch request submitted.');
        } catch (e: any) {
            alert(e.response?.data?.message || 'Failed to submit switch request');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEndTrip = async () => {
        setEndingTrip(true);
        try {
            if (tripData?.id) {
                await api.post(`/trips/${tripData.id}/complete`);
            }
            window.location.href = '/driver/dashboard';
        } catch {
            setEndingTrip(false);
            setShowEndTrip(false);
            alert('Failed to end trip. Please try again.');
        }
    };

    const mapStops = stops
        .filter(s => s.latitude && s.longitude)
        .map(s => ({ id: s.id, name: s.name, sequence: s.sequence, lat: s.latitude!, lng: s.longitude! }));

    const fallbackPos: [number, number] = [20.5937, 78.9629];

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
            {/* Map — explicit height so Leaflet container has non-zero size */}
            <div className="bg-slate-200 dark:bg-slate-800 relative z-0" style={{ height: '60vh' }}>
                <DriverMap
                    userPosition={currentPos || fallbackPos}
                    userHeading={heading}
                    userAccuracy={accuracy}
                    stops={mapStops}
                    nextStopIndex={currentStopIndex}
                />

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
                        onClick={openBusSwitch}
                        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white px-3 py-2 rounded-xl flex items-center gap-1.5 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95 shadow-sm"
                    >
                        <Wrench className="w-4 h-4" /> Switch Bus
                    </button>
                </div>
            </div>

            {geoError && !locationDenied && (
                <div className="fixed top-16 left-4 right-4 z-[300] bg-red-500 text-white text-xs font-medium px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    {geoError}
                </div>
            )}

            {/* Bottom control sheet */}
            <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 rounded-t-2xl shadow-2xl border-t border-slate-100 dark:border-slate-700 p-5 z-20">
                <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-4" />

                {!currentStop ? (
                    <div className="text-center py-2">
                        <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Check className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">All Stops Completed!</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">The route is complete. Slide below to end the trip.</p>
                        <button
                            onClick={() => setShowEndTrip(true)}
                            className="flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white rounded-xl px-4 py-3 font-bold text-sm transition-all active:scale-95 w-full"
                        >
                            End Trip
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Heading to</p>
                                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 rounded-full px-2 py-0.5">
                                        {currentStopIndex + 1} / {stops.length}
                                    </span>
                                </div>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Navigation className="w-5 h-5 text-[var(--brand)] shrink-0" />
                                    {currentStop.name}
                                </h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                    {getStudentsAtStop(currentStop.id).length} student{getStudentsAtStop(currentStop.id).length !== 1 ? 's' : ''}{nextStop ? ` · Next: ${nextStop.name}` : ' · Last stop'}
                                    {nextStopDistanceKm !== null && (
                                        <span className="ml-2 font-semibold text-[var(--brand)]">
                                            · {nextStopDistanceKm < 1 ? `${Math.round(nextStopDistanceKm * 1000)} m` : `${nextStopDistanceKm.toFixed(1)} km`}
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowEndTrip(true)}
                            className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-sm transition-all active:scale-95"
                        >
                            End Trip
                        </button>
                    </>
                )}
            </div>

            {/* Skip Stop Toast */}
            {skipToast && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[300] bg-amber-500 text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                    <span>⚠️ Skipping — {skipToast}</span>
                </div>
            )}

            {/* Attendance Popup — compact circular layout */}
            {showAttendancePopup && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center">
                    <div className="bg-white dark:bg-slate-800 rounded-t-2xl shadow-2xl w-full max-w-lg flex flex-col">
                        {/* Countdown progress bar */}
                        <div className="h-1 bg-slate-100 dark:bg-slate-700 rounded-t-2xl overflow-hidden shrink-0">
                            <div className="h-full bg-[var(--brand)] transition-all duration-1000 ease-linear" style={{ width: `${(popupCountdown / 10) * 100}%` }} />
                        </div>
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700 shrink-0">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{currentStop?.name}</h3>
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                                    Tap to mark · auto-advancing in {popupCountdown}s
                                </p>
                            </div>
                            <button onClick={handleDoneWithStop} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Horizontal circle row */}
                        <div className="px-4 py-4 flex gap-4 overflow-x-auto">
                            {popupStudents.map(student => {
                                const marked = attendance[student.id];
                                const ringColor = marked === 'present' ? 'ring-4 ring-emerald-400' : marked === 'absent' ? 'ring-4 ring-red-400' : 'ring-2 ring-slate-200 dark:ring-slate-600';
                                return (
                                    <button
                                        key={student.id}
                                        disabled={markingStudentId === student.id}
                                        onClick={() => handleMarkAttendance(student, marked === 'present' ? 'absent' : 'present')}
                                        className="flex flex-col items-center gap-1.5 shrink-0 w-16 active:scale-95 transition-all disabled:opacity-50"
                                    >
                                        <div className={`w-14 h-14 rounded-full overflow-hidden bg-[var(--brand)]/10 flex items-center justify-center ${ringColor} transition-all`}>
                                            {student.photo_url ? (
                                                <img src={student.photo_url} alt={student.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-base font-bold text-[var(--brand)]">
                                                    {student.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[10px] font-semibold text-slate-800 dark:text-white text-center leading-tight line-clamp-2 w-full">{student.name}</p>
                                        {student.grade && <p className="text-[9px] text-slate-400 dark:text-slate-500">{student.grade}</p>}
                                        {marked && (
                                            <span className={`text-[9px] font-bold ${marked === 'present' ? 'text-emerald-500' : 'text-red-500'}`}>
                                                {marked === 'present' ? '✓ Present' : '✗ Absent'}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="px-4 pb-4 shrink-0">
                            <button onClick={handleDoneWithStop} className="w-full bg-[var(--brand)] hover:opacity-90 text-white rounded-xl py-2.5 font-bold text-sm active:scale-95 transition-all">
                                Done — Next Stop
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
                        {busNumber && (
                            <div className="mb-4 px-4 py-2.5 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
                                <p className="text-xs text-slate-500 dark:text-slate-400">Current Bus</p>
                                <p className="text-sm font-bold text-slate-900 dark:text-white">{busNumber}</p>
                            </div>
                        )}
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
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Replacement Bus <span className="text-red-500">*</span></label>
                                <select value={switchForm.new_bus_id} onChange={e => setSwitchForm({ ...switchForm, new_bus_id: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[var(--brand)] transition-colors">
                                    <option value="">Select a bus…</option>
                                    {schoolBuses.map(b => (
                                        <option key={b.id} value={b.id}>{b.bus_number}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Current Odometer (km) — optional</label>
                                <input type="number" value={switchForm.km_at_switch} onChange={e => setSwitchForm({ ...switchForm, km_at_switch: e.target.value })} placeholder="e.g. 45230" className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors" />
                            </div>
                        </div>
                        <button onClick={handleBusSwitch} disabled={submitting} className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95 w-full justify-center disabled:opacity-50">
                            {submitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Submit Switch Request'}
                        </button>
                    </div>
                </div>
            )}

            {/* End Trip Slider */}
            {showEndTrip && (
                <EndTripSlider
                    onConfirm={handleEndTrip}
                    onCancel={() => setShowEndTrip(false)}
                    isEnding={endingTrip}
                />
            )}
        </div>
    );
}
