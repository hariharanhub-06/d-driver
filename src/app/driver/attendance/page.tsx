'use client';

import { useState, useEffect } from 'react';
import { User, Check, X, Search, MapPin, ChevronRight, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface Student {
    id: string;
    name: string;
    photo?: string;
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
            const trips = Array.isArray(tripsRes.data) ? tripsRes.data : tripsRes.data ? [tripsRes.data] : [];
            const trip = trips[0];

            if (trip) {
                setTripId(trip.id);
                const routeRes = await api.get(`/routes/${trip.route_id}`);
                const route = routeRes.data;
                const enrichedStops: TripStop[] = (route.stops || []).map((stop: any) => ({
                    ...stop,
                    students: (route.students || []).filter((s: any) => s.stop_id === stop.id),
                }));
                setStops(enrichedStops);
            } else {
                // Fallback to first route
                const routesRes = await api.get('/routes');
                if (routesRes.data?.length > 0) {
                    const route = routesRes.data[0];
                    const enrichedStops: TripStop[] = (route.stops || []).map((stop: any) => ({
                        ...stop,
                        students: (route.students || []).filter((s: any) => s.stop_id === stop.id),
                    }));
                    setStops(enrichedStops);
                }
            }

            // Fetch pre-reported absences
            try {
                const absRes = await api.get('/absence');
                setAbsences(Array.isArray(absRes.data) ? absRes.data : []);
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
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6">
                <div className="bg-red-50 border border-red-200 text-red-600 rounded-2xl p-6 text-center font-bold">{error}</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
            {/* Header */}
            <div className="bg-primary-600 text-white p-5 pt-8 shadow-md">
                <h1 className="text-xl font-black tracking-tight">Attendance</h1>
                <p className="text-primary-100 text-sm mt-1">
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
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-3 pl-11 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
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
                                'shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all',
                                i === currentStopIndex
                                    ? 'bg-primary-600 text-white'
                                    : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700'
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
                    <div className="p-2.5 bg-primary-50 dark:bg-primary-900/20 rounded-xl">
                        <MapPin className="w-5 h-5 text-primary-500" />
                    </div>
                    <div>
                        <h2 className="font-black text-slate-900 dark:text-white">{currentStop.name}</h2>
                        <p className="text-xs text-slate-400">{currentStop.students.length} students</p>
                    </div>
                </div>
            )}

            {/* Student List */}
            <div className="px-4 mt-4 space-y-3">
                {filteredStudents.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 font-bold text-sm">
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
                                    {student.photo ? (
                                        <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-lg font-black text-slate-400">
                                            {student.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                        </span>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="font-black text-slate-900 dark:text-white truncate">{student.name}</p>
                                    <p className="text-xs text-slate-400 font-medium">{student.grade || 'Student'}</p>
                                </div>

                                {/* Status / Actions */}
                                {preAbsent && !marked ? (
                                    <span className="px-3 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-xl text-[10px] font-black uppercase tracking-widest">
                                        Already Absent
                                    </span>
                                ) : marked ? (
                                    <span className={cn(
                                        'px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1',
                                        marked === 'present'
                                            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                                            : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                                    )}>
                                        {marked === 'present' ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                        {marked}
                                    </span>
                                ) : (
                                    <button
                                        onClick={() => setActiveStudentId(student.id)}
                                        className="w-9 h-9 bg-primary-50 dark:bg-primary-900/20 rounded-xl flex items-center justify-center hover:bg-primary-100 transition-all active:scale-95"
                                    >
                                        <ChevronRight className="w-4 h-4 text-primary-500" />
                                    </button>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Bottom nav */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border-t border-slate-100 dark:border-slate-700 p-4 flex justify-around items-center">
                <a href="/driver/dashboard" className="flex flex-col items-center text-slate-400 hover:text-slate-600 transition-colors">
                    <Bell className="w-5 h-5" />
                    <span className="text-[10px] font-bold mt-1">Home</span>
                </a>
                <div className="flex flex-col items-center text-primary-500">
                    <User className="w-5 h-5" />
                    <span className="text-[10px] font-bold mt-1">Attendance</span>
                </div>
                <a href="/driver/ride" className="flex flex-col items-center text-slate-400 hover:text-slate-600 transition-colors">
                    <MapPin className="w-5 h-5" />
                    <span className="text-[10px] font-bold mt-1">Ride</span>
                </a>
            </div>

            {/* Mark attendance overlay */}
            {activeStudent && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-[3rem] overflow-hidden shadow-2xl">
                        <div className="bg-gradient-to-br from-primary-500 to-emerald-600 p-10 flex flex-col items-center">
                            <div className="w-24 h-24 rounded-full bg-white/20 border-4 border-white/40 flex items-center justify-center mb-5 shadow-inner overflow-hidden">
                                {activeStudent.photo ? (
                                    <img src={activeStudent.photo} alt={activeStudent.name} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-4xl font-black text-white">
                                        {activeStudent.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                    </span>
                                )}
                            </div>
                            <h3 className="text-2xl font-black text-white text-center">{activeStudent.name}</h3>
                            <p className="text-white/70 text-sm mt-1">{activeStudent.grade || 'Student'}</p>
                        </div>

                        <div className="p-8">
                            <div className="mb-5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Note (optional)</label>
                                <input
                                    type="text"
                                    value={markingNote}
                                    onChange={e => setMarkingNote(e.target.value)}
                                    placeholder="Add a note..."
                                    className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm dark:text-white"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => handleMarkAttendance(activeStudent, 'absent')}
                                    className="py-5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-[1.5rem] font-black flex flex-col items-center gap-2 border border-red-100 dark:border-red-800 hover:bg-red-100 transition-all active:scale-95"
                                >
                                    <X size={26} />
                                    Absent
                                </button>
                                <button
                                    onClick={() => handleMarkAttendance(activeStudent, 'present')}
                                    className="py-5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-[1.5rem] font-black flex flex-col items-center gap-2 border border-emerald-100 dark:border-emerald-800 hover:bg-emerald-100 transition-all active:scale-95"
                                >
                                    <Check size={26} />
                                    Present
                                </button>
                            </div>
                            <button
                                onClick={() => { setActiveStudentId(null); setMarkingNote(''); }}
                                className="w-full mt-4 py-3 text-xs font-black text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest"
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
