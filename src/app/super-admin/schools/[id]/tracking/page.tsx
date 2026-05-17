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
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Live Buses</span>
                    <span className="ml-auto text-xs font-medium text-slate-400 dark:text-slate-500">{positions.length} active</span>
                </div>

                {loading ? (
                    <div className="flex justify-center py-16">
                        <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : error ? (
                    <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/30 rounded-xl border border-red-200 dark:border-red-800">
                        <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                        <p className="text-red-600 dark:text-red-400 text-xs font-medium">{error}</p>
                    </div>
                ) : positions.length === 0 ? (
                    <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-xs font-medium">
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
                                        ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700'
                                        : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800'
                                }`}
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-blue-500' : 'bg-slate-100 dark:bg-slate-700'}`}>
                                        <Bus className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-slate-900 dark:text-white font-semibold text-sm truncate">{pos.bus_number || pos.bus_id}</p>
                                        <div className="flex items-center gap-1 mt-0.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">En Route</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-1.5 pl-11">
                                    {pos.driver_name && (
                                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                            <User className="w-3 h-3 shrink-0" />
                                            <span className="text-xs font-medium truncate">{pos.driver_name}</span>
                                        </div>
                                    )}
                                    {pos.route_name && (
                                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                            <MapPin className="w-3 h-3 shrink-0" />
                                            <span className="text-xs font-medium truncate">{pos.route_name}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                                        <Clock className="w-3 h-3 shrink-0" />
                                        <span className="text-xs">Updated {formatTime(pos.timestamp)}</span>
                                    </div>
                                </div>
                            </button>
                        );
                    })
                )}
            </div>

            {/* Map */}
            <div className="flex-1 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700 shadow-sm">
                <MapComponent
                    buses={positions}
                    selectedBusId={selectedBusId}
                />
            </div>
        </div>
    );
}
