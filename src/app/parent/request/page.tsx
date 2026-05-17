'use client';

import { useState, useEffect } from 'react';
import { MapPin, Calendar, Navigation, CheckCircle, AlertTriangle, Loader2, LocateFixed } from 'lucide-react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface Student {
    id: string;
    name: string;
    stop?: { id: string; name: string };
    stop_id?: string;
    stop_name?: string;
}

interface Stop {
    id: string;
    name: string;
    latitude?: number;
    longitude?: number;
    distance?: number;
}

type ChangeType = 'temporary' | 'permanent';

export default function StopChangeRequest() {
    const { user } = useAuth();
    const router = useRouter();

    const [students, setStudents] = useState<Student[]>([]);
    const [stops, setStops] = useState<Stop[]>([]);
    const [nearbyStops, setNearbyStops] = useState<Stop[]>([]);

    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [changeType, setChangeType] = useState<ChangeType>('temporary');
    const [newStopId, setNewStopId] = useState('');
    const [effectiveDate, setEffectiveDate] = useState(
        new Date().toISOString().split('T')[0]
    );
    const [reason, setReason] = useState('');

    const [loadingStudents, setLoadingStudents] = useState(true);
    const [loadingNearby, setLoadingNearby] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchStudents();
    }, []);

    const fetchStudents = async () => {
        setLoadingStudents(true);
        try {
            // Try dedicated endpoint first, fall back to finance/my-fees hint approach
            const { data } = await api.get('/students/my');
            const list: Student[] = Array.isArray(data) ? data : [data];
            setStudents(list);
            if (list.length > 0) {
                setSelectedStudentId(list[0].id);
                fetchStopsForStudent(list[0]);
            }
        } catch {
            // Fallback: try parent's students via user context
            setStudents([]);
        } finally {
            setLoadingStudents(false);
        }
    };

    const fetchStopsForStudent = async (student?: Student) => {
        try {
            const params: Record<string, string> = {};
            if (user?.school_id) params.school_id = user.school_id;
            const { data } = await api.get('/stops', { params });
            setStops(data || []);
        } catch {
            setStops([]);
        }
    };

    const handleStudentChange = (id: string) => {
        setSelectedStudentId(id);
        setNewStopId('');
        const student = students.find(s => s.id === id);
        if (student) fetchStopsForStudent(student);
    };

    const handleFindNearby = () => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser.');
            return;
        }
        setLoadingNearby(true);
        setError('');
        navigator.geolocation.getCurrentPosition(
            async ({ coords }) => {
                try {
                    const { data } = await api.get('/stops/nearby', {
                        params: { lat: coords.latitude, lng: coords.longitude },
                    });
                    setNearbyStops(data || []);
                    if (!data || data.length === 0) {
                        setError('No stops found nearby. Try selecting from the full list.');
                    }
                } catch {
                    setError('Failed to fetch nearby stops.');
                } finally {
                    setLoadingNearby(false);
                }
            },
            () => {
                setError('Location permission denied. Please allow location access and try again.');
                setLoadingNearby(false);
            }
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudentId || !newStopId) {
            setError('Please select a student and a new stop.');
            return;
        }
        setError('');
        setSubmitting(true);
        try {
            await api.post('/stop-change', {
                student_id: selectedStudentId,
                new_stop_id: newStopId,
                change_type: changeType,
                effective_date: effectiveDate,
                reason: reason || undefined,
            });
            setSubmitted(true);
        } catch (err: any) {
            setError(
                err?.response?.data?.message || 'Failed to submit request. Please try again.'
            );
        } finally {
            setSubmitting(false);
        }
    };

    const selectedStudent = students.find(s => s.id === selectedStudentId);
    const currentStopName =
        selectedStudent?.stop?.name || selectedStudent?.stop_name || 'Not assigned';

    const displayStops = nearbyStops.length > 0 ? nearbyStops : stops;

    if (submitted) {
        return (
            <div className="space-y-4 p-4 flex flex-col items-center justify-center py-16 text-center min-h-screen">
                <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle className="w-12 h-12 text-emerald-500" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Request Submitted!</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mb-8">
                    Admin will review your stop change request within 24 hours. You'll be notified once it's approved.
                </p>
                <button
                    onClick={() => router.push('/parent/dashboard')}
                    className="flex items-center gap-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-4 py-2.5 font-semibold text-sm"
                >
                    Back to Home
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4 p-4">
            {/* Header */}
            <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Stop Change Request</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Request a temporary or permanent stop modification for your child.</p>
            </div>

            {/* Warning banner */}
            <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-700 dark:text-amber-400">
                    Changes must be submitted at least <strong>1 hour before pickup time</strong>.
                </p>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* 1. Select Child */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
                    <h3 className="font-semibold text-sm text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                        <span className="w-5 h-5 bg-[var(--brand)]/10 text-[var(--brand)] rounded-full flex items-center justify-center text-xs font-bold">1</span>
                        Select Child
                    </h3>
                    {loadingStudents ? (
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                            <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                        </div>
                    ) : students.length === 0 ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400">No students found for your account.</p>
                    ) : (
                        <select
                            value={selectedStudentId}
                            onChange={e => handleStudentChange(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors"
                        >
                            {students.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    )}
                </div>

                {/* 2. Current Stop (read-only) */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
                    <h3 className="font-semibold text-sm text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                        <span className="w-5 h-5 bg-[var(--brand)]/10 text-[var(--brand)] rounded-full flex items-center justify-center text-xs font-bold">2</span>
                        Current Stop
                    </h3>
                    <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-600">
                        <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{currentStopName}</span>
                    </div>
                </div>

                {/* 3. Change Type */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
                    <h3 className="font-semibold text-sm text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                        <span className="w-5 h-5 bg-[var(--brand)]/10 text-[var(--brand)] rounded-full flex items-center justify-center text-xs font-bold">3</span>
                        Change Type
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        {(['temporary', 'permanent'] as ChangeType[]).map(type => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => setChangeType(type)}
                                className={`p-3 rounded-xl border-2 text-sm font-semibold capitalize transition-all ${
                                    changeType === type
                                        ? 'border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]'
                                        : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300'
                                }`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 4. New Stop */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                            <span className="w-5 h-5 bg-[var(--brand)]/10 text-[var(--brand)] rounded-full flex items-center justify-center text-xs font-bold">4</span>
                            New Stop
                        </h3>
                        <button
                            type="button"
                            onClick={handleFindNearby}
                            disabled={loadingNearby}
                            className="flex items-center gap-1.5 text-xs font-semibold text-[var(--brand)] bg-[var(--brand)]/10 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
                        >
                            {loadingNearby ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                                <LocateFixed className="w-3 h-3" />
                            )}
                            Find Nearby
                        </button>
                    </div>

                    {nearbyStops.length > 0 && (
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wide mb-2">
                            Showing {nearbyStops.length} nearby stops
                        </p>
                    )}

                    <select
                        value={newStopId}
                        onChange={e => setNewStopId(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors"
                        required
                    >
                        <option value="">Select a stop...</option>
                        {displayStops.map(stop => (
                            <option key={stop.id} value={stop.id}>
                                {stop.name}
                                {stop.distance != null
                                    ? ` — ${(stop.distance / 1000).toFixed(1)} km`
                                    : ''}
                            </option>
                        ))}
                    </select>

                    {newStopId && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <Navigation className="w-3 h-3 text-emerald-500" />
                            {displayStops.find(s => s.id === newStopId)?.name}
                        </div>
                    )}
                </div>

                {/* 5. Effective Date */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
                    <h3 className="font-semibold text-sm text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                        <span className="w-5 h-5 bg-[var(--brand)]/10 text-[var(--brand)] rounded-full flex items-center justify-center text-xs font-bold">5</span>
                        Effective Date
                    </h3>
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5">
                        <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                        <input
                            type="date"
                            value={effectiveDate}
                            min={new Date().toISOString().split('T')[0]}
                            onChange={e => setEffectiveDate(e.target.value)}
                            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white focus:outline-none"
                            required
                        />
                    </div>
                </div>

                {/* 6. Reason (optional) */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
                    <h3 className="font-semibold text-sm text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                        <span className="w-5 h-5 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded-full flex items-center justify-center text-xs font-bold">6</span>
                        Reason
                        <span className="text-xs text-slate-400 font-normal">(optional)</span>
                    </h3>
                    <textarea
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        rows={3}
                        placeholder="e.g. Moving to a new address temporarily..."
                        className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors resize-none"
                    />
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={submitting || !selectedStudentId || !newStopId}
                    className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95 w-full justify-center disabled:opacity-60"
                >
                    {submitting ? (
                        <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Submitting...</>
                    ) : (
                        'Submit Request'
                    )}
                </button>
            </form>
        </div>
    );
}
