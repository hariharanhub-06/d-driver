'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Bus, Navigation, Clock, MapPin, Users, X, UserPlus, Loader2, Check, Building2 } from 'lucide-react';
import api from '@/lib/api';
import { useT } from '@/lib/i18n';

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
    school_id?: string;
    route?: {
        name: string;
        stops?: StopFromTrip[];
        students?: StudentFromTrip[];
    };
    bus?: { bus_number: string };
    driver?: { user?: { name: string } };
}

interface ActiveBus {
    bus_id: string;
    bus_number: string;
    driver_name: string;
    route_name: string;
    school_name: string;
    school_color: string;
    latitude: number;
    longitude: number;
    heading?: number;
    timestamp: string;
}

interface StopPin {
    id: string;
    name: string;
    lat: number;
    lng: number;
    sequence: number;
    student_count: number;
    color?: string;
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

interface School {
    id: string;
    name: string;
    primary_color?: string;
}

function timeAgo(ts: string): string {
    const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
}

export default function SATrackingPage() {
    const t = useT();
    const [schools, setSchools] = useState<School[]>([]);
    const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
    const [activeBuses, setActiveBuses] = useState<ActiveBus[]>([]);
    const [trips, setTrips] = useState<Trip[]>([]);
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

    // Fetch available schools for the filter dropdown
    useEffect(() => {
        api.get('/schools').then(res => {
            const list: School[] = (res.data || []).map((s: any) => ({ id: s.id, name: s.name, primary_color: s.primary_color }));
            setSchools(list);
        }).catch(() => {});
    }, []);

    const fetchTrips = useCallback(async () => {
        try {
            const url = selectedSchoolId ? `/trips/active?school_id=${selectedSchoolId}` : '/trips/active';
            const { data } = await api.get(url);
            const list: Trip[] = data || [];
            tripsRef.current = list;
            setTrips(list);
        } catch {
            tripsRef.current = [];
        }
    }, [selectedSchoolId]);

    const fetchLocations = useCallback(async () => {
        try {
            const url = selectedSchoolId ? `/location/active?school_id=${selectedSchoolId}` : '/location/active';
            const { data } = await api.get(url);
            const raw: any[] = data || [];
            const merged: ActiveBus[] = raw.map(item => {
                // Enriched response: bus_number, route_name, driver_name, school_name, school_color
                // are now returned directly by the backend — no client-side trip join needed
                const busId = item.bus_id || item.busId;
                const lat = item.location?.latitude ?? item.latitude;
                const lng = item.location?.longitude ?? item.longitude;
                const ts = item.location?.timestamp || item.timestamp || '';
                const hdg = item.location?.heading ?? item.heading ?? undefined;
                return {
                    bus_id: busId,
                    bus_number: item.bus_number || busId,
                    driver_name: item.driver_name || 'Unknown Driver',
                    route_name: item.route_name || 'Unknown Route',
                    school_name: item.school_name || '',
                    school_color: item.school_color || '',
                    latitude: lat,
                    longitude: lng,
                    heading: hdg,
                    timestamp: ts,
                };
            }).filter(b => b.bus_id && b.latitude != null && b.longitude != null);
            setActiveBuses(merged);
            setError('');
        } catch {
            setError('Unable to fetch live positions. Retrying...');
        } finally {
            setLoading(false);
        }
    }, [selectedSchoolId]);

    useEffect(() => {
        setLoading(true);
        setActiveBuses([]);
        setSelectedBusId(null);
        setRouteStops([]);
        setSelectedStop(null);
        setStudentsLoaded(false);

        const init = async () => {
            await fetchTrips();
            await fetchLocations();
        };
        init();

        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(async () => {
            await fetchTrips();
            await fetchLocations();
        }, 3000);

        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [fetchTrips, fetchLocations]);

    // Show stops from active trips — filtered to selectedSchoolId when a school is chosen
    useEffect(() => {
        if (trips.length === 0) return; // don't clear fallback stops when no trips are active
        const seen = new Set<string>();
        const pins: StopPin[] = trips.flatMap(trip => {
            // Skip trips from other schools when a specific school is selected
            if (selectedSchoolId && trip.school_id !== selectedSchoolId) return [];
            const schoolColor = activeBuses.find(b => b.bus_id === trip.bus_id)?.school_color || undefined;
            return (trip.route?.stops || [])
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
                    color: schoolColor,
                }));
        });
        setRouteStops(prev => {
            const tripIds = new Set(pins.map(p => p.id));
            const fallbackOnly = prev.filter(p => !tripIds.has(p.id));
            return [...pins, ...fallbackOnly];
        });
    }, [trips, activeBuses, selectedSchoolId]);

    // Fetch all stops directly so pins always show even when no trips are running.
    // When selectedSchoolId changes, the init effect already cleared routeStops — we
    // replace with fresh data for the new school rather than merging with stale state.
    useEffect(() => {
        const url = selectedSchoolId ? `/stops?school_id=${selectedSchoolId}` : '/stops';
        api.get(url).then(res => {
            const all: any[] = Array.isArray(res.data) ? res.data : [];
            const fetched: StopPin[] = all
                .filter((s: any) => s.latitude && s.longitude)
                .map((s: any) => ({
                    id: s.id,
                    name: s.name,
                    lat: parseFloat(s.latitude),
                    lng: parseFloat(s.longitude),
                    sequence: s.sequence ?? 0,
                    student_count: 0,
                    color: s.school?.primary_color || undefined,
                }));
            // Merge: keep trip-derived stops (they carry student_count), add any not yet present
            setRouteStops(prev => {
                const seen = new Set(prev.map(p => p.id));
                const extra = fetched.filter(s => !seen.has(s.id));
                return extra.length ? [...prev, ...extra] : prev;
            });
        }).catch(() => {});
    }, [selectedSchoolId]);

    const handleStopClick = useCallback((stopId: string, stopName: string) => {
        // Find students from whichever trip serves this stop
        const trip = trips.find(t => t.bus_id === selectedBusId) ||
                     trips.find(t => t.route?.stops?.some(s => s.id === stopId));
        const students = trip?.route?.students?.filter(s => s.stop_id === stopId) ?? [];
        setSelectedStop({ id: stopId, name: stopName, students });
        setAssignStudentId('');
        setAssignSuccess(false);

        if (!studentsLoaded) {
            const schoolId = trip?.school_id || selectedSchoolId;
            const url = schoolId ? `/students?school_id=${schoolId}` : '/students';
            api.get(url).then(res => {
                setAllStudents(res.data || []);
                setStudentsLoaded(true);
            }).catch(() => {});
        }
    }, [trips, selectedBusId, studentsLoaded, selectedSchoolId]);

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

    const mapCenter: [number, number] | undefined =
        activeBuses.length > 0 ? [activeBuses[0].latitude, activeBuses[0].longitude] : undefined;

    const mapBuses = activeBuses.map(b => ({
        bus_id: b.bus_id,
        bus_number: b.bus_number,
        latitude: b.latitude,
        longitude: b.longitude,
        heading: b.heading,
        timestamp: b.timestamp,
        color: b.school_color || undefined,
    }));

    const assignableStudents = allStudents.filter(
        s => !selectedStop?.students.some(ss => ss.id === s.id)
    );

    return (
        <div className="space-y-4 animate-in">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('Live Tracking', 'நேரடி கண்காணிப்பு')}</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {t('Real-time bus tracking', 'நிகழ்நேர பேருந்து கண்காணிப்பு')} — select a bus then click a stop pin to manage students
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {schools.length > 0 && (
                        <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-slate-400" />
                            <select
                                value={selectedSchoolId}
                                onChange={e => { setSelectedSchoolId(e.target.value); setSelectedBusId(null); }}
                                className="text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/40"
                            >
                                <option value="">{t('All Schools', 'அனைத்து பள்ளிகள்')}</option>
                                {schools.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="inline-flex items-center bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full px-2.5 py-0.5 text-xs font-medium">
                            {activeBuses.length} {t('Active Trips', 'செயலில் உள்ள பயணங்கள்')}
                        </span>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 border border-red-200 rounded-xl p-3 text-sm">{error}</div>
            )}

            <div className="flex h-[calc(100vh-210px)] gap-4">
                {/* Bus list */}
                <div className="w-72 shrink-0 overflow-y-auto space-y-3 pr-1">
                    {loading ? (
                        <div className="flex justify-center py-16">
                            <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : activeBuses.length === 0 ? (
                        <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">
                            <Bus className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p className="font-semibold">{t('No active trips', 'செயலில் உள்ள பயணங்கள் இல்லை')}</p>
                            <p className="text-xs mt-1">Positions appear when trips begin</p>
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
                                        <span className="font-bold text-sm text-slate-900 dark:text-white">{bus.bus_number}</span>
                                    </div>
                                    <span className="inline-flex items-center bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full px-2.5 py-0.5 text-xs font-medium">{t('Running', 'இயக்கத்தில்')}</span>
                                </div>
                                <div className="space-y-1.5 pl-1">
                                    {bus.school_name && (
                                        <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: bus.school_color || '#6366F1' }}>
                                            <Building2 className="w-3 h-3 shrink-0" />
                                            <span className="truncate">{bus.school_name}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                        <Navigation className="w-3 h-3 text-blue-400" />
                                        <span className="truncate">{bus.route_name}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                        <MapPin className="w-3 h-3 text-purple-400" />
                                        <span>{bus.driver_name}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {timeAgo(bus.timestamp)}
                                        </span>
                                    </div>
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
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{selectedStop.students.length} {t('Students', 'மாணவர்கள்').toLowerCase()}{selectedStop.students.length !== 1 ? 's' : ''}</p>
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
                                    {t('Loading...', 'ஏற்றுகிறது...')}
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
