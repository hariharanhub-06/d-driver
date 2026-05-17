'use client';

import { useState, useEffect } from 'react';
import { Bus, Clock, Navigation, Bell, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { connectSocket, getSocket } from '@/lib/socket';
import api from '@/lib/api';
import dynamic from 'next/dynamic';

const FreeMap = dynamic(() => import('@/components/ui/FreeMap'), { ssr: false });

interface ChildData {
    name: string;
    stop?: { name: string; lat?: number; lng?: number };
    route_id?: string;
}

export default function ParentTracking() {
    const { user } = useAuth();
    const [busPosition, setBusPosition] = useState<[number, number]>([12.9716, 77.5946]);
    const [busId, setBusId] = useState<string | null>(null);
    const [childData, setChildData] = useState<ChildData | null>(null);
    const [loading, setLoading] = useState(true);
    const [approaching, setApproaching] = useState(false);

    useEffect(() => {
        fetchParentData();
    }, []);

    // Poll bus location every 5 seconds
    useEffect(() => {
        if (!busId) return;
        const interval = setInterval(async () => {
            try {
                const res = await api.get(`/location/bus/${busId}`);
                if (res.data?.latitude) {
                    setBusPosition([res.data.latitude, res.data.longitude]);
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
                const foundBusId = student.bus?.id || student.bus_id;
                if (foundBusId) {
                    setBusId(String(foundBusId));
                    connectSocket(String(foundBusId));
                    try {
                        const { data: loc } = await api.get(`/location/bus/${foundBusId}`);
                        if (loc?.latitude) setBusPosition([loc.latitude, loc.longitude]);
                    } catch { /* use default position */ }
                }
            }
        } catch {
            // Fetch failed — show error state, no bus ID fallback
        } finally {
            setLoading(false);
        }
    };

    const stopLat = childData?.stop?.lat;
    const stopLng = childData?.stop?.lng;

    const markers = [
        { position: busPosition, title: `School Bus ${busId || ''}` },
        ...(stopLat && stopLng
            ? [{ position: [stopLat, stopLng] as [number, number], title: `Your Stop: ${childData?.stop?.name || 'Home Stop'}`, description: childData?.stop?.name }]
            : []),
    ];

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
                <FreeMap center={busPosition} zoom={15} markers={markers} />
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
                            Bus #{busId || '—'}{childData ? ` · ${childData.name}` : ''}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-semibold text-[var(--brand)] bg-[var(--brand)]/10 px-2 py-0.5 rounded-full uppercase tracking-widest">Live</span>
                            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                <Clock size={10} />
                                Tracking active
                            </p>
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
        </div>
    );
}
