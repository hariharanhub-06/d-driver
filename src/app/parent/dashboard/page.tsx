'use client';

import { useState, useEffect } from 'react';
import { Bus, AlertTriangle, MapPin, Phone, Clock, ChevronRight, Navigation, X } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

interface Child {
    id: string;
    name: string;
    grade?: string;
    status?: string;
    driver?: { name: string; phone?: string };
    bus?: { bus_number: string };
    route_id?: string;
}

interface Notification {
    id: string;
    title: string;
    message: string;
    type: string;
    created_at: string;
    read: boolean;
}

export default function ParentDashboard() {
    const { user } = useAuth();
    const [children, setChildren] = useState<Child[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showAbsentModal, setShowAbsentModal] = useState(false);
    const [activeChildId, setActiveChildId] = useState<string | null>(null);
    const today = new Date().toLocaleDateString('en-CA');
    const tomorrow = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toLocaleDateString('en-CA'); })();
    const [absentForm, setAbsentForm] = useState({ student_id: '', from_date: tomorrow, to_date: tomorrow, reason: '' });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchAll();
        const stored = localStorage.getItem('active_child_id');
        if (stored) setActiveChildId(stored);
    }, []);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [childrenRes, notifRes] = await Promise.allSettled([
                api.get('/students/my-children'),
                api.get('/notifications'),
            ]);

            if (childrenRes.status === 'fulfilled') {
                const data = childrenRes.value.data;
                setChildren(Array.isArray(data) ? data : []);
            }
            if (notifRes.status === 'fulfilled') {
                const data = notifRes.value.data;
                setNotifications((Array.isArray(data) ? data : []).slice(0, 10));
            }
        } catch (e: any) {
            setError('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleReportAbsent = async () => {
        const sid = absentForm.student_id || (children.length === 1 ? children[0].id : '');
        if (!sid || !absentForm.reason) return;
        setSubmitting(true);
        try {
            const start = new Date(absentForm.from_date + 'T00:00:00');
            const end = new Date(absentForm.to_date + 'T00:00:00');
            const dates: string[] = [];
            for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                dates.push(d.toISOString().slice(0, 10));
            }
            const results = await Promise.allSettled(
                dates.map(date => api.post('/absence', { student_id: sid, date, reason: absentForm.reason }))
            );
            const succeeded = results.filter(r => r.status === 'fulfilled').length;
            const firstFail = results.find(r => r.status === 'rejected') as PromiseRejectedResult | undefined;
            if (succeeded === 0 && firstFail) {
                const err = (firstFail.reason as any);
                alert(err?.response?.data?.error || err?.response?.data?.message || 'Failed to report absence');
                return;
            }
            setShowAbsentModal(false);
            setAbsentForm({ student_id: '', from_date: tomorrow, to_date: tomorrow, reason: '' });
            alert(`Absence reported for ${succeeded} day${succeeded > 1 ? 's' : ''}${succeeded < dates.length ? ` (${dates.length - succeeded} already reported)` : ''}.`);
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusBadge = (status?: string) => {
        switch (status?.toLowerCase()) {
            case 'boarding': return 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full px-2.5 py-0.5 text-xs font-medium';
            case 'in transit': return 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full px-2.5 py-0.5 text-xs font-medium';
            case 'at school': return 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full px-2.5 py-0.5 text-xs font-medium';
            case 'at home': return 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full px-2.5 py-0.5 text-xs font-medium';
            default: return 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full px-2.5 py-0.5 text-xs font-medium';
        }
    };

    const getNotifIcon = (type: string) => {
        switch (type) {
            case 'alert': return '🚨';
            case 'info': return 'ℹ️';
            case 'success': return '✅';
            case 'warning': return '⚠️';
            default: return '🔔';
        }
    };

    const primaryChild = (activeChildId ? children.find(c => c.id === activeChildId) : null) || children[0];
    const driverPhone = primaryChild?.driver?.phone;

    return (
        <div className="space-y-4 p-4">
            {/* Greeting */}
            <div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">Hello, {user?.name.split(' ')[0]}</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
                </p>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 text-red-600 dark:text-red-400 text-sm font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
                </div>
            )}

            {/* Hero child status card */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
                </div>
            ) : primaryChild ? (
                <div className="bg-[var(--brand)] text-white rounded-2xl p-6 shadow-lg">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-1">Live Status</p>
                            <h3 className="text-2xl font-bold">{primaryChild.name}</h3>
                            <span className="inline-block mt-2 bg-white/20 text-white rounded-full px-2.5 py-0.5 text-xs font-medium">
                                {primaryChild.status || 'Status unknown'}
                            </span>
                        </div>
                        <div className="bg-white/20 p-3 rounded-xl">
                            <Bus className="w-6 h-6 text-white" />
                        </div>
                    </div>
                    {primaryChild.bus && (
                        <p className="text-white/70 text-sm font-medium flex items-center gap-2 mb-4">
                            <Bus className="w-4 h-4" />
                            Bus {primaryChild.bus.bus_number}
                            {primaryChild.driver && <span>· {primaryChild.driver.name}</span>}
                        </p>
                    )}
                    <Link
                        href="/parent/tracking"
                        className="flex items-center justify-center gap-2 bg-white text-[var(--brand)] hover:bg-white/90 transition-all py-3 rounded-xl font-semibold text-sm active:scale-95"
                    >
                        <Navigation className="w-4 h-4" /> Track Now
                    </Link>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5 text-center">
                    <p className="text-sm text-slate-500 dark:text-slate-400">No children linked to your account</p>
                </div>
            )}

            {/* Multiple children list */}
            {children.length > 1 && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Your Children</h2>
                    <div className="space-y-3">
                        {children.slice(1).map(child => (
                            <div key={child.id} className="flex items-center gap-4 py-2">
                                <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center font-bold text-slate-500 dark:text-slate-400">
                                    {child.name.charAt(0)}
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-slate-900 dark:text-white text-sm">{child.name}</p>
                                    {child.status && <span className={getStatusBadge(child.status)}>{child.status}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={() => {
                        if (primaryChild) setAbsentForm(prev => ({ ...prev, student_id: primaryChild.id }));
                        setShowAbsentModal(true);
                    }}
                    className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5 text-left active:scale-95 transition-all"
                >
                    <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/30 rounded-xl flex items-center justify-center mb-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <span className="text-sm font-semibold text-slate-700 dark:text-white">Report Absent</span>
                </button>

                <Link href="/parent/request" className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5 text-left active:scale-95 transition-all block">
                    <div className="w-10 h-10 bg-[var(--brand)]/10 rounded-xl flex items-center justify-center mb-3">
                        <MapPin className="w-5 h-5 text-[var(--brand)]" />
                    </div>
                    <span className="text-sm font-semibold text-slate-700 dark:text-white">Change Stop</span>
                </Link>

                {driverPhone ? (
                    <a href={`tel:${driverPhone}`} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5 text-left active:scale-95 transition-all block">
                        <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center mb-3">
                            <Phone className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <span className="text-sm font-semibold text-slate-700 dark:text-white">Call Driver</span>
                    </a>
                ) : (
                    <Link href="/parent/fees" className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5 text-left active:scale-95 transition-all block">
                        <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center mb-3">
                            <ChevronRight className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <span className="text-sm font-semibold text-slate-700 dark:text-white">Pay Fees</span>
                    </Link>
                )}
            </div>

            {/* Activity feed */}
            {notifications.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Today's Activity</h2>
                    <div className="space-y-3">
                        {notifications.map(notif => (
                            <div key={notif.id} className={`flex items-start gap-3 py-3 border-b border-slate-50 dark:border-slate-700/50 last:border-0 ${!notif.read ? 'opacity-100' : 'opacity-75'}`}>
                                <div className="text-lg shrink-0">{getNotifIcon(notif.type)}</div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-slate-900 dark:text-white text-sm">{notif.title}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{notif.message}</p>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {new Date(notif.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Report Absent Modal */}
            {showAbsentModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Report Absence</h3>
                            <button onClick={() => setShowAbsentModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-5">
                                <AlertTriangle className="w-5 h-5 text-amber-500" />
                                <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Fill in the details below</span>
                            </div>
                            <div className="space-y-4 mb-6">
                                {children.length > 1 && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Student</label>
                                        <select
                                            value={absentForm.student_id}
                                            onChange={e => setAbsentForm({ ...absentForm, student_id: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors"
                                        >
                                            <option value="">Select child</option>
                                            {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">From</label>
                                        <input
                                            type="date"
                                            value={absentForm.from_date}
                                            min={tomorrow}
                                            onChange={e => setAbsentForm({ ...absentForm, from_date: e.target.value, to_date: e.target.value > absentForm.to_date ? e.target.value : absentForm.to_date })}
                                            className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[var(--brand)] transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">To</label>
                                        <input
                                            type="date"
                                            value={absentForm.to_date}
                                            min={absentForm.from_date || tomorrow}
                                            onChange={e => setAbsentForm({ ...absentForm, to_date: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[var(--brand)] transition-colors"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Reason</label>
                                    <textarea
                                        value={absentForm.reason}
                                        onChange={e => setAbsentForm({ ...absentForm, reason: e.target.value })}
                                        placeholder="Reason for absence..."
                                        className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors resize-none h-20"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowAbsentModal(false)}
                                    className="flex items-center gap-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-4 py-2.5 font-semibold text-sm flex-1 justify-center"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleReportAbsent}
                                    disabled={submitting || !absentForm.reason || !absentForm.from_date || !absentForm.to_date || (children.length > 1 && !absentForm.student_id)}
                                    className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95 flex-1 justify-center disabled:opacity-50"
                                >
                                    {submitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Submit'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
