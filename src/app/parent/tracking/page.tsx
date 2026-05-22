'use client';

import { useState, useEffect } from 'react';
import { Bus, Clock, Navigation, Bell, Loader2, MapPin } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { connectSocket, getSocket } from '@/lib/socket';
import api from '@/lib/api';
import dynamic from 'next/dynamic';

const FreeMap = dynamic(() => import('@/components/ui/FreeMap'), { ssr: false });

interface RouteStop {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    sequence: number;
}

interface ChildData {
    name: string;
    stop?: { id?: string; name: string; lat?: number; lng?: number };
    route_id?: string;
}

export default function ParentTracking() {
    const { user } = useAuth();
    const [busPosition, setBusPosition] = useState<[number, number]>([12.9716, 77.5946]);
    const [busId, setBusId] = useState<string | null>(null);
    const [busNumber, setBusNumber] = useState<string | null>(null);
    const [hasBusLive, setHasBusLive] = useState(false);
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
    const [childData, setChildData] = useState<ChildData | null>(null);
    const [routeStops, setRouteStops] = useState<RouteStop[]>([]);
    const [loading, setLoading] = useState(true);
    const [approaching, setApproaching] = useState(false);
    const [stopChangeModal, setStopChangeModal] = useState<{ id: string; name: string } | null>(null);
    const [stopChangeSubmitting, setStopChangeSubmitting] = useState(false);
    const [stopChangeSuccess, setStopChangeSuccess] = useState(false);

    useEffect(() => {
        fetchParentData();
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                pos => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
                () => {}
            );
        }
    }, []);

    // Poll bus location every 5 seconds
    useEffect(() => {
        if (!busId) return;
        const interval = setInterval(async () => {
            try {
                const res = await api.get(`/location/bus/${busId}`);
                if (res.data?.latitude) {
                    setBusPosition([res.data.latitude, res.data.longitude]);
                    setHasBusLive(true);
                }
            } catch {
                // silently ignore polling errors
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [busId]);

    // Socket live updates
    useEffect(() => {
        if (!busId) return;
        const handleLocationUpdate = (data: { lat: number; lng: number }) => {
            setBusPosition([data.lat, data.lng]);
        };
        getSocket().on('location-updated', handleLocationUpdate);
        return () => { getSocket().off('location-updated', handleLocationUpdate); };
    }, [busId]);

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

    const fetchParentData = async () => {
        try {
            const { data: students } = await api.get('/students/my-children');
            const student = Array.isArray(students) ? students[0] : null;
            if (student) {
                setChildData({
                    name: student.name,
                    stop: student.stop,
                    route_id: student.route_id,
                });
                const foundBusId = student.bus?.id || student.bus_id || student.route?.bus_id || student.route?.bus?.id;
                const foundBusNumber = student.bus?.bus_number || student.route?.bus?.bus_number || null;
                if (foundBusId) {
                    setBusId(String(foundBusId));
                    setBusNumber(foundBusNumber ? String(foundBusNumber) : null);
                    connectSocket(String(foundBusId));
                    try {
                        const { data: loc } = await api.get(`/location/bus/${foundBusId}`);
                        if (loc?.latitude) {
                            setBusPosition([loc.latitude, loc.longitude]);
                            setHasBusLive(true);
                        }
                    } catch { /* use default position */ }
                }
                if (student.route_id) {
                    try {
                        const { data: route } = await api.get(`/routes/${student.route_id}`);
                        if (route?.stops?.length) setRouteStops(route.stops);
                    } catch { /* stops remain empty */ }
                }
            }
        } catch {
            // Fetch failed — show error state, no bus ID fallback
        } finally {
            setLoading(false);
        }
    };

    const myStopId = childData?.stop?.id;
    const mapCenter: [number, number] = hasBusLive ? busPosition : (userLocation || busPosition);

    const markers = [
        ...(hasBusLive ? [{ position: busPosition, title: `Bus ${busNumber || busId || ''}`, isBus: true }] : []),
        ...(userLocation ? [{ position: userLocation, title: 'Your Location', isUserLocation: true }] : []),
        ...routeStops
            .filter(s => s.latitude && s.longitude)
            .sort((a, b) => a.sequence - b.sequence)
            .map(s => ({
                id: s.id,
                position: [s.latitude, s.longitude] as [number, number],
                title: s.name,
                description: s.name,
                stopNumber: s.sequence,
                isMyStop: s.id === myStopId,
            })),
    ];

    const handleStopClick = (id: string, name: string) => {
        if (id === myStopId) return; // already their stop
        setStopChangeSuccess(false);
        setStopChangeModal({ id, name });
    };

    const submitStopChange = async () => {
        if (!stopChangeModal) return;
        setStopChangeSubmitting(true);
        try {
            const student = childData ? { stop: childData.stop } : null;
            await api.post('/stop-change', {
                student_id: user?.student_id || undefined,
                current_stop_id: myStopId,
                requested_stop_id: stopChangeModal.id,
                change_type: 'permanent',
                effective_date: new Date().toLocaleDateString('en-CA'),
            });
            setStopChangeSuccess(true);
        } catch {
            // keep modal open to show error
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
        <div className="flex flex-col h-screen relative bg-slate-50 dark:bg-slate-900 overflow-hidden">
            {/* Map fills the whole background */}
            <div className="absolute inset-0 z-0">
                <FreeMap center={mapCenter} zoom={15} markers={markers} onStopClick={handleStopClick} />
            </div>

            {/* Bus approaching banner */}
            {approaching && (
                <div className="absolute top-4 left-4 right-4 z-20 bg-amber-500 text-white rounded-2xl px-5 py-3 flex items-center gap-3 shadow-xl animate-bounce">
                    <Bus className="w-5 h-5 shrink-0" />
                    <span className="font-semibold text-sm">Bus is approaching your stop!</span>
                    <button onClick={() => setApproaching(false)} className="ml-auto text-white/70 hover:text-white">✕</button>
                </div>
            )}

            {/* Top info card */}
            <div className="absolute top-4 left-4 right-16 z-10">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-[var(--brand)] text-white rounded-xl flex items-center justify-center shrink-0">
                        <Bus size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm leading-tight truncate">
                            {hasBusLive ? `Bus #${busNumber || busId}` : (childData?.name || 'Tracking')}
                            {hasBusLive && childData ? ` · ${childData.name}` : ''}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                            {hasBusLive ? (
                                <>
                                    <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full uppercase tracking-widest">Live</span>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1"><Clock size={10} /> Bus en route</p>
                                </>
                            ) : (
                                <>
                                    <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-full uppercase tracking-widest">Waiting</span>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Bus hasn't started yet</p>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <button className="absolute top-4 right-4 z-10 w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-[var(--brand)] transition-all active:scale-95">
                <Bell size={20} />
            </button>

            {/* ETA/status bar at bottom as overlay card */}
            <div className="absolute bottom-4 left-4 right-4 z-10 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 p-4">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Your Stop</p>
                        <h5 className="font-bold text-slate-900 dark:text-white text-base">
                            {childData?.stop?.name || 'Home Stop'}
                        </h5>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Bus is en route to your location</p>
                    </div>
                    <div className="w-9 h-9 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
                        <Navigation size={16} />
                    </div>
                </div>

                {/* Progress bar */}
                <div className="relative h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full mb-4 overflow-hidden">
                    <div className="absolute h-full bg-[var(--brand)] rounded-full w-[60%] transition-all duration-1000" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <a
                        href="/parent/request"
                        className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95 justify-center"
                    >
                        <Navigation size={14} />
                        Stop Request
                    </a>
                    <a
                        href="/parent/dashboard"
                        className="flex items-center gap-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-4 py-2.5 font-semibold text-sm justify-center"
                    >
                        Back to Home
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
                                <h3 className="font-bold text-slate-900 dark:text-white text-lg">Request Sent!</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Your request to change to <span className="font-semibold text-slate-700 dark:text-slate-200">{stopChangeModal.name}</span> has been submitted. You will be notified after admin approval.
                                </p>
                                <button
                                    onClick={() => setStopChangeModal(null)}
                                    className="w-full py-2.5 bg-[var(--brand)] text-white rounded-xl font-semibold text-sm"
                                >
                                    Done
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center shrink-0">
                                        <Navigation className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white text-base">Change Stop?</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Requires admin approval</p>
                                    </div>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 mb-4">
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Current stop</p>
                                    <p className="font-semibold text-sm text-slate-700 dark:text-slate-200">{childData?.stop?.name || '—'}</p>
                                    <p className="text-xs text-slate-400 mt-2 mb-1">New stop</p>
                                    <p className="font-bold text-sm text-[var(--brand)]">{stopChangeModal.name}</p>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                                    After admin approval, your child will appear at <strong>{stopChangeModal.name}</strong> in the attendance and tracking views.
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setStopChangeModal(null)}
                                        className="flex-1 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl font-semibold text-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={submitStopChange}
                                        disabled={stopChangeSubmitting}
                                        className="flex-1 py-2.5 bg-[var(--brand)] text-white rounded-xl font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2"
                                    >
                                        {stopChangeSubmitting ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : 'Request Change'}
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
