'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Bus, Clock, User, MapPin, Loader2, AlertCircle, Users, X, UserPlus, Check, WifiOff } from 'lucide-react';
import { isLocationFresh } from '@/lib/tracking';
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

interface ActiveTrip {
    id: string;
    bus_id: string;
    route_id: string;
    bus_number?: string;
    route_name?: string;
    driver_name?: string;
    status: string;
    route?: {
        name: string;
        stops?: StopFromTrip[];
        students?: StudentFromTrip[];
    };
    bus?: { bus_number: string };
    driver?: { user?: { name: string } };
}

interface BusPosition {
    bus_id: string;
    bus_number: string;
    latitude: number;
    longitude: number;
    timestamp: string;
    driver_name?: string;
    route_name?: string;
    color?: string;
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

export default function SchoolTrackingPage() {
    const { id } = useParams<{ id: string }>();

    const [trips, setTrips] = useState<ActiveTrip[]>([]);
    const [positions, setPositions] = useState<BusPosition[]>([]);
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

    const tripsRef = useRef<ActiveTrip[]>([]);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchTrips = useCallback(async () => {
        try {
            const res = await api.get(`/trips/active?school_id=${id}`);
            const list: ActiveTrip[] = Array.isArray(res.data) ? res.data : [];
            tripsRef.current = list;
            setTrips(list);
        } catch {
            // non-fatal
        }
    }, [id]);

    const fetchPositions = useCallback(async () => {
        try {
            const res = await api.get(`/location/active?school_id=${id}`);
            const raw: any[] = Array.isArray(res.data) ? res.data : [];
            const mapped: BusPosition[] = raw.map(item => {
                const busId = item.bus_id || item.busId || item.location?.bus_id;
                const lat = item.location?.latitude ?? item.latitude;
                const lng = item.location?.longitude ?? item.longitude;
                const ts = item.location?.timestamp || item.timestamp || '';
                const trip = tripsRef.current.find(t => t.bus_id === busId);
                return {
                    bus_id: busId,
                    bus_number: item.bus_number || trip?.bus?.bus_number || trip?.bus_number || busId,
                    latitude: lat,
                    longitude: lng,
                    timestamp: ts,
                    driver_name: item.driver_name || trip?.driver?.user?.name || trip?.driver_name,
                    route_name: item.route_name || trip?.route?.name || trip?.route_name,
                    color: item.school_color || undefined,
                };
            // filter out null AND zero (invalid 0,0 GPS) positions
            }).filter(p => p.bus_id && p.latitude && p.longitude && (p.latitude !== 0 || p.longitude !== 0));
            setPositions(mapped);
            setError('');
        } catch {
            setError('Unable to fetch live positions.');
        }
    }, [id]);

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await fetchTrips();
            await fetchPositions();
            setLoading(false);
        };
        init();
    }, [fetchTrips, fetchPositions]);

    useEffect(() => {
        intervalRef.current = setInterval(async () => {
            await fetchTrips();
            await fetchPositions();
        }, 3000);
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [fetchTrips, fetchPositions]);

    // Always show stops from all active trips
    useEffect(() => {
        const seen = new Set<string>();
        const pins: StopPin[] = trips.flatMap(trip =>
            (trip.route?.stops || [])
                .filter(s => {
                    if (seen.has(s.id) || !s.latitude || !s.longitude) return false;
                    seen.add(s.id);
                    return true;
                })
                .map(s => ({
                    id: s.id,
                    name: s.name,
                    lat: s.latitude,
                    lng: s.longitude,
                    sequence: s.sequence,
                    student_count: trip.route?.students?.filter(st => st.stop_id === s.id).length ?? 0,
                }))
        );
        setRouteStops(pins);
    }, [trips]);

    // Fetch all stops directly so pins show even when no trips are running
    useEffect(() => {
        api.get(`/stops?school_id=${id}`).then(res => {
            const all: any[] = Array.isArray(res.data) ? res.data : [];
            setRouteStops(prev => {
                const seen = new Set(prev.map(p => p.id));
                const extra: StopPin[] = all
                    .filter((s: any) => !seen.has(s.id) && s.latitude && s.longitude)
                    .map((s: any) => ({
                        id: s.id, name: s.name,
                        lat: parseFloat(s.latitude), lng: parseFloat(s.longitude),
                        sequence: s.sequence ?? 0, student_count: 0,
                    }));
                return extra.length ? [...prev, ...extra] : prev;
            });
        }).catch(() => {});
    }, [id]);

    const handleStopClick = useCallback((stopId: string, stopName: string) => {
        const trip = trips.find(t => t.bus_id === selectedBusId) ||
                     trips.find(t => t.route?.stops?.some(s => s.id === stopId));
        const students = trip?.route?.students?.filter(s => s.stop_id === stopId) ?? [];
        setSelectedStop({ id: stopId, name: stopName, students });
        setAssignStudentId('');
        setAssignSuccess(false);

        if (!studentsLoaded) {
            api.get(`/students?school_id=${id}`).then(res => {
                setAllStudents(res.data || []);
                setStudentsLoaded(true);
            }).catch(() => {});
        }
    }, [trips, selectedBusId, studentsLoaded, id]);

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

    // Update stop panel students after trips refresh
    useEffect(() => {
        if (!selectedStop) return;
        const trip = trips.find(t => t.bus_id === selectedBusId);
        const students = trip?.route?.students?.filter(s => s.stop_id === selectedStop.id) ?? [];
        setSelectedStop(prev => prev ? { ...prev, students } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [trips]);

    const formatTime = (ts: string) => {
        if (!ts) return '—';
        try { return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }); }
        catch { return '—'; }
    };

    const assignableStudents = allStudents.filter(
        s => !selectedStop?.students.some(ss => ss.id === s.id)
    );

    // Tint the stop pins with this school's brand colour (carried on the live buses).
    const schoolColor = positions.find(p => p.color)?.color;
    const coloredStops = schoolColor
        ? routeStops.map(s => ({ ...s, color: (s as { color?: string }).color || schoolColor }))
        : routeStops;

    return (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-120px)] gap-4 lg:overflow-hidden">
            {/* Left panel */}
            <div className="w-full lg:w-72 lg:shrink-0 flex flex-col gap-3 overflow-y-auto pr-1 max-h-[38vh] lg:max-h-none">
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
                                            {isLocationFresh(pos.timestamp) ? (
                                                <>
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">En Route</span>
                                                </>
                                            ) : (
                                                <>
                                                    <WifiOff className="w-3 h-3 text-slate-400" />
                                                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Offline</span>
                                                </>
                                            )}
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
                                        <span className="text-xs">{isLocationFresh(pos.timestamp) ? 'Updated' : 'Last seen'} {formatTime(pos.timestamp)}</span>
                                    </div>
                                </div>
                            </button>
                        );
                    })
                )}
            </div>

            {/* Map */}
            <div className="flex-1 min-h-[320px] rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700 shadow-sm">
                <MapComponent
                    buses={positions.map(p => ({ ...p, isOnline: isLocationFresh(p.timestamp) }))}
                    center={positions.length > 0 ? [positions[0].latitude, positions[0].longitude] : undefined}
                    selectedBusId={selectedBusId}
                    stops={coloredStops}
                    onStopClick={handleStopClick}
                />
            </div>

            {/* Stop panel */}
            {selectedStop && (
                <div className="w-full lg:w-80 lg:shrink-0 flex flex-col bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
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
                            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-colors shrink-0"
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
    );
}
