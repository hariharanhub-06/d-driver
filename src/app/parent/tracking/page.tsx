'use client';

import { useState, useEffect, useRef } from 'react';
import { Bus, Clock, Navigation, Bell, Loader2, Phone, MapPin, Gauge, ChevronUp } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { connectSocket, getSocket } from '@/lib/socket';
import api from '@/lib/api';
import dynamic from 'next/dynamic';
import { useT } from '@/lib/i18n';
import {
    isLocationFresh,
    shouldRecomputeEta,
    fetchEta,
    formatDistance,
    formatEta,
    resolveBusId,
    stopsForTrip,
    type EtaResult,
    type LatLng,
} from '@/lib/tracking';

const FreeMap = dynamic(() => import('@/components/ui/FreeMap'), { ssr: false });
import StopTimeline from '@/components/parent/StopTimeline';

interface TripProgress {
    current_stop_index: number;
    status: string;
    trip_type?: string | null;
    students_onboard: number;
    students_total: number;
}

interface RouteStop {
    id: string;
    name: string;
    latitude?: number;
    longitude?: number;
    sequence?: number;
    pickup_time?: string;
    trip_type?: string;
}

interface ChildData {
    id: string;
    name: string;
    stop?: { id?: string; name: string; latitude?: number; longitude?: number };
    route_id?: string;
    bus?: { id?: string; bus_number?: string };
    bus_id?: string;
    route?: { id?: string; name?: string; bus_id?: string; bus?: { id?: string; bus_number?: string; drivers?: any[] }; stops?: RouteStop[] };
}

export default function ParentTracking() {
    const { user } = useAuth();
    const t = useT();
    const [busPosition, setBusPosition] = useState<[number, number]>([11.1271, 78.6569]);
    const [busId, setBusId] = useState<string | null>(null);
    const [busNumber, setBusNumber] = useState<string | null>(null);
    const [driverPhone, setDriverPhone] = useState<string | null>(null);
    // Timestamp (ms) of the latest bus location we received; drives the "trip started" decision.
    const [busTimestamp, setBusTimestamp] = useState<number | null>(null);
    const [now, setNow] = useState<number>(Date.now());
    const [eta, setEta] = useState<EtaResult | null>(null);
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
    const [allChildren, setAllChildren] = useState<ChildData[]>([]);
    const [activeChildId, setActiveChildId] = useState<string | null>(null);
    const [childData, setChildData] = useState<ChildData | null>(null);
    const [loading, setLoading] = useState(true);
    const [approaching, setApproaching] = useState(false);
    const [progress, setProgress] = useState<TripProgress | null>(null);
    const [stopsExpanded, setStopsExpanded] = useState(false);
    const [stopChangeModal, setStopChangeModal] = useState<{ id: string; name: string } | null>(null);
    const [stopChangeSubmitting, setStopChangeSubmitting] = useState(false);
    const [stopChangeSuccess, setStopChangeSuccess] = useState(false);
    const [stopChangeError, setStopChangeError] = useState('');

    // OSRM throttle bookkeeping (last call time + position).
    const etaCall = useRef<{ t: number; pos: LatLng | null }>({ t: 0, pos: null });

    useEffect(() => {
        const stored = typeof window !== 'undefined' ? localStorage.getItem('active_child_id') : null;
        if (stored) setActiveChildId(stored);
        fetchParentData(stored);
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                pos => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
                () => {}
            );
        }
    }, []);

    // Tick so freshness (trip-started) decays even without new location events.
    useEffect(() => {
        const i = setInterval(() => setNow(Date.now()), 5000);
        return () => clearInterval(i);
    }, []);

    // Poll bus location every 5 seconds (fallback for when sockets drop).
    useEffect(() => {
        if (!busId) return;
        const interval = setInterval(async () => {
            try {
                const res = await api.get(`/location/bus/${busId}`);
                if (res.data?.latitude) {
                    setBusPosition([res.data.latitude, res.data.longitude]);
                    setBusTimestamp(res.data.timestamp ? new Date(res.data.timestamp).getTime() : Date.now());
                }
            } catch {
                // 404 / network — silently ignore; freshness window will mark trip not-started.
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [busId]);

    // Socket live updates. NOTE: server emits latitude/longitude (NOT lat/lng).
    useEffect(() => {
        if (!busId) return;
        const handleLocationUpdate = (data: { busId?: string; latitude?: number; longitude?: number; timestamp?: string }) => {
            if (data.busId && data.busId !== busId) return;
            if (typeof data.latitude !== 'number' || typeof data.longitude !== 'number') return;
            setBusPosition([data.latitude, data.longitude]);
            setBusTimestamp(data.timestamp ? new Date(data.timestamp).getTime() : Date.now());
        };
        const handleTripCompleted = () => { setBusTimestamp(null); setEta(null); };
        const s = getSocket();
        s.on('location-updated', handleLocationUpdate);
        s.on('trip-completed', handleTripCompleted);
        return () => {
            s.off('location-updated', handleLocationUpdate);
            s.off('trip-completed', handleTripCompleted);
        };
    }, [busId]);

    // Poll trip progress (current stop + onboard counts) and refresh on trip socket events.
    const routeId = childData?.route?.id || childData?.route_id;
    useEffect(() => {
        if (!routeId) return;
        const refresh = () => fetchProgress(routeId);
        const interval = setInterval(refresh, 10000);
        const s = getSocket();
        s.on('bus-arrived-stop', refresh);
        s.on('trip-started', refresh);
        s.on('trip-completed', refresh);
        return () => {
            clearInterval(interval);
            s.off('bus-arrived-stop', refresh);
            s.off('trip-started', refresh);
            s.off('trip-completed', refresh);
        };
    }, [routeId]);

    // Check for recent bus-approaching notifications
    useEffect(() => {
        if (!user) return;
        api.get('/notifications')
            .then(res => {
                const notifs = Array.isArray(res.data) ? res.data : [];
                const recentApproach = notifs.find((n: any) => {
                    if (n.type !== 'bus-approaching') return false;
                    const age = Date.now() - new Date(n.created_at).getTime();
                    return age < 5 * 60 * 1000; // within 5 minutes
                });
                if (recentApproach) setApproaching(true);
            })
            .catch(() => {});
    }, [user]);

    const fetchParentData = async (preferredChildId?: string | null) => {
        try {
            const { data: students } = await api.get('/students/my-children');
            const list: ChildData[] = Array.isArray(students) ? students : [];
            setAllChildren(list);
            const selected = (preferredChildId ? list.find(s => s.id === preferredChildId) : null) || list[0];
            if (selected) {
                setActiveChildId(selected.id);
                setChildData(selected);
                await wireChild(selected);
            }
        } catch {
            // Fetch failed — show error state
        } finally {
            setLoading(false);
        }
    };

    // Resolve bus + driver for a child and seed the live position.
    const wireChild = async (child: ChildData) => {
        const foundBusId = resolveBusId(child);
        const foundBusNumber = child.route?.bus?.bus_number || child.bus?.bus_number || null;
        const foundDriverPhone = child.route?.bus?.drivers?.[0]?.user?.phone || null;
        setDriverPhone(foundDriverPhone);
        if (foundBusId) {
            setBusId(String(foundBusId));
            setBusNumber(foundBusNumber ? String(foundBusNumber) : null);
            connectSocket(String(foundBusId));
            try {
                const { data: loc } = await api.get(`/location/bus/${foundBusId}`);
                if (loc?.latitude) {
                    setBusPosition([loc.latitude, loc.longitude]);
                    setBusTimestamp(loc.timestamp ? new Date(loc.timestamp).getTime() : Date.now());
                }
            } catch { /* 404 = not started */ }
        }
        fetchProgress(child.route?.id || child.route_id);
    };

    // Live trip progress (current stop index + onboard counts) that drives the stop timeline.
    const fetchProgress = async (routeId?: string) => {
        if (!routeId) { setProgress(null); return; }
        try {
            const { data } = await api.get(`/trips/progress/${routeId}`);
            setProgress(data);
        } catch {
            setProgress(null);
        }
    };

    const switchChild = async (child: ChildData) => {
        setActiveChildId(child.id);
        localStorage.setItem('active_child_id', child.id);
        setChildData(child);
        setBusId(null); setBusNumber(null); setBusTimestamp(null); setEta(null); setDriverPhone(null);
        setProgress(null); setStopsExpanded(false);
        etaCall.current = { t: 0, pos: null };
        await wireChild(child);
    };

    const myStop = childData?.stop;
    const stopPos: [number, number] | null = myStop?.latitude && myStop?.longitude
        ? [myStop.latitude, myStop.longitude] : null;

    // The bus is "live / on a trip" only when its last fix is recent.
    // Live only when the last fix is fresh AND a trip is actually running. Without the trip
    // check, the bus kept showing after the driver ended the trip (the last location stays
    // "fresh" for 90s and the poll keeps re-marking it). progress comes from /trips/progress.
    const tripStarted = isLocationFresh(busTimestamp, now) && (!progress || progress.status === 'running');
    const mapCenter: [number, number] = tripStarted ? busPosition : (userLocation || stopPos || busPosition);

    // Recompute ETA (throttled) whenever the bus moves while a trip is running.
    useEffect(() => {
        if (!tripStarted || !stopPos) { setEta(null); return; }
        const busLL: LatLng = { lat: busPosition[0], lng: busPosition[1] };
        const stopLL: LatLng = { lat: stopPos[0], lng: stopPos[1] };
        if (!shouldRecomputeEta(busLL, etaCall.current.pos, etaCall.current.t)) return;
        etaCall.current = { t: Date.now(), pos: busLL };
        const ctrl = new AbortController();
        fetchEta(busLL, stopLL, ctrl.signal)
            .then(setEta)
            .catch(() => { /* aborted */ });
        return () => ctrl.abort();
    }, [tripStarted, busPosition, stopPos]);

    // Stops for the active trip's direction (morning/evening), so map pins + the timeline
    // match the trip and don't duplicate the start/end.
    const routeStops = stopsForTrip(childData?.route?.stops || [], progress?.trip_type);
    const stopMarkers = routeStops
        .filter(s => s.latitude != null && s.longitude != null)
        .map((s, idx) => ({
            id: s.id,
            position: [s.latitude!, s.longitude!] as [number, number],
            title: s.name,
            description: s.pickup_time ? `${s.name} · ${s.pickup_time}` : s.name,
            stopNumber: s.sequence ?? idx + 1,
            isMyStop: s.id === myStop?.id,
        }));

    const markers = [
        // Route stops (fallback to just the child's stop if the route has none with coords).
        ...(stopMarkers.length > 0
            ? stopMarkers
            : (stopPos ? [{ id: myStop!.id, position: stopPos, title: myStop!.name, description: myStop!.name, isStopPin: true as const, isSelected: true }] : [])),
        ...(userLocation ? [{ position: userLocation, title: 'Your Location', isUserLocation: true as const }] : []),
        ...(tripStarted ? [{ position: busPosition, title: `Bus ${busNumber || busId || ''}`, isBus: true as const }] : []),
    ];

    const handleStopClick = (id: string, name: string) => {
        if (id === myStop?.id) return; // already their stop
        setStopChangeSuccess(false);
        setStopChangeError('');
        setStopChangeModal({ id, name });
    };

    const submitStopChange = async () => {
        if (!stopChangeModal) return;
        setStopChangeSubmitting(true);
        try {
            await api.post('/stop-change', {
                student_id: childData?.id || undefined,
                current_stop_id: myStop?.id,
                requested_stop_id: stopChangeModal.id,
                change_type: 'permanent',
                effective_date: new Date().toLocaleDateString('en-CA'),
            });
            setStopChangeSuccess(true);
        } catch {
            setStopChangeError('Failed to submit request. Please try again.');
        } finally {
            setStopChangeSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full relative bg-slate-50 dark:bg-slate-900 overflow-hidden">
            {/* Map fills the whole background */}
            <div className="absolute inset-0 z-0">
                <FreeMap center={mapCenter} zoom={15} markers={markers} onStopClick={handleStopClick} />
            </div>

            {/* Bus approaching banner */}
            {approaching && (
                <div className="absolute top-4 left-4 right-4 z-20 bg-amber-500 text-white rounded-2xl px-5 py-3 flex items-center gap-3 shadow-xl animate-bounce">
                    <Bus className="w-5 h-5 shrink-0" />
                    <span className="font-semibold text-sm">{t('Bus is approaching your stop!', 'பேருந்து உங்கள் நிறுத்தத்தை நெருங்குகிறது!')}</span>
                    <button onClick={() => setApproaching(false)} className="ml-auto text-white/70 hover:text-white">✕</button>
                </div>
            )}

            {/* Top info card */}
            <div className="absolute top-4 left-4 right-16 z-10 space-y-2">
                {/* Child selector — only when multiple children */}
                {allChildren.length > 1 && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 px-3 py-2 flex gap-2 overflow-x-auto">
                        {allChildren.map(c => (
                            <button
                                key={c.id}
                                onClick={() => switchChild(c)}
                                className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${activeChildId === c.id ? 'bg-[var(--brand)] text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}
                            >
                                {c.name}
                            </button>
                        ))}
                    </div>
                )}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-[var(--brand)] text-white rounded-xl flex items-center justify-center shrink-0">
                        <Bus size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm leading-tight truncate">
                            {tripStarted ? `Bus #${busNumber || busId}` : (childData?.name || t('Live Tracking', 'நேரடி கண்காணிப்பு'))}
                            {tripStarted && childData ? ` · ${childData.name}` : ''}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                            {tripStarted ? (
                                <>
                                    <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full uppercase tracking-widest">{t('Live', 'நேரடி')}</span>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1"><Clock size={10} /> {t('Bus en route', 'பேருந்து வருகிறது')}</p>
                                </>
                            ) : (
                                <>
                                    <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-full uppercase tracking-widest">{t('Waiting', 'காத்திருக்கிறது')}</span>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{t("Bus hasn't started yet", 'பேருந்து இன்னும் தொடங்கவில்லை')}</p>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <button className="absolute top-4 right-4 z-10 w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-[var(--brand)] transition-all active:scale-95">
                <Bell size={20} />
            </button>

            {/* Floating call button — only shown when driver has a phone */}
            {driverPhone && (
                <a
                    href={`tel:${driverPhone}`}
                    className="absolute bottom-44 right-4 z-20 w-14 h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-xl flex items-center justify-center transition-all active:scale-95"
                    title={`Call driver: ${driverPhone}`}
                >
                    <Phone size={22} />
                </a>
            )}

            {/* ETA/status bar at bottom as overlay card — expands into a scrollable stop timeline */}
            <div className={`absolute bottom-4 left-4 right-4 z-10 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 p-4 flex flex-col ${stopsExpanded ? 'max-h-[75vh]' : ''}`}>
                {/* Bus Stops handle — tap to expand the timeline */}
                <button
                    onClick={() => setStopsExpanded(v => !v)}
                    className="flex items-center justify-between w-full mb-3 -mt-1 group"
                >
                    <span className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                        🚏 {t('Bus Stops', 'நிறுத்தங்கள்')}
                    </span>
                    <ChevronUp size={18} className={`text-slate-400 transition-transform ${stopsExpanded ? 'rotate-180' : ''}`} />
                </button>

                {/* Expanded scrollable timeline */}
                {stopsExpanded && (
                    <div className="flex-1 min-h-0 overflow-y-auto mb-3 pr-1 border-t border-slate-100 dark:border-slate-700 pt-3">
                        <StopTimeline
                            stops={routeStops}
                            currentStopIndex={progress?.current_stop_index ?? 0}
                            myStopId={myStop?.id}
                            status={progress?.status || 'idle'}
                            direction={progress?.status === 'running' ? progress?.trip_type : null}
                            onStopClick={handleStopClick}
                        />
                    </div>
                )}

                <div className="flex justify-between items-start mb-3">
                    <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                            <MapPin size={11} /> {t('Your Stop', 'உங்கள் நிறுத்தம்')}
                        </p>
                        <h5 className="font-bold text-slate-900 dark:text-white text-base truncate">
                            {childData?.stop?.name || t('Home Stop', 'வீட்டு நிறுத்தம்')}
                        </h5>
                    </div>
                    <div className="w-9 h-9 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
                        <Navigation size={16} />
                    </div>
                </div>

                {/* Real distance + ETA when the trip is running; clear waiting state otherwise. */}
                {tripStarted ? (
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-slate-50 dark:bg-slate-700/40 rounded-xl px-3 py-2.5 flex items-center gap-2.5">
                            <Gauge size={18} className="text-[var(--brand)] shrink-0" />
                            <div className="min-w-0">
                                <p className="text-[10px] text-slate-400 uppercase tracking-wide leading-none mb-1">{t('Distance', 'தூரம்')}</p>
                                <p className="font-bold text-slate-900 dark:text-white text-sm leading-none">
                                    {eta ? formatDistance(eta.distanceM) : '…'}
                                </p>
                            </div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-700/40 rounded-xl px-3 py-2.5 flex items-center gap-2.5">
                            <Clock size={18} className="text-[var(--brand)] shrink-0" />
                            <div className="min-w-0">
                                <p className="text-[10px] text-slate-400 uppercase tracking-wide leading-none mb-1">{t('Arriving in', 'வரும் நேரம்')}</p>
                                <p className="font-bold text-slate-900 dark:text-white text-sm leading-none">
                                    {eta ? formatEta(eta.durationS, eta.source) : '…'}
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/40 rounded-xl px-3 py-3 mb-4">
                        <Clock size={16} className="text-amber-500 shrink-0" />
                        <p className="text-xs font-medium text-amber-700 dark:text-amber-400 leading-snug">
                            {t("Bus hasn't started yet. We'll show live distance and arrival time once the trip begins.", 'பேருந்து இன்னும் தொடங்கவில்லை. பயணம் தொடங்கியதும் நேரடி தூரம் மற்றும் வரும் நேரம் காட்டப்படும்.')}
                        </p>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                    <a
                        href="/parent/requests"
                        className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95 justify-center"
                    >
                        <Navigation size={14} />
                        {t('Stop Request', 'நிறுத்தம் மாற்று கோரிக்கை')}
                    </a>
                    <a
                        href="/parent/dashboard"
                        className="flex items-center gap-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-4 py-2.5 font-semibold text-sm justify-center"
                    >
                        {t('Back to Home', 'முகப்புக்கு திரும்பு')}
                    </a>
                </div>
            </div>
            {/* Stop change confirmation modal */}
            {stopChangeModal && (
                <div className="absolute inset-0 z-30 bg-black/50 flex items-end justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm shadow-2xl p-5">
                        {stopChangeSuccess ? (
                            <div className="flex flex-col items-center text-center gap-3 py-4">
                                <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                                    <Navigation className="w-7 h-7 text-emerald-600" />
                                </div>
                                <h3 className="font-bold text-slate-900 dark:text-white text-lg">{t('Request Sent!', 'கோரிக்கை அனுப்பப்பட்டது!')}</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    {t('Your request to change to', 'இடம் மாற்றும் கோரிக்கை')} <span className="font-semibold text-slate-700 dark:text-slate-200">{stopChangeModal.name}</span> {t('has been submitted. You will be notified after admin approval.', 'சமர்ப்பிக்கப்பட்டது. நிர்வாகி அனுமதித்தவுடன் அறிவிப்பு வரும்.')}
                                </p>
                                <button
                                    onClick={() => setStopChangeModal(null)}
                                    className="w-full py-2.5 bg-[var(--brand)] text-white rounded-xl font-semibold text-sm"
                                >
                                    {t('Done', 'முடிந்தது')}
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center shrink-0">
                                        <Navigation className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white text-base">{t('Change Stop?', 'நிறுத்தம் மாற்றவா?')}</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{t('Requires admin approval', 'நிர்வாகி அனுமதி தேவை')}</p>
                                    </div>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 mb-4">
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t('Current Stop', 'தற்போதைய நிறுத்தம்')}</p>
                                    <p className="font-semibold text-sm text-slate-700 dark:text-slate-200">{childData?.stop?.name || '—'}</p>
                                    <p className="text-xs text-slate-400 mt-2 mb-1">{t('New Stop', 'புதிய நிறுத்தம்')}</p>
                                    <p className="font-bold text-sm text-[var(--brand)]">{stopChangeModal.name}</p>
                                </div>
                                {stopChangeError && (
                                    <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2 mb-3">
                                        {t('Failed to submit request. Please try again.', 'கோரிக்கை சமர்ப்பிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.')}
                                    </p>
                                )}
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setStopChangeModal(null)}
                                        className="flex-1 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl font-semibold text-sm"
                                    >
                                        {t('Cancel', 'ரத்து செய்')}
                                    </button>
                                    <button
                                        onClick={submitStopChange}
                                        disabled={stopChangeSubmitting}
                                        className="flex-1 py-2.5 bg-[var(--brand)] text-white rounded-xl font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2"
                                    >
                                        {stopChangeSubmitting ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : t('Request Change', 'மாற்று கோரிக்கை')}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
