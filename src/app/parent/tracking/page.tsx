'use client';

import { useState, useEffect } from 'react';
import { Bus, Clock, Navigation, Bell, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { socket, connectSocket } from '@/lib/socket';
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
        socket.on('location-updated', handleLocationUpdate);
        return () => { socket.off('location-updated', handleLocationUpdate); };
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
                const foundBusId = student.bus?.id || student.bus_id || '12';
                setBusId(String(foundBusId));
                connectSocket(String(foundBusId));
                try {
                    const { data: loc } = await api.get(`/location/bus/${foundBusId}`);
                    if (loc?.latitude) setBusPosition([loc.latitude, loc.longitude]);
                } catch { /* use default position */ }
            } else {
                setBusId('12');
                connectSocket('12');
            }
        } catch {
            setBusId('12');
            connectSocket('12');
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
            <div className="h-screen flex items-center justify-center bg-slate-900">
                <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen relative bg-slate-900 overflow-hidden">
            {/* Map fills the whole background */}
            <div className="absolute inset-0 z-0">
                <FreeMap center={busPosition} zoom={15} markers={markers} />
            </div>

            {/* Bus approaching banner */}
            {approaching && (
                <div className="absolute top-20 left-4 right-4 z-20 bg-amber-500 text-white rounded-2xl px-5 py-3 flex items-center gap-3 shadow-xl animate-bounce">
                    <Bus className="w-5 h-5 shrink-0" />
                    <span className="font-black text-sm">Bus is approaching your stop!</span>
                    <button onClick={() => setApproaching(false)} className="ml-auto text-white/70 hover:text-white">✕</button>
                </div>
            )}

            {/* Top info card */}
            <div className="absolute top-4 left-4 right-4 z-10 flex gap-3">
                <div className="flex-1 bg-white/85 backdrop-blur-md rounded-3xl shadow-2xl p-4 border border-white/40 flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/30 shrink-0">
                        <Bus size={22} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="font-extrabold text-gray-900 text-base leading-tight truncate">
                            Bus #{busId || '—'}{childData ? ` · ${childData.name}` : ''}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-black text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full uppercase tracking-widest">Live</span>
                            <p className="text-xs text-gray-500 font-bold flex items-center gap-1">
                                <Clock size={11} className="text-gray-400" />
                                Tracking active
                            </p>
                        </div>
                    </div>
                </div>
                <button className="w-14 h-14 bg-white/85 backdrop-blur-md rounded-3xl shadow-2xl flex items-center justify-center border border-white/40 text-gray-600 hover:text-primary-500 transition-all active:scale-95">
                    <Bell size={22} />
                </button>
            </div>

            {/* Bottom panel */}
            <div className="absolute bottom-24 left-4 right-4 z-10">
                <div className="bg-white/90 backdrop-blur-xl rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] p-6 border border-white/40">
                    <div className="flex justify-between items-start mb-5">
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Your Stop</p>
                            <h5 className="font-extrabold text-gray-900 text-lg">
                                {childData?.stop?.name || 'Home Stop'}
                            </h5>
                            <p className="text-xs text-gray-500 mt-0.5">Bus is en route to your location</p>
                        </div>
                        <div className="w-10 h-10 bg-green-50 text-green-600 rounded-full flex items-center justify-center shrink-0">
                            <Navigation size={18} />
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div className="relative h-2 bg-gray-100 rounded-full mb-5 overflow-hidden">
                        <div className="absolute h-full bg-gradient-to-r from-primary-500 to-emerald-500 rounded-full w-[60%] shadow-[0_0_10px_rgba(45,188,117,0.4)] transition-all duration-1000" />
                        <div className="absolute -top-1 left-[60%] w-4 h-4 bg-white border-4 border-primary-500 rounded-full shadow-md transition-all duration-1000" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <a
                            href="/parent/request"
                            className="bg-gray-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 text-sm hover:bg-black transition-all active:scale-95"
                        >
                            <Navigation size={16} className="text-primary-400" />
                            Stop Request
                        </a>
                        <a
                            href="/parent/dashboard"
                            className="bg-white text-gray-900 border border-gray-200 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 text-sm hover:bg-gray-50 transition-all active:scale-95"
                        >
                            Back to Home
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
