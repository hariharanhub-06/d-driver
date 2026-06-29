'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useRef } from 'react';
import { Check, X, Search, MapPin, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useT } from '@/lib/i18n';

const FreeMap = dynamic(() => import('@/components/ui/FreeMap'), { ssr: false });

const SOUTH_INDIA_CENTER: [number, number] = [11.1271, 78.6569];

interface Student {
    id: string;
    name: string;
    photo_url?: string;
    grade?: string;
    stop_id?: string;
}

interface TripStop {
    id: string;
    name: string;
    sequence: number;
    latitude?: number;
    longitude?: number;
    students: Student[];
    isUnassigned?: boolean;
}

export default function BusStaffAttendancePage() {
    const { user } = useAuth();
    const t = useT();
    const [stops, setStops] = useState<TripStop[]>([]);
    const [loading, setLoading] = useState(true);
    const [tripId, setTripId] = useState<string>('');
    const [hasActiveTrip, setHasActiveTrip] = useState<boolean | null>(null);
    const [isEvening, setIsEvening] = useState(false);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
    // Keyed by `${studentId}|${phase}` where phase is 'pickup' | 'dropoff'. Morning trips only
    // use 'pickup'; evening trips use both ('pickup' = boarded at school, 'dropoff' = alighted
    // at the child's stop).
    const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent'>>({});
    const [marking, setMarking] = useState<string | null>(null);
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [mapCenter, setMapCenter] = useState<[number, number]>(SOUTH_INDIA_CENTER);

    useEffect(() => {
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                pos => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
                () => {}
            );
        }
        fetchData();
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, []);

    // Live trip sync: join the school room and react to driver start/stop instantly.
    useEffect(() => {
        if (!user?.school_id) return;
        const socket = getSocket();
        const joinRoom = () => socket.emit('join-school-room', user.school_id);
        joinRoom();
        socket.on('connect', joinRoom);
        const onStarted = () => { fetchData(); };
        const onCompleted = () => {
            if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
            setHasActiveTrip(false);
            setTripId('');
            setStops([]);
        };
        socket.on('trip-started', onStarted);
        socket.on('trip-completed', onCompleted);
        return () => {
            socket.off('connect', joinRoom);
            socket.off('trip-started', onStarted);
            socket.off('trip-completed', onCompleted);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.school_id]);

    const fetchData = async () => {
        try {
            const tripsRes = await api.get('/trips/active');
            const trips = Array.isArray(tripsRes.data) ? tripsRes.data : [];
            const trip = trips[0];

            if (!trip) {
                setHasActiveTrip(false);
                if (!pollRef.current) {
                    pollRef.current = setInterval(async () => {
                        try {
                            const r = await api.get('/trips/active');
                            const t = (Array.isArray(r.data) ? r.data : [])[0];
                            if (t) { clearInterval(pollRef.current!); pollRef.current = null; fetchData(); }
                        } catch { /* keep polling */ }
                    }, 30000);
                }
                return;
            }
            setHasActiveTrip(true);
            if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
            const tripType = trip.route?.route_type || trip.route_type || '';
            setIsEvening(tripType === 'afternoon' || tripType === 'evening');

            setTripId(trip.id);
            const route = trip.route || {};
            const routeStudents: Student[] = route.students || [];

            let enrichedStops: TripStop[] = (route.stops || []).map((stop: any) => ({
                ...stop,
                students: stop.students?.length > 0
                    ? stop.students
                    : routeStudents.filter((s: any) => s.stop_id === stop.id),
            }));

            const totalAssigned = enrichedStops.reduce((n, s) => n + s.students.length, 0);
            const unassigned: Student[] = (route.unassignedStudents || routeStudents.filter((s: any) => !s.stop_id));
            if (totalAssigned === 0 && unassigned.length > 0) {
                enrichedStops = [
                    ...enrichedStops,
                    {
                        id: '__unassigned__',
                        name: t('Unassigned Students', 'ஒதுக்கப்படாத மாணவர்கள்'),
                        sequence: 999,
                        isUnassigned: true,
                        students: unassigned,
                    },
                ];
            }

            setStops(enrichedStops);

            const firstWithCoords = enrichedStops.find(s => s.latitude && s.longitude);
            if (firstWithCoords?.latitude && firstWithCoords?.longitude) {
                setMapCenter([firstWithCoords.latitude, firstWithCoords.longitude]);
            }
        } catch {
            // silent — map still shows
        } finally {
            setLoading(false);
        }
    };

    const markOf = (studentId: string, phase: 'pickup' | 'dropoff') => attendance[`${studentId}|${phase}`];

    // A student is "done" when, morning: pickup is marked; evening: BOTH picked up and dropped.
    const studentDone = (s: Student) =>
        isEvening ? !!markOf(s.id, 'pickup') && !!markOf(s.id, 'dropoff') : !!markOf(s.id, 'pickup');

    const handleMark = async (student: Student, status: 'present' | 'absent', phase: 'pickup' | 'dropoff') => {
        const key = `${student.id}|${phase}`;
        setMarking(key);
        try {
            await api.post('/attendance/mark', {
                student_id: student.id,
                status,
                trip_id: tripId || undefined,
                attendance_type: phase,
            });
            setAttendance(prev => ({ ...prev, [key]: status }));
        } finally {
            setMarking(null);
        }
    };

    const isStopComplete = (stop: TripStop) =>
        stop.students.length > 0 && stop.students.every(studentDone);

    const completedCount = stops.filter(isStopComplete).length;

    // Tapping a stop on the map scrolls to (and highlights) that stop's section in the list.
    const focusStop = (id: string) => {
        setSelectedStopId(id);
        setSearchQuery('');
        const el = document.getElementById(`stop-${id}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const markers = [
        ...stops
            .filter(s => s.latitude && s.longitude)
            .map((stop, i) => ({
                id: stop.id,
                position: [stop.latitude!, stop.longitude!] as [number, number],
                title: stop.name,
                stopNumber: i + 1,
                isMyStop: stop.id === selectedStopId,
                isComplete: isStopComplete(stop),
            })),
        ...(userLocation ? [{ position: userLocation, title: t('You', 'நீங்கள்'), isUserLocation: true as const }] : []),
    ];

    const q = searchQuery.trim().toLowerCase();

    if (loading) return (
        <div className="h-full min-h-[60vh] bg-slate-50 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
        </div>
    );

    if (hasActiveTrip === false) return (
        <div className="h-full min-h-[60vh] bg-white dark:bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <Lock className="w-9 h-9 text-slate-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t('Trip Not Started', 'பயணம் தொடங்கவில்லை')}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">{t('Attendance is locked until the driver starts the trip. This page checks automatically every 30 seconds.', 'ஓட்டுநர் பயணத்தை தொடங்கும் வரை வருகை பதிவு பூட்டப்பட்டுள்ளது. இந்த பக்கம் 30 வினாடிகளுக்கு ஒரு முறை தானாக சரிபார்க்கிறது.')}</p>
            <div className="mt-6 flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {t('Waiting for trip…', 'பயணத்திற்காக காத்திருக்கிறோம்…')}
            </div>
        </div>
    );

    // One phase's control: shows a coloured badge once marked, or Absent / Present(Picked/Dropped)
    // buttons while unmarked. `presentLabel` is the green-button wording for this phase.
    const renderPhase = (student: Student, phase: 'pickup' | 'dropoff', presentLabel: string) => {
        const marked = markOf(student.id, phase);
        const key = `${student.id}|${phase}`;
        const isMarkingThis = marking === key;
        if (marked) {
            return (
                <span className={cn(
                    'text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0',
                    marked === 'present' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                )}>
                    {marked === 'present' ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    {marked === 'present' ? presentLabel : t('Absent', 'வரவில்லை')}
                </span>
            );
        }
        return (
            <div className="flex gap-2 shrink-0">
                <button
                    disabled={isMarkingThis}
                    onClick={() => handleMark(student, 'absent', phase)}
                    className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200 transition-all active:scale-95 disabled:opacity-40"
                    aria-label={t('Mark absent', 'வரவில்லை என குறிக்கவும்')}
                >
                    {isMarkingThis ? <div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" /> : <X className="w-4 h-4" />}
                </button>
                <button
                    disabled={isMarkingThis}
                    onClick={() => handleMark(student, 'present', phase)}
                    className="px-2.5 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center gap-1 text-xs font-semibold hover:bg-emerald-200 transition-all active:scale-95 disabled:opacity-40"
                >
                    {isMarkingThis ? <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" /> : <><Check className="w-3.5 h-3.5" />{presentLabel}</>}
                </button>
            </div>
        );
    };

    const renderStudent = (student: Student) => {
        const done = studentDone(student);
        const anyAbsent = markOf(student.id, 'pickup') === 'absent' || markOf(student.id, 'dropoff') === 'absent';
        return (
            <div
                key={student.id}
                className={cn(
                    'p-3 rounded-2xl border transition-all',
                    anyAbsent ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' :
                    done      ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' :
                    'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'
                )}
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                        {student.photo_url ? (
                            <img src={student.photo_url} alt={student.name} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-sm font-bold text-slate-500 dark:text-slate-300">
                                {student.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </span>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">{student.name}</p>
                        <p className="text-xs text-slate-400">{student.grade || t('Student', 'மாணவர்')}</p>
                    </div>
                    {/* Morning: single Present control inline. */}
                    {!isEvening && renderPhase(student, 'pickup', t('Present', 'வந்தனர்'))}
                </div>

                {/* Evening: two labelled phases — Picked up (at school) then Dropped (at stop). */}
                {isEvening && (
                    <div className="mt-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t('Picked up', 'ஏற்றப்பட்டது')}</span>
                            {renderPhase(student, 'pickup', t('Picked up', 'ஏற்றப்பட்டது'))}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t('Dropped', 'இறக்கப்பட்டது')}</span>
                            {renderPhase(student, 'dropoff', t('Dropped', 'இறக்கப்பட்டது'))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-full bg-slate-50 dark:bg-slate-900">

            {/* ── Sticky header: title + map + search stay pinned; only the list scrolls ── */}
            <div className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-900 pb-2 shadow-sm">
                <div className="px-4 pt-3 pb-2 flex items-center justify-between">
                    <div>
                        <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{t('Attendance', 'வருகை பதிவு')}</h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {`${completedCount}/${stops.length} ${t('stops done', 'நிறுத்தங்கள் முடிந்தன')}`}
                        </p>
                    </div>
                </div>

                {/* Map (embedded, stays fixed) */}
                <div className="px-4">
                    <div className="h-44 sm:h-52 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 relative">
                        <FreeMap center={mapCenter} zoom={14} markers={markers} onStopClick={focusStop} />
                    </div>
                </div>

                {/* Search */}
                <div className="px-4 pt-3">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder={t('Search students…', 'மாணவர்களைத் தேடு…')}
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 rounded-2xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:border-[var(--brand)] text-slate-900 dark:text-white transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* ── Stops with their students (the only scrolling part) ── */}
            <div className="px-4 pb-6 pt-3 space-y-4">
                {stops.map((stop, i) => {
                    const list = q ? stop.students.filter(s => s.name.toLowerCase().includes(q)) : stop.students;
                    if (q && list.length === 0) return null;
                    const markedCount = stop.students.filter(studentDone).length;
                    const complete = isStopComplete(stop);
                    return (
                        <section
                            id={`stop-${stop.id}`}
                            key={stop.id}
                            className={cn(
                                'rounded-2xl border bg-white dark:bg-slate-800 overflow-hidden scroll-mt-2',
                                selectedStopId === stop.id ? 'border-[var(--brand)] ring-2 ring-[var(--brand)]/30' : 'border-slate-200 dark:border-slate-700'
                            )}
                        >
                            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30">
                                <div className={cn(
                                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                                    complete ? 'bg-emerald-500 text-white' : 'bg-[var(--brand)] text-white'
                                )}>
                                    {stop.isUnassigned ? '?' : i + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-slate-900 dark:text-white text-sm truncate">{stop.name}</p>
                                    <p className="text-[11px] text-slate-400">{markedCount}/{stop.students.length} {t('marked', 'குறிக்கப்பட்டது')}</p>
                                </div>
                                {complete && (
                                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-full flex items-center gap-1">
                                        <Check className="w-3 h-3" /> {t('Done', 'முடிந்தது')}
                                    </span>
                                )}
                            </div>
                            <div className="p-3 space-y-2">
                                {list.length === 0
                                    ? <p className="text-center py-4 text-slate-400 text-sm">{t('No students at this stop', 'இந்த நிறுத்தத்தில் மாணவர்கள் இல்லை')}</p>
                                    : list.map(renderStudent)}
                            </div>
                        </section>
                    );
                })}

                {stops.length === 0 && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 text-center border border-slate-100 dark:border-slate-700">
                        <MapPin className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                        <p className="font-semibold text-slate-700 dark:text-slate-200">{t('No active trip', 'செயல்பாட்டில் பயணம் இல்லை')}</p>
                        <p className="text-sm text-slate-400 mt-1">{t('Waiting for trip to begin', 'பயணம் தொடங்குவதற்காக காத்திருக்கிறோம்')}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
