'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Bus, Navigation, Clock, MapPin } from 'lucide-react';
import api from '@/lib/api';

const MapComponent = dynamic(() => import('@/components/MapComponent'), { ssr: false });

interface Trip {
    bus_id: string;
    route_id: string;
    driver_id: string;
    route?: { name: string };
    bus?: { bus_number: string };
    driver?: { user?: { name: string } };
}

interface BusLocation {
    bus_id: string;
    latitude: number;
    longitude: number;
    speed?: number;
    timestamp: string;
}

interface ActiveBus {
    bus_id: string;
    bus_number: string;
    driver_name: string;
    route_name: string;
    speed: number;
    latitude: number;
    longitude: number;
    timestamp: string;
}

function timeAgo(ts: string): string {
    const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
}

export default function TrackingPage() {
    const [activeBuses, setActiveBuses] = useState<ActiveBus[]>([]);
    const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const tripsRef = useRef<Trip[]>([]);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchTrips = useCallback(async () => {
        try {
            const { data } = await api.get('/trips/active');
            tripsRef.current = data || [];
        } catch {
            tripsRef.current = [];
        }
    }, []);

    const fetchLocations = useCallback(async () => {
        try {
            const { data } = await api.get('/location/active');
            const locations: BusLocation[] = data || [];
            const merged: ActiveBus[] = locations
                .map((loc) => {
                    const trip = tripsRef.current.find(t => t.bus_id === loc.bus_id);
                    return {
                        bus_id: loc.bus_id,
                        bus_number: trip?.bus?.bus_number || loc.bus_id,
                        driver_name: trip?.driver?.user?.name || 'Unknown Driver',
                        route_name: trip?.route?.name || 'Unknown Route',
                        speed: loc.speed ?? 0,
                        latitude: loc.latitude,
                        longitude: loc.longitude,
                        timestamp: loc.timestamp,
                    };
                });
            setActiveBuses(merged);
            setError('');
        } catch {
            setError('Unable to fetch live positions. Retrying...');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const init = async () => {
            await fetchTrips();
            await fetchLocations();
        };
        init();

        intervalRef.current = setInterval(async () => {
            await fetchTrips();
            await fetchLocations();
        }, 5000);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [fetchTrips, fetchLocations]);

    const mapCenter: [number, number] | undefined =
        activeBuses.length > 0
            ? [activeBuses[0].latitude, activeBuses[0].longitude]
            : undefined;

    const mapBuses = activeBuses.map(b => ({
        bus_id: b.bus_id,
        bus_number: b.bus_number,
        latitude: b.latitude,
        longitude: b.longitude,
        timestamp: b.timestamp,
    }));

    return (
        <div className="animate-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Live Tracking</h1>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                        Real-time GPS positions of all active buses
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">
                        {activeBuses.length} Active
                    </span>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 border border-red-200 rounded-xl p-3 text-sm mb-4">
                    {error}
                </div>
            )}

            <div className="flex h-[calc(100vh-148px)] gap-4">
                {/* Bus List */}
                <div className="w-80 shrink-0 overflow-y-auto space-y-3 pr-1">
                    {loading ? (
                        <div className="flex items-center justify-center h-40">
                            <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : activeBuses.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-60 text-center">
                            <Bus className="w-12 h-12 text-gray-300 mb-3" />
                            <p className="text-sm font-semibold text-gray-500">No Active Buses</p>
                            <p className="text-xs text-gray-400 mt-1">Positions will appear when trips begin</p>
                        </div>
                    ) : (
                        activeBuses.map(bus => (
                            <button
                                key={bus.bus_id}
                                onClick={() => setSelectedBusId(bus.bus_id === selectedBusId ? null : bus.bus_id)}
                                className={`w-full text-left bg-white dark:bg-slate-900 rounded-2xl border p-4 shadow-sm hover:shadow-md transition-all ${
                                    selectedBusId === bus.bus_id
                                        ? 'border-blue-400 ring-2 ring-blue-100 dark:ring-blue-900'
                                        : 'border-gray-100 dark:border-slate-800'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                                            <Bus className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <span className="font-black text-sm text-gray-900 dark:text-white">
                                            {bus.bus_number}
                                        </span>
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">
                                        Live
                                    </span>
                                </div>

                                <div className="space-y-1.5 pl-1">
                                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                        <Navigation className="w-3 h-3 text-blue-400" />
                                        <span className="truncate">{bus.route_name}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                        <MapPin className="w-3 h-3 text-purple-400" />
                                        <span>{bus.driver_name}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] text-gray-400 mt-2 pt-2 border-t border-gray-50 dark:border-slate-800">
                                        <span className="font-bold text-blue-600">{bus.speed} km/h</span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-2.5 h-2.5" />
                                            {timeAgo(bus.timestamp)}
                                        </span>
                                    </div>
                                </div>
                            </button>
                        ))
                    )}
                </div>

                {/* Map */}
                <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 overflow-hidden shadow-sm">
                    <MapComponent
                        buses={mapBuses}
                        center={mapCenter}
                        selectedBusId={selectedBusId}
                    />
                </div>
            </div>
        </div>
    );
}
