'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Bus, Navigation, Clock, MapPin, Users, X, UserPlus, Loader2, Check, WifiOff } from 'lucide-react';
import api from '@/lib/api';

const MapComponent = dynamic(() => import('@/components/MapComponent'), { ssr: false });

interface StopFromTrip {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    sequence: number;
}

interface StudentFromTrip {
    id: string;
    name: string;
    photo_url?: string | null;
    grade?: string | null;
    stop_id?: string | null;
}

interface Trip {
    id: string;
    bus_id: string;
    route_id: string;
    route?: {
        name: string;
        stops?: StopFromTrip[];
        students?: StudentFromTrip[];
    };
    bus?: { bus_number: string };
    driver?: { user?: { name: string } };
}

interface LocationEntry {
    bus_id: string;
    latitude: number;
    longitude: number;
    timestamp: string;
}

interface StopPin {
    id: string;
    name: string;
    lat: number;
    lng: number;
    sequence: number;
    student_count: number;
}

interface SelectedStop {
    id: string;
    name: string;
    students: StudentFromTrip[];
}

interface AllStudent {
    id: string;
    name: string;
    grade?: string | null;
    stop?: { id: string; name: string } | null;
}

function timeAgo(ts: string): string {
    const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
}

export default function TrackingPage() {
    const [trips, setTrips] = useState<Trip[]>([]);
    const [locations, setLocations] = useState<LocationEntry[]>([]);
    const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
    const [routeStops, setRouteStops] = useState<StopPin[]>([]);
    const [selectedStop, setSelectedStop] = useState<SelectedStop | null>(null);
    const [allStudents, setAllStudents] = useState<AllStudent[]>([]);
    const [studentsLoaded, setStudentsLoaded] = useState(false);
    const [assignStudentId, setAssignStudentId] = useState('');
    const [assignLoading, setAssignLoading] = useState(false);
    const [assignSuccess, setAssignSuccess] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const tripsRef = useRef<Trip[]>([]);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchTrips = useCallback(async () => {
        try {
            const { data } = await api.get('/trips/active');
            const list: Trip[] = data || [];
            tripsRef.current = list;
            setTrips(list);
        } catch {
            tripsRef.current = [];
        }
    }, []);

    const fetchLocations = useCallback(async () => {
        try {
            const { data } = await api.get('/location/active');
            const raw: any[] = data || [];
            const parsed: LocationEntry[] = raw.map(item => ({
                bus_id: item.bus_id || item.busId || item.location?.bus_id,
                latitude: item.latitude ?? item.location?.latitude,
                longitude: item.longitude ?? item.location?.longitude,
                timestamp: item.timestamp || item.location?.timestamp || '',
            })).filter(l => l.bus_id && l.latitude != null && l.longitude != null);
            setLocations(parsed);
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
        }, 3000);
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [fetchTrips, fetchLocations]);

    // Derive stops whenever selected bus or trips change
    useEffect(() => {
        if (!selectedBusId) {
            setRouteStops([]);
            setSelectedStop(null);
            return;
        }
        const trip = trips.find(t => t.bus_id === selectedBusId);
        if (trip?.route?.stops?.length) {
            setRouteStops(trip.route.stops.map(s => ({
                id: s.id,
                name: s.name,
                lat: s.latitude,
                lng: s.longitude,
                sequence: s.sequence,
                student_count: trip.route!.students?.filter(st => st.stop_id === s.id).length ?? 0,
            })));
        } else {
            setRouteStops([]);
        }
        setSelectedStop(null);
    }, [selectedBusId, trips]);

    const handleStopClick = useCallback((stopId: string, stopName: string) => {
        const trip = trips.find(t => t.bus_id === selectedBusId);
        const students = trip?.route?.students?.filter(s => s.stop_id === stopId) ?? [];
        setSelectedStop({ id: stopId, name: stopName, students });
        setAssignStudentId('');
        setAssignSuccess(false);

        if (!studentsLoaded) {
            api.get('/students').then(res => {
                setAllStudents(res.data || []);
                setStudentsLoaded(true);
            }).catch(() => {});
        }
    }, [trips, selectedBusId, studentsLoaded]);

    const handleAssignStudent = async () => {
        if (!assignStudentId || !selectedStop) return;
        const trip = trips.find(t => t.bus_id === selectedBusId);
        setAssignLoading(true);
        try {
            await api.put(`/students/${assignStudentId}`, {
                stop_id: selectedStop.id,
                route_id: trip?.route_id,
            });
            setAssignSuccess(true);
            setAssignStudentId('');
            await fetchTrips();
        } catch {
            // silent
        } finally {
            setAssignLoading(false);
        }
    };

    // Refresh stop students after trips reload
    useEffect(() => {
        if (!selectedStop) return;
        const trip = trips.find(t => t.bus_id === selectedBusId);
        const students = trip?.route?.students?.filter(s => s.stop_id === selectedStop.id) ?? [];
        setSelectedStop(prev => prev ? { ...prev, students } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [trips]);

    // Bus list = all active trips; GPS data merged by bus_id
    const busListItems = trips.map(trip => {
        const loc = locations.find(l => l.bus_id === trip.bus_id);
        return {
            bus_id: trip.bus_id,
            bus_number: trip.bus?.bus_number || trip.bus_id,
            driver_name: trip.driver?.user?.name || 'Unknown Driver',
            route_name: trip.route?.name || 'Unknown Route',
            hasGps: !!loc,
            latitude: loc?.latitude,
            longitude: loc?.longitude,
            timestamp: loc?.timestamp || '',
        };
    });

    // Only buses with GPS go on the map
    const mapBuses = busListItems
        .filter(b => b.hasGps)
        .map(b => ({
            bus_id: b.bus_id,
            bus_number: b.bus_number,
            latitude: b.latitude!,
            longitude: b.longitude!,
            timestamp: b.timestamp,
        }));

    const mapCenter: [number, number] | undefined = mapBuses.length > 0
        ? [mapBuses[0].latitude, mapBuses[0].longitude]
        : undefined;

    const assignableStudents = allStudents.filter(
        s => !selectedStop?.students.some(ss => ss.id === s.id)
    );

    const activeCount = busListItems.length;
    const gpsCount = mapBuses.length;

    return (
        <div className="space-y-6 animate-in">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Live Tracking</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Real-time GPS — click a stop pin to see students
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="inline-flex items-center bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full px-2.5 py-0.5 text-xs font-medium">
                        {activeCount} Trip{activeCount !== 1 ? 's' : ''} · {gpsCount} GPS
                    </span>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 border border-red-200 rounded-xl p-3 text-sm">{error}</div>
            )}

            <div className="flex h-[calc(100vh-200px)] gap-4">
                {/* Bus list — derived from trips, always shows active trips */}
                <div className="w-72 shrink-0 overflow-y-auto space-y-3 pr-1">
                    {loading ? (
                        <div className="flex justify-center py-16">
                            <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : busListItems.length === 0 ? (
                        <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">
                            <Bus className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p className="font-semibold">No Active Trips</p>
                            <p className="text-xs mt-1">Buses appear when trips are started</p>
                        </div>
                    ) : (
                        busListItems.map(bus => (
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
                                        <span className="font-bold text-sm text-slate-900 dark:text-white">{bus.bus_number}</span>
                                    </div>
                                    {bus.hasGps ? (
                                        <span className="inline-flex items-center bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full px-2.5 py-0.5 text-xs font-medium">Live</span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full px-2.5 py-0.5 text-xs font-medium">
                                            <WifiOff className="w-3 h-3" /> No GPS
                                        </span>
                                    )}
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
                                    {bus.hasGps && bus.timestamp && (
                                        <div className="flex items-center gap-1 text-xs text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                                            <Clock className="w-3 h-3" />
                                            {timeAgo(bus.timestamp)}
                                        </div>
                                    )}
                                </div>
                                {selectedBusId === bus.bus_id && routeStops.length > 0 && (
                                    <p className="text-xs text-[var(--brand)] mt-2 font-medium">
                                        {routeStops.length} stops — tap a pin on map
                                    </p>
                                )}
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
                        stops={routeStops}
                        onStopClick={handleStopClick}
                    />
                </div>

                {/* Stop panel */}
                {selectedStop && (
                    <div className="w-80 shrink-0 flex flex-col bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="w-7 h-7 bg-violet-100 dark:bg-violet-900/30 rounded-lg flex items-center justify-center shrink-0">
                                    <MapPin className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">{selectedStop.name}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{selectedStop.students.length} student{selectedStop.students.length !== 1 ? 's' : ''}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedStop(null)}
                                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors shrink-0"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {selectedStop.students.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 text-slate-400 dark:text-slate-500">
                                    <Users className="w-8 h-8 mb-2 opacity-30" />
                                    <p className="text-xs font-medium">No students at this stop</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {selectedStop.students.map(s => (
                                        <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                                            {s.photo_url ? (
                                                <img src={s.photo_url} alt={s.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                                        {s.name.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{s.name}</p>
                                                {s.grade && <p className="text-xs text-slate-400">Grade {s.grade}</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="border-t border-slate-100 dark:border-slate-700 p-4 space-y-3">
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                <UserPlus className="w-3.5 h-3.5" />
                                Assign Student to Stop
                            </div>
                            {!studentsLoaded ? (
                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    Loading students...
                                </div>
                            ) : (
                                <>
                                    <select
                                        value={assignStudentId}
                                        onChange={e => { setAssignStudentId(e.target.value); setAssignSuccess(false); }}
                                        className="w-full text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/40"
                                    >
                                        <option value="">Select a student...</option>
                                        {assignableStudents.map(s => (
                                            <option key={s.id} value={s.id}>
                                                {s.name}{s.grade ? ` (Gr ${s.grade})` : ''}{s.stop?.name ? ` · ${s.stop.name}` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={handleAssignStudent}
                                        disabled={!assignStudentId || assignLoading}
                                        className="w-full flex items-center justify-center gap-2 py-2 px-4 text-sm font-semibold bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {assignLoading ? (
                                            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Assigning...</>
                                        ) : assignSuccess ? (
                                            <><Check className="w-3.5 h-3.5" /> Assigned!</>
                                        ) : (
                                            'Assign to This Stop'
                                        )}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
