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
        <div className="space-y-6 animate-in">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Live Tracking</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Real-time GPS positions of all active buses
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="inline-flex items-center bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full px-2.5 py-0.5 text-xs font-medium">
                        {activeBuses.length} Active
                    </span>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 border border-red-200 rounded-xl p-3 text-sm">
                    {error}
                </div>
            )}

            <div className="flex h-[calc(100vh-200px)] gap-4">
                {/* Bus List */}
                <div className="w-80 shrink-0 overflow-y-auto space-y-3 pr-1">
                    {loading ? (
                        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin"></div></div>
                    ) : activeBuses.length === 0 ? (
                        <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">
                            <Bus className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p className="font-semibold">No Active Buses</p>
                            <p className="text-xs mt-1">Positions will appear when trips begin</p>
                        </div>
                    ) : (
                        activeBuses.map(bus => (
                            <button
                                key={bus.bus_id}
                                onClick={() => setSelectedBusId(bus.bus_id === selectedBusId ? null : bus.bus_id)}
                                className={`w-full text-left bg-white dark:bg-slate-800 rounded-2xl border p-4 shadow-sm hover:shadow-md transition-all ${
                                    selectedBusId === bus.bus_id
                                        ? 'border-[var(--brand)] ring-2 ring-[var(--brand)]/20'
                                        : 'border-slate-100 dark:border-slate-700'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
                                            <Bus className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                                            {bus.bus_number}
                                        </span>
                                    </div>
                                    <span className="inline-flex items-center bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full px-2.5 py-0.5 text-xs font-medium">
                                        Live
                                    </span>
                                </div>

                                <div className="space-y-1.5 pl-1">
                                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                        <Navigation className="w-3 h-3 text-blue-400" />
                                        <span className="truncate">{bus.route_name}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                        <MapPin className="w-3 h-3 text-purple-400" />
                                        <span>{bus.driver_name}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                                        <span className="font-bold text-[var(--brand)]">{bus.speed} km/h</span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {timeAgo(bus.timestamp)}
                                        </span>
                                    </div>
                                </div>
                            </button>
                        ))
                    )}
                </div>

                {/* Map */}
                <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
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
