'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { Check, X, Search, ChevronDown, LogOut, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

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
}

export default function BusStaffAttendancePage() {
    const { user, logout } = useAuth();
    const [stops, setStops] = useState<TripStop[]>([]);
    const [loading, setLoading] = useState(true);
    const [tripId, setTripId] = useState<string>('');
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
    }, []);

    const fetchData = async () => {
        try {
            const tripsRes = await api.get('/trips/active');
            const trips = Array.isArray(tripsRes.data) ? tripsRes.data : [];
            const trip = trips[0];

            if (!trip) return;

            setTripId(trip.id);
            const route = trip.route || {};
            const students: Student[] = route.students || [];
            // Prefer students embedded per-stop (from getActiveTrips include);
            // fall back to filtering route.students by stop_id if not present.
            let enrichedStops: TripStop[] = (route.stops || []).map((stop: any) => ({
                ...stop,
                students: stop.students ?? students.filter((s: any) => s.stop_id === stop.id),
            }));

            if (enrichedStops.length === 0) {
                const routeRes = await api.get(`/routes/${trip.route_id}`);
                const r = routeRes.data;
                const s2: Student[] = r.students || [];
                enrichedStops = (r.stops || []).map((stop: any) => ({
                    ...stop,
                    students: stop.students ?? s2.filter((s: any) => s.stop_id === stop.id),
                }));
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
        ...(userLocation ? [{ position: userLocation, title: 'You', isUserLocation: true as const }] : []),
    ];

    if (loading) return (
        <div className="h-screen bg-slate-50 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="relative h-screen overflow-hidden bg-slate-100">

            {/* ── Header ── */}
            <div className="absolute top-0 left-0 right-0 z-[400] bg-[var(--brand)] text-white px-5 pt-10 pb-4 shadow-lg">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-lg font-bold leading-tight">Attendance</h1>
                        <p className="text-white/75 text-xs mt-0.5">
                            {stops.length > 0
                                ? `${completedCount}/${stops.length} stops done`
                                : 'No active trip'}
                        </p>
                    </div>
                    <button
                        onClick={logout}
                        className="flex items-center gap-1.5 text-white/70 text-xs hover:text-white px-3 py-1.5 border border-white/30 rounded-lg transition-colors"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        Logout
                    </button>
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
                            <p className="font-semibold text-slate-700">No active trip</p>
                            <p className="text-sm text-slate-400 mt-1">Waiting for trip to begin</p>
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
                            placeholder="Search all students…"
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
                                    ? `Results for "${searchQuery}"`
                                    : selectedStop?.name || ''}
                            </h2>
                            <p className="text-xs text-slate-400 mt-0.5">
                                {displayedStudents.length} student{displayedStudents.length !== 1 ? 's' : ''}
                                {!searchQuery && selectedStop &&
                                    ` · Stop ${stops.findIndex(s => s.id === selectedStopId) + 1} of ${stops.length}`}
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
                            {searchQuery ? 'No students match your search' : 'No students at this stop'}
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
                                        <p className="text-xs text-slate-400">{student.grade || 'Student'}</p>
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
                                            {marked}
                                        </span>
                                    ) : (
                                        <div className="flex gap-2">
                                            <button
                                                disabled={isMarkingThis}
                                                onClick={() => handleMark(student, 'absent')}
                                                className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200 transition-all active:scale-95 disabled:opacity-40"
                                                aria-label="Mark absent"
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
                                                className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center hover:bg-emerald-200 transition-all active:scale-95 disabled:opacity-40"
                                                aria-label="Mark present"
                                            >
                                                {isMarkingThis ? (
                                                    <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <Check className="w-4 h-4" />
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
