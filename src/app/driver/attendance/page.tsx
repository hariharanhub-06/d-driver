'use client';

import { useState, useEffect } from 'react';
import { Check, X, Search, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { useT, ta } from '@/lib/i18n';

interface Student { id: string; name: string; photo_url?: string; grade?: string; stop_id?: string; }
interface AbsenceRecord { student_id: string; status: string; }
interface TripStop { id: string; name: string; sequence: number; students: Student[]; }

// ── ALL EXISTING LOGIC PRESERVED — VERBATIM ───────────────────────────────
export default function DriverAttendancePage() {
    const t = useT();
    const [stops, setStops] = useState<TripStop[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentStopIndex, setCurrentStopIndex] = useState(0);
    const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent'>>({});
    const [absences, setAbsences] = useState<AbsenceRecord[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [tripId, setTripId] = useState<string>('');
    const [isEvening, setIsEvening] = useState(false);
    const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
    const [markingNote, setMarkingNote] = useState('');

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const tripsRes = await api.get('/trips/active');
            const trips = Array.isArray(tripsRes.data) ? tripsRes.data : [];
            const trip = trips[0];
            if (trip) {
                setTripId(trip.id);
                const savedType = typeof window !== 'undefined' ? localStorage.getItem('driver_trip_type') : null;
                const tripType = savedType || trip.route?.route_type || trip.route_type || '';
                setIsEvening(tripType === 'afternoon' || tripType === 'evening');
                const route = trip.route || {};
                const stopsWithStudents: TripStop[] = (route.stops || []).map((stop: any) => ({
                    ...stop,
                    students: stop.students || [],
                }));
                if (stopsWithStudents.length > 0) { setStops(stopsWithStudents); }
                else {
                    const routeRes = await api.get(`/routes/${trip.route_id}`);
                    const r = routeRes.data;
                    const s2 = r.students || [];
                    setStops((r.stops || []).map((stop: any) => ({
                        ...stop,
                        students: stop.students || s2.filter((s: any) => s.stop_id === stop.id),
                    })));
                }
                setCurrentStopIndex(trip.current_stop_index ?? 0);
            }
            try {
                const today = new Date().toLocaleDateString('en-CA');
                const routeParam = trip?.route_id ? `&route_id=${trip.route_id}` : '';
                const absRes = await api.get(`/absence?date=${today}${routeParam}`);
                const absData = absRes.data;
                setAbsences(Array.isArray(absData) ? absData : absData?.absences || []);
            } catch { setAbsences([]); }
        } catch { setError('Failed to load route data'); }
        finally { setLoading(false); }
    };

    const handleMarkAttendance = async (student: Student, status: 'present' | 'absent') => {
        try {
            await api.post('/attendance/mark', {
                student_id: student.id,
                status,
                trip_id: tripId || undefined,
                note: markingNote || undefined,
                attendance_type: isEvening ? 'dropoff' : 'pickup',
            });
        } catch { alert('Failed to mark attendance. Please try again.'); return; }
        setAttendance(prev => ({ ...prev, [student.id]: status }));
        if (status === 'present') setAbsences(prev => prev.filter(a => a.student_id !== student.id));
        setActiveStudentId(null);
        setMarkingNote('');
    };

    const handleMarkAll = async () => {
        const allStudents = stops.flatMap(s => s.students);
        const unmarked = allStudents.filter(s => !attendance[s.id]);
        for (const student of unmarked) { await handleMarkAttendance(student, 'present'); }
    };

    const isPreAbsent = (studentId: string) => absences.some(a => a.student_id === studentId && a.status === 'absent');
    const currentStop = stops[currentStopIndex];
    const allStudents = stops.flatMap(s => s.students);
    const filteredStudents = searchQuery ? allStudents.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())) : currentStop?.students || [];
    const activeStudent = activeStudentId ? allStudents.find(s => s.id === activeStudentId) : null;

    const onBoard = allStudents.filter(s => attendance[s.id] === 'present').length;
    const missing = allStudents.filter(s => !attendance[s.id] && !isPreAbsent(s.id)).length;

    if (loading) return <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center"><div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" /></div>;
    if (error) return <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6"><div className="bg-red-900/30 border border-red-800 text-red-400 rounded-2xl p-6 text-center">{error}</div></div>;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            {/* Header */}
            <div className="bg-white dark:bg-slate-800 px-4 pt-10 pb-4">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-xl font-bold text-white">{t('Student Attendance', 'மாணவர் வருகை பதிவு')}</h1>
                        <p className="text-slate-400 text-xs mt-0.5">{t('Today\'s Attendance', 'இன்றைய வருகை')}</p>
                    </div>
                    <button onClick={handleMarkAll} className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 active:scale-95 transition-all">
                        <Check className="w-3.5 h-3.5" /> {t('Mark All Present', 'அனைவரும் வந்தனர் என குறிக்கவும்')}
                    </button>
                </div>

                {/* Summary tiles */}
                <div className="grid grid-cols-3 gap-2">
                    {[
                        { label: t('On Board', 'பேருந்தில் உள்ளவர்'), val: onBoard, color: 'text-emerald-400' },
                        { label: t('Missing', 'இல்லாதவர்'), val: missing, color: 'text-red-400' },
                        { label: t('Total', 'மொத்தம்'), val: allStudents.length, color: 'text-white' },
                    ].map(item => (
                        <div key={item.label} className="bg-slate-700/50 rounded-xl p-3 text-center">
                            <p className={`text-2xl font-black ${item.color}`}>{item.val}</p>
                            <p className="text-slate-400 text-[10px] mt-0.5">{item.label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Search */}
            <div className="px-4 pt-3 pb-2">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" placeholder={t('Search student...', 'மாணவரை தேடு...')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-2.5 pl-11 pr-4 text-sm text-white focus:outline-none focus:border-[var(--brand)] transition-colors placeholder:text-slate-500" />
                </div>
            </div>

            {/* Stop tabs */}
            {!searchQuery && stops.length > 0 && (
                <div className="px-4 py-2 flex gap-2 overflow-x-auto">
                    {stops.map((stop, i) => (
                        <button key={stop.id} onClick={() => setCurrentStopIndex(i)} className={cn('shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition-all', i === currentStopIndex ? 'bg-[var(--brand)] text-white' : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700')}>
                            {stop.name}
                        </button>
                    ))}
                </div>
            )}

            {/* Current stop info */}
            {!searchQuery && currentStop && (
                <div className="mx-4 mt-2 mb-3 bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                    <div className="p-2 bg-[var(--brand)]/20 rounded-xl"><MapPin className="w-4 h-4 text-[var(--brand)]" /></div>
                    <div>
                        <p className="font-bold text-white text-sm">{currentStop.name}</p>
                        <p className="text-slate-400 text-xs">{currentStop.students.length} {t('Students', 'மாணவர்கள்')}</p>
                    </div>
                </div>
            )}

            {/* Student List */}
            <div className="px-4 space-y-2 pb-6">
                {filteredStudents.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 text-sm">
                        {searchQuery
                            ? t('No students match your search', 'தேடலில் மாணவர்கள் இல்லை')
                            : t('No students at this stop', 'இந்த நிறுத்தத்தில் மாணவர்கள் இல்லை')}
                    </div>
                ) : filteredStudents.map(student => {
                    const marked = attendance[student.id];
                    const preAbsent = isPreAbsent(student.id);
                    return (
                        <div key={student.id} className={cn('bg-white dark:bg-slate-800 rounded-2xl p-4 border flex items-center gap-4 transition-all', marked === 'present' ? 'border-emerald-700' : marked === 'absent' ? 'border-red-800' : preAbsent ? 'border-amber-700 opacity-75' : 'border-slate-200 dark:border-slate-700')}>
                            <div className="w-12 h-12 rounded-2xl bg-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                                {student.photo_url ? <img src={student.photo_url} alt={student.name} className="w-full h-full object-cover" /> : <span className="text-lg font-bold text-slate-400">{student.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}</span>}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-white truncate">{student.name}</p>
                                <p className="text-xs text-slate-400">{student.grade || t('Student', 'மாணவர்')}</p>
                            </div>
                            {preAbsent && !marked ? (
                                <span className="bg-amber-900/30 text-amber-400 rounded-full px-2.5 py-0.5 text-xs font-medium">{t('Absent', 'வரவில்லை')}</span>
                            ) : marked ? (
                                <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium flex items-center gap-1', marked === 'present' ? 'bg-emerald-900/30 text-emerald-400' : 'bg-red-900/30 text-red-400')}>
                                    {marked === 'present' ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                    {marked === 'present'
                                        ? (isEvening ? t('Dropped', 'இறங்கினர்') : t('Present', 'வந்தனர்'))
                                        : t('Absent', 'வரவில்லை')}
                                </span>
                            ) : (
                                <div className="flex gap-2">
                                    <button onClick={() => handleMarkAttendance(student, 'absent')} className="px-2.5 py-1.5 bg-red-900/30 rounded-xl flex items-center gap-1 active:scale-95 transition-all text-xs font-semibold text-red-400">
                                        <X className="w-3.5 h-3.5" /> {t('Absent', 'வரவில்லை')}
                                    </button>
                                    <button onClick={() => handleMarkAttendance(student, 'present')} className="px-2.5 py-1.5 bg-emerald-900/30 rounded-xl flex items-center gap-1 active:scale-95 transition-all text-xs font-semibold text-emerald-400">
                                        <Check className="w-3.5 h-3.5" /> {isEvening ? t('Dropped', 'இறங்கினர்') : t('Present', 'வந்தனர்')}
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Mark attendance overlay */}
            {activeStudent && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-200 dark:border-slate-700">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('Mark Attendance', 'வருகை குறி')}</h3>
                            <button onClick={() => { setActiveStudentId(null); setMarkingNote(''); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="bg-[var(--brand)] p-8 flex flex-col items-center">
                            <div className="w-20 h-20 rounded-full bg-white/20 border-4 border-white/40 flex items-center justify-center mb-4 overflow-hidden">
                                {activeStudent.photo_url ? <img src={activeStudent.photo_url} alt={activeStudent.name} className="w-full h-full object-cover" /> : <span className="text-3xl font-bold text-white">{activeStudent.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}</span>}
                            </div>
                            <h3 className="text-xl font-bold text-white text-center">{activeStudent.name}</h3>
                            <p className="text-white/70 text-sm mt-1">{activeStudent.grade || t('Student', 'மாணவர்')}</p>
                        </div>
                        <div className="p-6">
                            <div className="mb-4"><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('Note (optional)', 'குறிப்பு (விருப்பமானது)')}</label><input type="text" value={markingNote} onChange={e => setMarkingNote(e.target.value)} placeholder={t('Add a note...', 'குறிப்பு சேர்...')} className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)]" /></div>
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => handleMarkAttendance(activeStudent, 'absent')} className="py-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl font-bold flex flex-col items-center gap-2 border border-red-100 dark:border-red-800 active:scale-95"><X size={24} />{t('Absent', 'வரவில்லை')}</button>
                                <button onClick={() => handleMarkAttendance(activeStudent, 'present')} className="py-4 bg-[var(--brand)] text-white rounded-2xl font-bold flex flex-col items-center gap-2 active:scale-95"><Check size={24} />{isEvening ? t('Dropped', 'இறங்கினர்') : t('Present', 'வந்தனர்')}</button>
                            </div>
                            <button onClick={() => { setActiveStudentId(null); setMarkingNote(''); }} className="w-full mt-4 py-2.5 text-xs font-medium text-slate-400 transition-colors">{t('Cancel', 'ரத்து செய்')}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
