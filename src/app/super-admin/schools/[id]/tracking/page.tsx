'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Bus, Clock, User, MapPin, Loader2, AlertCircle } from 'lucide-react';
import api from '@/lib/api';

const MapComponent = dynamic(() => import('@/components/MapComponent'), { ssr: false });

interface ActiveTrip {
    id: string;
    bus_id: string;
    bus_number?: string;
    route_id: string;
    route_name?: string;
    driver_id?: string;
    driver_name?: string;
    status: string;
}

interface BusPosition {
    bus_id: string;
    bus_number: string;
    latitude: number;
    longitude: number;
    timestamp: string;
    driver_name?: string;
    route_name?: string;
}

export default function SchoolTrackingPage() {
    const { id } = useParams<{ id: string }>();

    const [trips, setTrips] = useState<ActiveTrip[]>([]);
    const [positions, setPositions] = useState<BusPosition[]>([]);
    const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchTrips = async () => {
        try {
            const res = await api.get(`/trips/active?school_id=${id}`);
            setTrips(Array.isArray(res.data) ? res.data : []);
        } catch {
            // non-fatal: trips may be empty
        }
    };

    const fetchPositions = async () => {
        try {
            const res = await api.get(`/location/active?school_id=${id}`);
            const data = Array.isArray(res.data) ? res.data : [];
            // Merge driver/route names from trips into positions
            setPositions(data.map((pos: BusPosition) => {
                const trip = trips.find(t => t.bus_id === pos.bus_id);
                return {
                    ...pos,
                    driver_name: pos.driver_name || trip?.driver_name,
                    route_name: pos.route_name || trip?.route_name,
                };
            }));
            setError('');
        } catch {
            setError('Unable to fetch live positions.');
        }
    };

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await fetchTrips();
            await fetchPositions();
            setLoading(false);
        };
        init();
    }, [id]);

    // Poll positions every 5 seconds
    useEffect(() => {
        intervalRef.current = setInterval(fetchPositions, 5000);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [id, trips]);

    const formatTime = (ts: string) => {
        if (!ts) return '—';
        try {
            return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        } catch {
            return '—';
        }
    };

    return (
        <div className="flex h-[calc(100vh-120px)] gap-4 overflow-hidden">
            {/* Left panel */}
            <div className="w-72 shrink-0 flex flex-col gap-3 overflow-y-auto pr-1">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-widest text-white/40">Live Buses</span>
                    <span className="ml-auto text-xs font-black text-white/20">{positions.length} active</span>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-16">
                        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                        <p className="text-white/30 text-xs font-bold">Loading...</p>
                    </div>
                ) : error ? (
                    <div className="flex items-start gap-3 p-4 bg-red-500/10 rounded-xl border border-red-500/20">
                        <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                        <p className="text-red-400 text-xs font-bold">{error}</p>
                    </div>
                ) : positions.length === 0 ? (
                    <div className="text-center py-16 text-white/20 text-xs font-bold">
                        No active buses right now.
                    </div>
                ) : (
                    positions.map(pos => {
                        const isSelected = selectedBusId === pos.bus_id;
                        return (
                            <button
                                key={pos.bus_id}
                                onClick={() => setSelectedBusId(isSelected ? null : pos.bus_id)}
                                className={`w-full text-left p-4 rounded-xl border transition-all ${
                                    isSelected
                                        ? 'bg-blue-600/20 border-blue-500/40'
                                        : 'bg-[#161b22] border-[#30363d] hover:border-blue-500/30 hover:bg-white/5'
                                }`}
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-blue-600' : 'bg-white/5'}`}>
                                        <Bus className="w-4 h-4 text-white" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-white font-black text-sm truncate">{pos.bus_number || pos.bus_id}</p>
                                        <div className="flex items-center gap-1 mt-0.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                            <span className="text-[9px] text-emerald-400 font-black uppercase tracking-widest">En Route</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-1.5 pl-11">
                                    {pos.driver_name && (
                                        <div className="flex items-center gap-2 text-white/40">
                                            <User className="w-3 h-3 shrink-0" />
                                            <span className="text-[11px] font-bold truncate">{pos.driver_name}</span>
                                        </div>
                                    )}
                                    {pos.route_name && (
                                        <div className="flex items-center gap-2 text-white/40">
                                            <MapPin className="w-3 h-3 shrink-0" />
                                            <span className="text-[11px] font-bold truncate">{pos.route_name}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 text-white/20">
                                        <Clock className="w-3 h-3 shrink-0" />
                                        <span className="text-[11px] font-bold">Updated {formatTime(pos.timestamp)}</span>
                                    </div>
                                </div>
                            </button>
                        );
                    })
                )}
            </div>

            {/* Map */}
            <div className="flex-1 rounded-2xl overflow-hidden border border-[#30363d]">
                <MapComponent
                    buses={positions}
                    selectedBusId={selectedBusId}
                />
            </div>
        </div>
    );
}
