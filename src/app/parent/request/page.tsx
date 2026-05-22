'use client';

import { useState, useEffect } from 'react';
import { MapPin, Calendar, Navigation, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import dynamic from 'next/dynamic';

const FreeMap = dynamic(() => import('@/components/ui/FreeMap'), { ssr: false });

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
}

type ChangeType = 'temporary' | 'permanent';

const today = new Date().toLocaleDateString('en-CA');

function addDays(dateStr: string, n: number) {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
}

export default function StopChangeRequest() {
    const { user } = useAuth();
    const router = useRouter();

    const [students, setStudents] = useState<Student[]>([]);
    const [stops, setStops] = useState<Stop[]>([]);
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [changeType, setChangeType] = useState<ChangeType>('temporary');
    const [newStopId, setNewStopId] = useState('');
    const [fromDate, setFromDate] = useState(today);
    const [toDate, setToDate] = useState(today);
    const [effectiveDate, setEffectiveDate] = useState(today);
    const [reason, setReason] = useState('');

    const [loadingStudents, setLoadingStudents] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchStudents();
        fetchStops();
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                pos => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
                () => {}
            );
        }
    }, []);

    const fetchStudents = async () => {
        setLoadingStudents(true);
        try {
            const { data } = await api.get('/students/my');
            const list: Student[] = Array.isArray(data) ? data : [data];
            setStudents(list);
            if (list.length > 0) setSelectedStudentId(list[0].id);
        } catch {
            setStudents([]);
        } finally {
            setLoadingStudents(false);
        }
    };

    const fetchStops = async () => {
        try {
            const { data } = await api.get('/stops');
            setStops(Array.isArray(data) ? data.filter((s: Stop) => s.latitude && s.longitude) : []);
        } catch {
            setStops([]);
        }
    };

    const handleStopSelect = (id: string) => setNewStopId(id);

    const mapCenter: [number, number] = userLocation || [12.9716, 77.5946];

    const mapMarkers = [
        ...(userLocation ? [{ position: userLocation, title: 'Your Location', isUserLocation: true as const }] : []),
        ...stops.map(s => ({
            id: s.id,
            position: [s.latitude!, s.longitude!] as [number, number],
            title: s.name,
            description: s.name,
            isStopPin: true as const,
            isSelected: s.id === newStopId,
        })),
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudentId || !newStopId) {
            setError('Please select a student and tap a stop on the map.');
            return;
        }
        if (changeType === 'temporary' && toDate < fromDate) {
            setError('"To" date must be on or after "From" date.');
            return;
        }
        setError('');
        setSubmitting(true);
        try {
            const selectedStudent = students.find(s => s.id === selectedStudentId);
            await api.post('/stop-change', {
                student_id: selectedStudentId,
                current_stop_id: selectedStudent?.stop?.id || selectedStudent?.stop_id || undefined,
                requested_stop_id: newStopId,
                change_type: changeType,
                effective_date: changeType === 'permanent' ? effectiveDate : fromDate,
                from_date: changeType === 'temporary' ? fromDate : undefined,
                to_date: changeType === 'temporary' ? toDate : undefined,
                reason: reason || undefined,
            });
            setSubmitted(true);
        } catch (err: any) {
            setError(
                err?.response?.data?.error || err?.response?.data?.message || 'Failed to submit request.'
            );
        } finally {
            setSubmitting(false);
        }
    };

    const selectedStudent = students.find(s => s.id === selectedStudentId);
    const currentStopName = selectedStudent?.stop?.name || selectedStudent?.stop_name || 'Not assigned';
    const selectedStop = stops.find(s => s.id === newStopId);
    const maxToDate = addDays(fromDate, 10);

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
            <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Stop Change Request</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Request a temporary or permanent stop modification for your child.</p>
            </div>

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
                            onChange={e => setSelectedStudentId(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[var(--brand)] transition-colors"
                        >
                            {students.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    )}
                </div>

                {/* 2. Current Stop */}
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

                {/* 4. New Stop — map */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
                    <h3 className="font-semibold text-sm text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                        <span className="w-5 h-5 bg-[var(--brand)]/10 text-[var(--brand)] rounded-full flex items-center justify-center text-xs font-bold">4</span>
                        New Stop
                        <span className="text-xs text-slate-400 font-normal ml-1">— tap a pin on the map</span>
                    </h3>

                    <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700" style={{ height: 300 }}>
                        <FreeMap
                            center={mapCenter}
                            zoom={13}
                            markers={mapMarkers}
                            onStopClick={handleStopSelect}
                        />
                    </div>

                    {selectedStop ? (
                        <div className="mt-3 flex items-center gap-2 bg-[var(--brand)]/5 border border-[var(--brand)]/20 rounded-xl px-3 py-2">
                            <Navigation className="w-4 h-4 text-[var(--brand)] shrink-0" />
                            <span className="text-sm font-semibold text-[var(--brand)]">{selectedStop.name}</span>
                            <button
                                type="button"
                                onClick={() => setNewStopId('')}
                                className="ml-auto text-xs text-slate-400 hover:text-red-500"
                            >
                                Clear
                            </button>
                        </div>
                    ) : (
                        <p className="mt-3 text-xs text-slate-400 text-center">No stop selected — tap a blue pin on the map</p>
                    )}
                </div>

                {/* 5. Dates */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
                    {changeType === 'temporary' ? (
                        <>
                            <h3 className="font-semibold text-sm text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                                <span className="w-5 h-5 bg-[var(--brand)]/10 text-[var(--brand)] rounded-full flex items-center justify-center text-xs font-bold">5</span>
                                Effective Period
                                <span className="text-xs text-slate-400 font-normal ml-1">max 10 days</span>
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">From</label>
                                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5">
                                        <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                                        <input
                                            type="date"
                                            value={fromDate}
                                            min={today}
                                            onChange={e => {
                                                const v = e.target.value;
                                                setFromDate(v);
                                                if (toDate < v) setToDate(v);
                                                if (toDate > addDays(v, 10)) setToDate(addDays(v, 10));
                                            }}
                                            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white focus:outline-none"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                                        To
                                        <span className="text-slate-400 font-normal ml-1">(max 10 days)</span>
                                    </label>
                                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5">
                                        <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                                        <input
                                            type="date"
                                            value={toDate}
                                            min={fromDate}
                                            max={maxToDate}
                                            onChange={e => setToDate(e.target.value)}
                                            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white focus:outline-none"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <h3 className="font-semibold text-sm text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                                <span className="w-5 h-5 bg-[var(--brand)]/10 text-[var(--brand)] rounded-full flex items-center justify-center text-xs font-bold">5</span>
                                Effective Date
                            </h3>
                            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5">
                                <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                                <input
                                    type="date"
                                    value={effectiveDate}
                                    min={today}
                                    onChange={e => setEffectiveDate(e.target.value)}
                                    className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white focus:outline-none"
                                    required
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* 6. Reason */}
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
