'use client';

import { useState, useEffect } from 'react';
import { Bus, AlertTriangle, MapPin, Phone, X, Navigation } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { useT, ta } from '@/lib/i18n';

interface Child {
    id: string;
    name: string;
    grade?: string;
    status?: string;
    driver?: { name: string; phone?: string };
    bus?: { bus_number: string };
    route_id?: string;
    route?: { id: string; name: string; stops?: any[] };
    stop?: { id: string; name: string };
}

interface Notification {
    id: string;
    title: string;
    message: string;
    type: string;
    created_at: string;
    read: boolean;
}

// ── ALL EXISTING LOGIC PRESERVED ──────────────────────────────────────────
export default function ParentDashboard() {
    const { user } = useAuth();
    const t = useT();
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
        } catch {
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

    const primaryChild = (activeChildId ? children.find(c => c.id === activeChildId) : null) || children[0];
    const driverPhone = primaryChild?.driver?.phone;
    const hour = new Date().getHours();
    const greeting = hour < 12 ? '🌅' : hour < 17 ? '☀️' : '🌙';

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
            {/* ── Header bar ── */}
            <div className="bg-[var(--brand)] px-4 pt-10 pb-5">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-white/80 text-xs font-medium">{greeting} {t('Hello', 'வணக்கம்')},</p>
                        <h1 className="text-xl font-bold text-white leading-tight">{user?.name?.split(' ')[0] || 'Parent'}!</h1>
                    </div>
                    {/* SOS button */}
                    {driverPhone && (
                        <a
                            href={`tel:${driverPhone}`}
                            className="bg-red-500 hover:bg-red-600 text-white font-black text-xs px-3 py-2 rounded-xl shadow-lg active:scale-95 transition-all"
                        >
                            SOS
                        </a>
                    )}
                </div>

                {/* Bus ETA card inside header */}
                {!loading && primaryChild?.bus && (
                    <div className="mt-4 bg-white/15 backdrop-blur-sm rounded-2xl p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                    <Bus className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <p className="text-white font-bold text-base">{primaryChild.bus.bus_number}</p>
                                    <p className="text-white/70 text-xs">{primaryChild.route?.name || t('Route', 'வழி')}</p>
                                </div>
                            </div>
                            <Link href="/parent/tracking" className="bg-white text-[var(--brand)] rounded-xl px-3 py-2 text-xs font-bold flex items-center gap-1 active:scale-95 transition-all">
                                <Navigation className="w-3 h-3" /> {t('Track', 'கண்காணி')}
                            </Link>
                        </div>
                    </div>
                )}
            </div>

            <div className="px-4 py-4 space-y-4">
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 text-red-600 dark:text-red-400 text-sm font-bold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
                    </div>
                )}

                {loading && (
                    <div className="flex justify-center py-12">
                        <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
                    </div>
                )}

                {/* Bus Stops vertical timeline */}
                {!loading && primaryChild?.route?.stops && primaryChild.route.stops.length > 0 && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
                        <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-1">
                            {t('Bus Stops', 'நிறுத்தங்கள்')}
                        </h2>
                        <div className="mt-3 space-y-0">
                            {(primaryChild.route.stops as any[]).map((stop, idx, arr) => {
                                const isYours = stop.id === primaryChild.stop?.id;
                                const isLast = idx === arr.length - 1;
                                return (
                                    <div key={stop.id} className="flex items-start gap-3">
                                        {/* Timeline dot + line */}
                                        <div className="flex flex-col items-center w-4 shrink-0">
                                            <div className={`w-3 h-3 rounded-full border-2 mt-1 shrink-0 ${isYours ? 'border-orange-400 bg-orange-400' : 'border-emerald-400 bg-emerald-400'}`} />
                                            {!isLast && <div className="w-px flex-1 bg-slate-200 dark:bg-slate-600 min-h-[20px]" />}
                                        </div>
                                        <div className={`pb-3 flex-1 min-w-0 ${isYours ? 'text-orange-600 dark:text-orange-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
                                            <p className="text-sm leading-tight">
                                                {isYours ? `👇 ${t('Your Stop', 'உங்கள் நிறுத்தம்')} — ` : ''}{stop.name}
                                            </p>
                                            {stop.pickup_time && (
                                                <p className="text-xs text-slate-400 mt-0.5">{stop.pickup_time}</p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Multiple children selector */}
                {children.length > 1 && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-4">
                        <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-3">{t('My Child', 'என் குழந்தை')}</h2>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                            {children.map(child => (
                                <button
                                    key={child.id}
                                    onClick={() => { setActiveChildId(child.id); localStorage.setItem('active_child_id', child.id); }}
                                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                                        (activeChildId || children[0].id) === child.id
                                            ? 'bg-[var(--brand)] text-white'
                                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                    }`}
                                >
                                    {child.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Quick Actions */}
                <div className="grid grid-cols-3 gap-3">
                    <button
                        onClick={() => {
                            if (primaryChild) setAbsentForm(prev => ({ ...prev, student_id: primaryChild.id }));
                            setShowAbsentModal(true);
                        }}
                        className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-4 text-center active:scale-95 transition-all"
                    >
                        <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/30 rounded-xl flex items-center justify-center mx-auto mb-2">
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                        </div>
                        <p className="text-xs font-semibold text-slate-700 dark:text-white leading-tight">{t('Report', 'தெரிவி')}</p>
                        <p className="text-[10px] text-slate-400">{t('Absent', 'வரவில்லை')}</p>
                    </button>

                    <Link href="/parent/requests" className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-4 text-center active:scale-95 transition-all block">
                        <div className="w-10 h-10 bg-[var(--brand)]/10 rounded-xl flex items-center justify-center mx-auto mb-2">
                            <MapPin className="w-5 h-5 text-[var(--brand)]" />
                        </div>
                        <p className="text-xs font-semibold text-slate-700 dark:text-white leading-tight">{t('Change', 'மாற்று')}</p>
                        <p className="text-[10px] text-slate-400">{t('Stop', 'நிறுத்தம்')}</p>
                    </Link>

                    {driverPhone ? (
                        <a href={`tel:${driverPhone}`} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-4 text-center active:scale-95 transition-all block">
                            <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center mx-auto mb-2">
                                <Phone className="w-5 h-5 text-emerald-500" />
                            </div>
                            <p className="text-xs font-semibold text-slate-700 dark:text-white leading-tight">{t('Call', 'அழை')}</p>
                            <p className="text-[10px] text-slate-400">{t('Driver', 'ஓட்டுநர்')}</p>
                        </a>
                    ) : (
                        <Link href="/parent/fees" className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-4 text-center active:scale-95 transition-all block">
                            <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center mx-auto mb-2">
                                <span className="text-emerald-500 font-black text-sm">₹</span>
                            </div>
                            <p className="text-xs font-semibold text-slate-700 dark:text-white leading-tight">{t('Pay', 'செலுத்து')}</p>
                            <p className="text-[10px] text-slate-400">{t('Fees', 'கட்டணம்')}</p>
                        </Link>
                    )}
                </div>

                {/* Today's Activity */}
                {notifications.length > 0 && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
                        <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-3">
                            {t("Today's Activity", 'இன்றைய நடவடிக்கை')}
                        </h2>
                        <div className="space-y-3">
                            {notifications.slice(0, 5).map(notif => (
                                <div key={notif.id} className="flex items-start gap-3">
                                    <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${notif.type === 'alert' ? 'bg-red-400' : notif.type === 'success' ? 'bg-emerald-400' : 'bg-blue-400'}`} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-snug">{notif.message}</p>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            {new Date(notif.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {!loading && !primaryChild && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-8 text-center">
                        <Bus className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                        <p className="text-sm text-slate-500 dark:text-slate-400">{t('No children linked to your account', 'உங்கள் கணக்கில் குழந்தைகள் இணைக்கப்படவில்லை')}</p>
                    </div>
                )}
            </div>

            {/* ── Report Absent Modal ── */}
            {showAbsentModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('Report Absence', 'வராமல் தெரிவிக்கவும்')}</h3>
                            <button onClick={() => setShowAbsentModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4 mb-6">
                                {children.length > 1 && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('Student', 'மாணவர்')}</label>
                                        <select value={absentForm.student_id} onChange={e => setAbsentForm({ ...absentForm, student_id: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[var(--brand)]">
                                            <option value="">{t('Select child', 'குழந்தையை தேர்வு செய்யுங்கள்')}</option>
                                            {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('From', 'இலிருந்து')}</label>
                                        <input type="date" value={absentForm.from_date} min={tomorrow} onChange={e => setAbsentForm({ ...absentForm, from_date: e.target.value, to_date: e.target.value > absentForm.to_date ? e.target.value : absentForm.to_date })} className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[var(--brand)]" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('To', 'வரை')}</label>
                                        <input type="date" value={absentForm.to_date} min={absentForm.from_date || tomorrow} onChange={e => setAbsentForm({ ...absentForm, to_date: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[var(--brand)]" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('Reason', 'காரணம்')}</label>
                                    <textarea value={absentForm.reason} onChange={e => setAbsentForm({ ...absentForm, reason: e.target.value })} placeholder={t('Reason for absence...', 'வராமல் இருப்பதற்கான காரணம்...')} className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] resize-none h-20" />
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setShowAbsentModal(false)} className="flex-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-4 py-2.5 font-semibold text-sm">{t('Cancel', 'ரத்து செய்')}</button>
                                <button onClick={handleReportAbsent} disabled={submitting || !absentForm.reason || !absentForm.from_date || !absentForm.to_date || (children.length > 1 && !absentForm.student_id)} className="flex-1 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm disabled:opacity-50 active:scale-95">
                                    {submitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" /> : t('Submit', 'சமர்ப்பி')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
