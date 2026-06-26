'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useRef } from 'react';
import { Check, X, Search, ChevronDown, LogOut, MapPin, Sun, Moon, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from 'next-themes';
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
    const { user, logout } = useAuth();
    const { theme, setTheme } = useTheme();
    const t = useT();
    const [stops, setStops] = useState<TripStop[]>([]);
    const [loading, setLoading] = useState(true);
    const [tripId, setTripId] = useState<string>('');
    const [hasActiveTrip, setHasActiveTrip] = useState<boolean | null>(null);
    const [isEvening, setIsEvening] = useState(false);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
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

    const handleMark = async (student: Student, status: 'present' | 'absent') => {
        setMarking(student.id);
        try {
            await api.post('/attendance/mark', {
                student_id: student.id,
                status,
                trip_id: tripId || undefined,
                attendance_type: isEvening ? 'dropoff' : 'pickup',
            });
            setAttendance(prev => ({ ...prev, [student.id]: status }));
        } finally {
            setMarking(null);
        }
    };

    const isStopComplete = (stop: TripStop) =>
        stop.students.length > 0 && stop.students.every(s => attendance[s.id]);

    const completedCount = stops.filter(isStopComplete).length;
    const selectedStop = stops.find(s => s.id === selectedStopId);
    const allStudents = stops.flatMap(s => s.students);

    const displayedStudents = searchQuery
        ? allStudents.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : selectedStop?.students || [];

    const drawerOpen = Boolean(selectedStopId || searchQuery);

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

    return (
        <div className="relative h-full overflow-hidden bg-slate-100">

            {/* ── Header ── */}
            <div className="absolute top-0 left-0 right-0 z-[400] bg-[var(--brand)] text-white px-5 pt-10 pb-4 shadow-lg">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-lg font-bold leading-tight">{t('Attendance', 'வருகை பதிவு')}</h1>
                        <p className="text-white/75 text-xs mt-0.5">
                            {stops.length > 0
                                ? `${completedCount}/${stops.length} ${t('stops done', 'நிறுத்தங்கள் முடிந்தன')}`
                                : t('No active trip', 'செயல்பாட்டில் பயணம் இல்லை')}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            className="p-1.5 text-white/70 hover:text-white border border-white/30 rounded-lg transition-colors"
                            title={t('Toggle theme', 'தீம் மாற்று')}
                        >
                            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                        </button>
                        <button
                            onClick={logout}
                            className="flex items-center gap-1.5 text-white/70 text-xs hover:text-white px-3 py-1.5 border border-white/30 rounded-lg transition-colors"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                            {t('Logout', 'வெளியேறு')}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Map ── */}
            <div className="absolute left-0 right-0 bottom-0 z-0 top-[76px]">
                {stops.length > 0 ? (
                    <FreeMap
                        center={mapCenter}
                        zoom={14}
                        markers={markers}
                        onStopClick={(id) => {
                            setSelectedStopId(id);
                            setSearchQuery('');
                        }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <div className="bg-white rounded-2xl p-8 text-center mx-6 shadow-sm border border-slate-100">
                            <MapPin className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                            <p className="font-semibold text-slate-700">{t('No active trip', 'செயல்பாட்டில் பயணம் இல்லை')}</p>
                            <p className="text-sm text-slate-400 mt-1">{t('Waiting for trip to begin', 'பயணம் தொடங்குவதற்காக காத்திருக்கிறோம்')}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Floating search bar ── */}
            {stops.length > 0 && (
                <div
                    className="absolute left-4 right-4 z-[400] transition-all duration-300"
                    style={{ bottom: drawerOpen ? 'calc(58vh + 8px)' : '20px' }}
                >
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder={t('Search all students…', 'அனைத்து மாணவர்களையும் தேடு…')}
                            value={searchQuery}
                            onChange={e => {
                                setSearchQuery(e.target.value);
                                if (e.target.value) setSelectedStopId(null);
                            }}
                            className="w-full bg-white shadow-lg border border-slate-100 rounded-2xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:border-[var(--brand)] text-slate-900 transition-all"
                        />
                    </div>
                </div>
            )}

            {/* ── Bottom drawer ── */}
            <div
                className={cn(
                    'absolute bottom-0 left-0 right-0 z-[300] bg-white rounded-t-3xl shadow-2xl transition-transform duration-300',
                    drawerOpen ? 'translate-y-0' : 'translate-y-full'
                )}
                style={{ height: '58vh' }}
            >
                {/* Drawer header */}
                <div className="pt-3 pb-2 px-5 border-b border-slate-100">
                    <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-3" />
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="font-bold text-slate-900 text-base">
                                {searchQuery
                                    ? `${t('Results for', 'தேடல் முடிவுகள்')} "${searchQuery}"`
                                    : selectedStop?.name || ''}
                            </h2>
                            <p className="text-xs text-slate-400 mt-0.5">
                                {displayedStudents.length} {t('student', 'மாணவர்')}{displayedStudents.length !== 1 ? 's' : ''}
                                {!searchQuery && selectedStop &&
                                    ` · ${t('Stop', 'நிறுத்தம்')} ${stops.findIndex(s => s.id === selectedStopId) + 1} ${t('of', 'இல்')} ${stops.length}`}
                            </p>
                        </div>
                        <button
                            onClick={() => { setSelectedStopId(null); setSearchQuery(''); }}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                        >
                            <ChevronDown className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Student list */}
                <div className="overflow-y-auto px-4 py-3 space-y-2" style={{ height: 'calc(58vh - 82px)' }}>
                    {displayedStudents.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 text-sm">
                            {searchQuery
                                ? t('No students match your search', 'தேடலில் மாணவர்கள் இல்லை')
                                : t('No students at this stop', 'இந்த நிறுத்தத்தில் மாணவர்கள் இல்லை')}
                        </div>
                    ) : (
                        displayedStudents.map(student => {
                            const marked = attendance[student.id];
                            const isMarkingThis = marking === student.id;

                            return (
                                <div
                                    key={student.id}
                                    className={cn(
                                        'flex items-center gap-3 p-3 rounded-2xl border transition-all',
                                        marked === 'present' ? 'bg-emerald-50 border-emerald-200' :
                                        marked === 'absent'  ? 'bg-red-50 border-red-200' :
                                        'bg-slate-50 border-slate-100'
                                    )}
                                >
                                    {/* Avatar */}
                                    <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                                        {student.photo_url ? (
                                            <img src={student.photo_url} alt={student.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-sm font-bold text-slate-500">
                                                {student.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                            </span>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-slate-900 text-sm truncate">{student.name}</p>
                                        <p className="text-xs text-slate-400">{student.grade || t('Student', 'மாணவர்')}</p>
                                    </div>

                                    {/* Action */}
                                    {marked ? (
                                        <span className={cn(
                                            'text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1',
                                            marked === 'present'
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-red-100 text-red-700'
                                        )}>
                                            {marked === 'present' ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                            {marked === 'present'
                                                ? (isEvening ? t('Dropped', 'இறங்கினர்') : t('Present', 'வந்தனர்'))
                                                : t('Absent', 'வரவில்லை')}
                                        </span>
                                    ) : (
                                        <div className="flex gap-2">
                                            <button
                                                disabled={isMarkingThis}
                                                onClick={() => handleMark(student, 'absent')}
                                                className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200 transition-all active:scale-95 disabled:opacity-40"
                                                aria-label={t('Mark absent', 'வரவில்லை என குறிக்கவும்')}
                                            >
                                                {isMarkingThis ? (
                                                    <div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <X className="w-4 h-4" />
                                                )}
                                            </button>
                                            <button
                                                disabled={isMarkingThis}
                                                onClick={() => handleMark(student, 'present')}
                                                className="px-2.5 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center gap-1 text-xs font-semibold hover:bg-emerald-200 transition-all active:scale-95 disabled:opacity-40"
                                                aria-label={isEvening ? t('Mark dropped', 'இறங்கியதாக குறிக்கவும்') : t('Mark present', 'வந்ததாக குறிக்கவும்')}
                                            >
                                                {isMarkingThis ? (
                                                    <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <><Check className="w-3.5 h-3.5" />{isEvening ? t('Dropped', 'இறங்கினர்') : t('Present', 'வந்தனர்')}</>
                                                )}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
