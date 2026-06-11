'use client';

import { useState, useEffect } from 'react';
import { MapPin, Calendar, Navigation, CheckCircle, AlertTriangle, Loader2, Clock, X } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import dynamic from 'next/dynamic';

const FreeMap = dynamic(() => import('@/components/ui/FreeMap'), { ssr: false });

interface Student {
    id: string;
    name: string;
    stop?: { id: string; name: string };
    stop_id?: string;
}

interface Stop {
    id: string;
    name: string;
    latitude?: number;
    longitude?: number;
}

type ChangeType = 'temporary' | 'permanent';

const todayStr = () => new Date().toLocaleDateString('en-CA');
function addDays(dateStr: string, n: number) {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
}

type ActiveTab = 'leave' | 'stop';

const STATUS_PILL: Record<string, string> = {
    reported: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    pending:  'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    approved: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    rejected: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

export default function ParentRequestsPage() {
    const { user } = useAuth();
    const [tab, setTab] = useState<ActiveTab>('leave');

    const [students, setStudents] = useState<Student[]>([]);
    const [stops, setStops] = useState<Stop[]>([]);
    const [loadingStudents, setLoadingStudents] = useState(true);

    useEffect(() => {
        (async () => {
            setLoadingStudents(true);
            try {
                const { data } = await api.get('/students/my');
                const list: Student[] = Array.isArray(data) ? data : [data];
                setStudents(list);
            } catch { setStudents([]); }
            finally { setLoadingStudents(false); }
        })();
        api.get('/stops').then(({ data }) => setStops(Array.isArray(data) ? data.filter((s: Stop) => s.latitude && s.longitude) : [])).catch(() => {});
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            {/* Header */}
            <div className="bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 px-4 pt-12 pb-0">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Requests / கோரிக்கைகள்</h1>
                {/* Tabs */}
                <div className="flex gap-1">
                    {([
                        { key: 'leave', label: 'Leave / விடுப்பு' },
                        { key: 'stop', label: 'Stop Change / நிறுத்தம்' },
                    ] as { key: ActiveTab; label: string }[]).map(t => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                                tab === t.key
                                    ? 'border-[var(--brand)] text-[var(--brand)]'
                                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="px-4 py-4">
                {tab === 'leave' ? (
                    <LeaveTab students={students} loadingStudents={loadingStudents} />
                ) : (
                    <StopChangeTab students={students} stops={stops} loadingStudents={loadingStudents} />
                )}
            </div>
        </div>
    );
}

// ─── Leave / Absence Tab ─────────────────────────────────────────────────────
function LeaveTab({ students, loadingStudents }: { students: Student[]; loadingStudents: boolean }) {
    const [selectedId, setSelectedId] = useState('');
    const [date, setDate] = useState(todayStr());
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');
    const [history, setHistory] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(true);

    useEffect(() => {
        if (students.length > 0 && !selectedId) setSelectedId(students[0].id);
    }, [students]);

    useEffect(() => {
        api.get('/absence/my')
            .then(r => setHistory(Array.isArray(r.data) ? r.data : []))
            .catch(() => {})
            .finally(() => setHistoryLoading(false));
    }, [submitted]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedId) return;
        setError(''); setSubmitting(true);
        try {
            await api.post('/absence', { student_id: selectedId, date, reason: reason || undefined });
            setSubmitted(true);
        } catch (err: any) {
            setError(err?.response?.data?.error || 'Failed to submit leave report.');
        } finally { setSubmitting(false); }
    };

    const handleCancel = async (id: string) => {
        if (!confirm('Cancel this absence report?')) return;
        try {
            await api.delete(`/absence/${id}`);
            setHistory(h => h.filter(r => r.id !== id));
        } catch { alert('Could not cancel.'); }
    };

    if (submitted) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="w-12 h-12 text-emerald-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Leave Reported!</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mb-6">
                    Absence reported and the driver has been notified.
                </p>
                <button onClick={() => { setSubmitted(false); setReason(''); }} className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-5 py-2.5 font-semibold text-sm">
                    Report Another
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex gap-3">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-700 dark:text-amber-400">Absence reports are shared with the driver before pickup.</p>
                </div>

                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm">{error}</div>
                )}

                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-white mb-2">Child / குழந்தை</label>
                        {loadingStudents ? (
                            <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>
                        ) : (
                            <select value={selectedId} onChange={e => setSelectedId(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[var(--brand)]">
                                {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-white mb-2">Date / தேதி</label>
                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5">
                            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                            <input type="date" value={date} min={todayStr()} onChange={e => setDate(e.target.value)} required className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white focus:outline-none" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-white mb-2">Reason / காரணம் <span className="text-slate-400 font-normal">(optional)</span></label>
                        <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="e.g. Sick, family function..." className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] resize-none" />
                    </div>
                </div>

                <button type="submit" disabled={submitting || !selectedId} className="w-full bg-[var(--brand)] text-white rounded-2xl py-3 font-semibold text-sm disabled:opacity-50 active:scale-95 transition-all">
                    {submitting ? 'Submitting...' : 'Report Absence / வராமல் தெரிவிக்கவும்'}
                </button>
            </form>

            {/* History */}
            <div className="pt-2">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Past Reports / கடந்த தெரிவிப்புகள்</h3>
                {historyLoading ? (
                    <div className="flex items-center gap-2 text-sm text-slate-400 py-4 justify-center"><Loader2 className="w-4 h-4 animate-spin" /> Loading history...</div>
                ) : history.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-6">No absence reports yet.</p>
                ) : (
                    <div className="space-y-2">
                        {history.map(r => (
                            <div key={r.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 px-4 py-3 flex items-center gap-3">
                                <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{r.student?.name}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}{r.reason ? ` · ${r.reason}` : ''}</p>
                                </div>
                                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_PILL[r.status] || STATUS_PILL.reported}`}>
                                    {r.status || 'reported'}
                                </span>
                                {(!r.status || r.status === 'reported') && (
                                    <button onClick={() => handleCancel(r.id)} className="p-1 text-slate-400 hover:text-red-500 transition-colors" title="Cancel">
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Stop Change Tab ──────────────────────────────────────────────────────────
function StopChangeTab({ students, stops, loadingStudents }: { students: Student[]; stops: Stop[]; loadingStudents: boolean }) {
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [changeType, setChangeType] = useState<ChangeType>('temporary');
    const [newStopId, setNewStopId] = useState('');
    const [fromDate, setFromDate] = useState(todayStr());
    const [toDate, setToDate] = useState(todayStr());
    const [effectiveDate, setEffectiveDate] = useState(todayStr());
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(true);

    useEffect(() => {
        if (students.length > 0 && !selectedStudentId) setSelectedStudentId(students[0].id);
    }, [students]);

    useEffect(() => {
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(pos => setUserLocation([pos.coords.latitude, pos.coords.longitude]), () => {});
        }
    }, []);

    useEffect(() => {
        api.get('/stop-change/my')
            .then(r => setHistory(Array.isArray(r.data) ? r.data : []))
            .catch(() => {})
            .finally(() => setHistoryLoading(false));
    }, [submitted]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudentId || !newStopId) { setError('Please select a student and tap a stop on the map.'); return; }
        if (changeType === 'temporary' && toDate < fromDate) { setError('"To" date must be on or after "From" date.'); return; }
        setError(''); setSubmitting(true);
        try {
            const student = students.find(s => s.id === selectedStudentId);
            await api.post('/stop-change', {
                student_id: selectedStudentId,
                current_stop_id: student?.stop?.id || student?.stop_id || undefined,
                requested_stop_id: newStopId,
                change_type: changeType,
                effective_date: changeType === 'permanent' ? effectiveDate : fromDate,
                from_date: changeType === 'temporary' ? fromDate : undefined,
                to_date: changeType === 'temporary' ? toDate : undefined,
                reason: reason || undefined,
            });
            setSubmitted(true);
        } catch (err: any) {
            setError(err?.response?.data?.error || 'Failed to submit request.');
        } finally { setSubmitting(false); }
    };

    const selectedStudent = students.find(s => s.id === selectedStudentId);
    const currentStopName = selectedStudent?.stop?.name || 'Not assigned';
    const selectedStop = stops.find(s => s.id === newStopId);
    const mapCenter: [number, number] = userLocation || [11.1271, 78.6569];
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

    if (submitted) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="w-12 h-12 text-emerald-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Request Submitted!</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mb-6">
                    Admin will review and notify you once approved.
                </p>
                <button onClick={() => { setSubmitted(false); setNewStopId(''); setReason(''); }} className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-5 py-2.5 font-semibold text-sm">
                    Submit Another
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex gap-3">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-700 dark:text-amber-400">Changes must be submitted at least <strong>1 hour before pickup time</strong>.</p>
                </div>

                {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm">{error}</div>}

                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-white mb-2">Child / குழந்தை</label>
                        {loadingStudents ? (
                            <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>
                        ) : (
                            <select value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[var(--brand)]">
                                {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-white mb-2">Current Stop</label>
                        <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-600">
                            <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{currentStopName}</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-white mb-2">Change Type</label>
                        <div className="grid grid-cols-2 gap-3">
                            {(['temporary', 'permanent'] as ChangeType[]).map(type => (
                                <button key={type} type="button" onClick={() => setChangeType(type)} className={`p-3 rounded-xl border-2 text-sm font-semibold capitalize transition-all ${changeType === type ? 'border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]' : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'}`}>
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-white mb-2">New Stop — <span className="font-normal text-slate-400">tap a pin on the map</span></label>
                        <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700" style={{ height: 280 }}>
                            <FreeMap center={mapCenter} zoom={13} markers={mapMarkers} onStopClick={(id) => setNewStopId(id)} />
                        </div>
                        {selectedStop ? (
                            <div className="mt-2 flex items-center gap-2 bg-[var(--brand)]/5 border border-[var(--brand)]/20 rounded-xl px-3 py-2">
                                <Navigation className="w-4 h-4 text-[var(--brand)] shrink-0" />
                                <span className="text-sm font-semibold text-[var(--brand)]">{selectedStop.name}</span>
                                <button type="button" onClick={() => setNewStopId('')} className="ml-auto text-xs text-slate-400 hover:text-red-500">Clear</button>
                            </div>
                        ) : <p className="mt-2 text-xs text-slate-400 text-center">No stop selected</p>}
                    </div>

                    {changeType === 'temporary' ? (
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-white mb-2">Period <span className="text-slate-400 font-normal">(max 10 days)</span></label>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">From</label>
                                    <input type="date" value={fromDate} min={todayStr()} onChange={e => { setFromDate(e.target.value); if (toDate < e.target.value) setToDate(e.target.value); }} className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none" required />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">To</label>
                                    <input type="date" value={toDate} min={fromDate} max={addDays(fromDate, 10)} onChange={e => setToDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none" required />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-white mb-2">Effective Date</label>
                            <input type="date" value={effectiveDate} min={todayStr()} onChange={e => setEffectiveDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none" required />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-white mb-2">Reason <span className="text-slate-400 font-normal">(optional)</span></label>
                        <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="e.g. Moving to a new address temporarily..." className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] resize-none" />
                    </div>
                </div>

                <button type="submit" disabled={submitting || !selectedStudentId || !newStopId} className="w-full bg-[var(--brand)] text-white rounded-2xl py-3 font-semibold text-sm disabled:opacity-50 active:scale-95 transition-all">
                    {submitting ? 'Submitting...' : 'Submit Request / கோரிக்கை சமர்ப்பி'}
                </button>
            </form>

            {/* History */}
            <div className="pt-2">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Past Requests / கடந்த கோரிக்கைகள்</h3>
                {historyLoading ? (
                    <div className="flex items-center gap-2 text-sm text-slate-400 py-4 justify-center"><Loader2 className="w-4 h-4 animate-spin" /> Loading history...</div>
                ) : history.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-6">No stop change requests yet.</p>
                ) : (
                    <div className="space-y-2">
                        {history.map(r => (
                            <div key={r.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 px-4 py-3 flex items-center gap-3">
                                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{r.student?.name} → {r.requestedStop?.name || 'New stop'}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{r.change_type} · {new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</p>
                                </div>
                                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_PILL[r.status] || STATUS_PILL.pending}`}>
                                    {r.status}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
