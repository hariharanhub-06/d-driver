'use client';

import { useState, useEffect } from 'react';
import { User, Check, X, Search, MapPin, ChevronRight, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface Student {
    id: string;
    name: string;
    photo_url?: string;
    grade?: string;
    stop_id?: string;
}

interface AbsenceRecord {
    student_id: string;
    status: string;
}

interface TripStop {
    id: string;
    name: string;
    sequence: number;
    students: Student[];
}

export default function DriverAttendancePage() {
    const [stops, setStops] = useState<TripStop[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentStopIndex, setCurrentStopIndex] = useState(0);
    const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent'>>({});
    const [absences, setAbsences] = useState<AbsenceRecord[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [tripId, setTripId] = useState<string>('');
    const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
    const [markingNote, setMarkingNote] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Get active trip
            const tripsRes = await api.get('/trips/active');
            const trips = Array.isArray(tripsRes.data) ? tripsRes.data : [];
            const trip = trips[0];

            if (trip) {
                setTripId(trip.id);
                // Use students/stops already included in the active trip's route data
                const route = trip.route || {};
                const students = route.students || [];
                const enrichedStops: TripStop[] = (route.stops || []).map((stop: any) => ({
                    ...stop,
                    students: students.filter((s: any) => s.stop_id === stop.id),
                }));
                if (enrichedStops.length > 0) {
                    setStops(enrichedStops);
                } else {
                    // Fallback: fetch route separately (now includes students)
                    const routeRes = await api.get(`/routes/${trip.route_id}`);
                    const r = routeRes.data;
                    const s2 = r.students || [];
                    setStops((r.stops || []).map((stop: any) => ({
                        ...stop,
                        students: s2.filter((s: any) => s.stop_id === stop.id),
                    })));
                }
                setCurrentStopIndex(trip.current_stop_index ?? 0);
            }

            // Fetch pre-reported absences for today only
            try {
                const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local tz
                const routeParam = trip?.route_id ? `&route_id=${trip.route_id}` : '';
                const absRes = await api.get(`/absence?date=${today}${routeParam}`);
                const absData = absRes.data;
                setAbsences(Array.isArray(absData) ? absData : absData?.absences || []);
            } catch {
                setAbsences([]);
            }
        } catch (e: any) {
            setError('Failed to load route data');
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAttendance = async (student: Student, status: 'present' | 'absent') => {
        try {
            await api.post('/attendance/mark', {
                student_id: student.id,
                status,
                trip_id: tripId || undefined,
                note: markingNote || undefined,
            });
        } catch {
            // continue with local state even if API fails
        }
        setAttendance(prev => ({ ...prev, [student.id]: status }));
        setActiveStudentId(null);
        setMarkingNote('');
    };

    const isPreAbsent = (studentId: string) =>
        absences.some(a => a.student_id === studentId && a.status === 'absent');

    const currentStop = stops[currentStopIndex];
    const allStudents = stops.flatMap(s => s.students);
    const filteredStudents = searchQuery
        ? allStudents.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : currentStop?.students || [];

    const activeStudent = activeStudentId
        ? allStudents.find(s => s.id === activeStudentId)
        : null;

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-2xl p-6 text-center font-semibold">{error}</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
            {/* Header */}
            <div className="bg-[var(--brand)] text-white p-5 pt-8 shadow-md">
                <h1 className="text-xl font-bold">Attendance</h1>
                <p className="text-white/80 text-sm mt-1">
                    {currentStop ? `Stop ${currentStopIndex + 1}/${stops.length}: ${currentStop.name}` : 'No route data'}
                </p>
            </div>

            {/* Search */}
            <div className="px-4 pt-4 pb-2">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search student by name..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-2.5 pl-11 pr-4 text-sm focus:outline-none focus:border-[var(--brand)] dark:text-white transition-colors"
                    />
                </div>
            </div>

            {/* Stop tabs (when not searching) */}
            {!searchQuery && stops.length > 0 && (
                <div className="px-4 py-2 flex gap-2 overflow-x-auto">
                    {stops.map((stop, i) => (
                        <button
                            key={stop.id}
                            onClick={() => setCurrentStopIndex(i)}
                            className={cn(
                                'shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition-all',
                                i === currentStopIndex
                                    ? 'bg-[var(--brand)] text-white'
                                    : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                            )}
                        >
                            {stop.name}
                        </button>
                    ))}
                </div>
            )}

            {/* Current stop info */}
            {!searchQuery && currentStop && (
                <div className="mx-4 mt-3 bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-3">
                    <div className="p-2.5 bg-[var(--brand)]/10 rounded-xl">
                        <MapPin className="w-5 h-5 text-[var(--brand)]" />
                    </div>
                    <div>
                        <h2 className="font-bold text-slate-900 dark:text-white">{currentStop.name}</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{currentStop.students.length} students</p>
                    </div>
                </div>
            )}

            {/* Student List */}
            <div className="px-4 mt-4 space-y-3">
                {filteredStudents.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 dark:text-slate-400 text-sm">
                        {searchQuery ? 'No students match your search' : 'No students at this stop'}
                    </div>
                ) : (
                    filteredStudents.map(student => {
                        const marked = attendance[student.id];
                        const preAbsent = isPreAbsent(student.id);

                        return (
                            <div
                                key={student.id}
                                className={cn(
                                    'bg-white dark:bg-slate-800 rounded-2xl p-4 border shadow-sm flex items-center gap-4 transition-all',
                                    marked === 'present' ? 'border-emerald-200 dark:border-emerald-700' :
                                    marked === 'absent' ? 'border-red-200 dark:border-red-800' :
                                    preAbsent ? 'border-amber-200 dark:border-amber-700 opacity-75' :
                                    'border-slate-100 dark:border-slate-700'
                                )}
                            >
                                {/* Avatar */}
                                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                                    {student.photo_url ? (
                                        <img src={student.photo_url} alt={student.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-lg font-bold text-slate-400 dark:text-slate-500">
                                            {student.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                        </span>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-slate-900 dark:text-white truncate">{student.name}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{student.grade || 'Student'}</p>
                                </div>

                                {/* Status / Actions */}
                                {preAbsent && !marked ? (
                                    <span className="bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full px-2.5 py-0.5 text-xs font-medium">
                                        Absent
                                    </span>
                                ) : marked ? (
                                    <span className={cn(
                                        'rounded-full px-2.5 py-0.5 text-xs font-medium flex items-center gap-1',
                                        marked === 'present'
                                            ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                            : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                    )}>
                                        {marked === 'present' ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                        {marked}
                                    </span>
                                ) : (
                                    <button
                                        onClick={() => setActiveStudentId(student.id)}
                                        className="w-9 h-9 bg-[var(--brand)]/10 rounded-xl flex items-center justify-center hover:bg-[var(--brand)]/20 transition-all active:scale-95"
                                    >
                                        <ChevronRight className="w-4 h-4 text-[var(--brand)]" />
                                    </button>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Bottom nav */}
            <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 p-4 flex justify-around items-center">
                <a href="/driver/dashboard" className="flex flex-col items-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                    <Bell className="w-5 h-5" />
                    <span className="text-[10px] font-medium mt-1">Home</span>
                </a>
                <div className="flex flex-col items-center text-[var(--brand)]">
                    <User className="w-5 h-5" />
                    <span className="text-[10px] font-medium mt-1">Attendance</span>
                </div>
                <a href="/driver/ride" className="flex flex-col items-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                    <MapPin className="w-5 h-5" />
                    <span className="text-[10px] font-medium mt-1">Ride</span>
                </a>
            </div>

            {/* Mark attendance overlay */}
            {activeStudent && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Mark Attendance</h3>
                            <button onClick={() => { setActiveStudentId(null); setMarkingNote(''); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="bg-[var(--brand)] p-8 flex flex-col items-center">
                            <div className="w-20 h-20 rounded-full bg-white/20 border-4 border-white/40 flex items-center justify-center mb-4 overflow-hidden">
                                {activeStudent.photo_url ? (
                                    <img src={activeStudent.photo_url} alt={activeStudent.name} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-3xl font-bold text-white">
                                        {activeStudent.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                    </span>
                                )}
                            </div>
                            <h3 className="text-xl font-bold text-white text-center">{activeStudent.name}</h3>
                            <p className="text-white/70 text-sm mt-1">{activeStudent.grade || 'Student'}</p>
                        </div>

                        <div className="p-6">
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Note (optional)</label>
                                <input
                                    type="text"
                                    value={markingNote}
                                    onChange={e => setMarkingNote(e.target.value)}
                                    placeholder="Add a note..."
                                    className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => handleMarkAttendance(activeStudent, 'absent')}
                                    className="py-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl font-bold flex flex-col items-center gap-2 border border-red-100 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all active:scale-95"
                                >
                                    <X size={24} />
                                    Absent
                                </button>
                                <button
                                    onClick={() => handleMarkAttendance(activeStudent, 'present')}
                                    className="py-4 bg-[var(--brand)] text-white rounded-2xl font-bold flex flex-col items-center gap-2 hover:opacity-90 transition-all active:scale-95"
                                >
                                    <Check size={24} />
                                    Present
                                </button>
                            </div>
                            <button
                                onClick={() => { setActiveStudentId(null); setMarkingNote(''); }}
                                className="w-full mt-4 py-2.5 text-xs font-medium text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
