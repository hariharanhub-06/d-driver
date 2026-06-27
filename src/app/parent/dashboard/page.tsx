'use client';

import { useState, useEffect } from 'react';
import { Bus, AlertTriangle, MapPin, Phone, X, Navigation, User2, GraduationCap } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useSchoolBranding } from '@/context/SchoolBrandingContext';
import api from '@/lib/api';
import { useT, ta } from '@/lib/i18n';
import LiveTrackingMap from '@/components/parent/LiveTrackingMap';
import StopTimeline from '@/components/parent/StopTimeline';
import { getSocket } from '@/lib/socket';
import { stopsForTrip } from '@/lib/tracking';

interface Child {
    id: string;
    name: string;
    grade?: string;
    section?: string;
    status?: string;
    route_id?: string;
    // Real shape from GET /students/my-children — bus + driver are nested under route.bus.
    route?: {
        id: string;
        name: string;
        bus_id?: string;
        bus?: { id?: string; bus_number?: string; drivers?: { user?: { name?: string; phone?: string } }[] };
    };
    stop?: { id: string; name: string; pickup_time?: string };
}

interface Notification {
    id: string;
    title: string;
    message: string;
    type: string;
    created_at: string;
    read: boolean;
}

// A single labelled row in the Trip Details card.
function DetailRow({ icon, label, value, action }: { icon: React.ReactNode; label: string; value: string; action?: React.ReactNode }) {
    return (
        <div className="flex items-center gap-3 py-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 flex items-center justify-center shrink-0">
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-none mb-1 uppercase tracking-wide">{label}</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{value}</p>
            </div>
            {action}
        </div>
    );
}

// ── ALL EXISTING LOGIC PRESERVED ──────────────────────────────────────────
export default function ParentDashboard() {
    const { user } = useAuth();
    const t = useT();
    const branding = useSchoolBranding();
    const canTrack = !branding.permissions || (branding.permissions as any).gps_tracking !== false;
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
    const [progress, setProgress] = useState<{ current_stop_index: number; status: string; trip_type?: string | null; students_onboard: number; students_total: number } | null>(null);

    useEffect(() => {
        fetchAll();
        const stored = localStorage.getItem('active_child_id');
        if (stored) setActiveChildId(stored);
    }, []);

    // Live trip progress for the stop timeline — poll + refresh on trip socket events.
    useEffect(() => {
        const pc = (activeChildId ? children.find(c => c.id === activeChildId) : null) || children[0];
        const routeId = pc?.route?.id;
        if (!routeId) { setProgress(null); return; }
        let cancelled = false;
        const load = async () => {
            try { const { data } = await api.get(`/trips/progress/${routeId}`); if (!cancelled) setProgress(data); }
            catch { if (!cancelled) setProgress(null); }
        };
        load();
        const interval = setInterval(load, 12000);
        const s = getSocket();
        s.on('bus-arrived-stop', load);
        s.on('trip-started', load);
        s.on('trip-completed', load);
        return () => {
            cancelled = true;
            clearInterval(interval);
            s.off('bus-arrived-stop', load);
            s.off('trip-started', load);
            s.off('trip-completed', load);
        };
    }, [activeChildId, children]);

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
    // Accessors for the real nested API shape (route.bus.*).
    const driverUser = primaryChild?.route?.bus?.drivers?.[0]?.user;
    const driverName = driverUser?.name;
    const driverPhone = driverUser?.phone;
    const busNumber = primaryChild?.route?.bus?.bus_number;
    const routeName = primaryChild?.route?.name;
    const stopName = primaryChild?.stop?.name;
    const hour = new Date().getHours();
    const greeting = hour < 12 ? '🌅' : hour < 17 ? '☀️' : '🌙';

    return (
        <div className="min-h-full bg-slate-100 dark:bg-slate-900">
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

                {/* Bus card inside header */}
                {!loading && busNumber && (
                    <div className="mt-4 bg-white/15 backdrop-blur-sm rounded-2xl p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                    <Bus className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <p className="text-white font-bold text-base">{busNumber}</p>
                                    <p className="text-white/70 text-xs">{routeName || t('Route', 'வழி')}</p>
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

                {/* Live map embedded directly on the dashboard */}
                {!loading && primaryChild && canTrack && (
                    <LiveTrackingMap child={primaryChild as any} heightClass="h-72" />
                )}

                {/* Bus stops timeline — passed / current / upcoming based on the live trip */}
                {!loading && primaryChild && canTrack && ((primaryChild.route as any)?.stops?.length > 0) && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
                        <StopTimeline
                            stops={stopsForTrip((primaryChild.route as any).stops, progress?.trip_type)}
                            currentStopIndex={progress?.current_stop_index ?? 0}
                            myStopId={primaryChild.stop?.id}
                            status={progress?.status || 'idle'}
                        />
                    </div>
                )}

                {/* Trip details card — the core requested fields */}
                {!loading && primaryChild && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-sm font-bold text-slate-800 dark:text-white">
                                {t('Trip Details', 'பயண விவரங்கள்')}
                            </h2>
                            <Link href="/parent/tracking" className="text-xs font-bold text-[var(--brand)] flex items-center gap-1 active:scale-95 transition-all">
                                <Navigation className="w-3 h-3" /> {t('Live Track', 'நேரடி கண்காணிப்பு')}
                            </Link>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-700">
                            <DetailRow icon={<User2 className="w-4 h-4" />} label={t('Parent', 'பெற்றோர்')} value={user?.name || '—'} />
                            <DetailRow icon={<GraduationCap className="w-4 h-4" />} label={t('Student', 'மாணவர்')} value={primaryChild.name + (primaryChild.grade ? ` · ${primaryChild.grade}${primaryChild.section ? '-' + primaryChild.section : ''}` : '')} />
                            <DetailRow icon={<Bus className="w-4 h-4" />} label={t('Bus No', 'பேருந்து எண்')} value={busNumber || t('Not assigned', 'ஒதுக்கப்படவில்லை')} />
                            <DetailRow icon={<Navigation className="w-4 h-4" />} label={t('Route', 'வழி')} value={routeName || '—'} />
                            <DetailRow icon={<MapPin className="w-4 h-4" />} label={t('Stop', 'நிறுத்தம்')} value={stopName ? stopName + (primaryChild.stop?.pickup_time ? ` · ${primaryChild.stop.pickup_time}` : '') : '—'} />
                            <DetailRow
                                icon={<Phone className="w-4 h-4" />}
                                label={t('Driver', 'ஓட்டுநர்')}
                                value={driverName || t('Not assigned', 'ஒதுக்கப்படவில்லை')}
                                action={driverPhone ? (
                                    <a href={`tel:${driverPhone}`} className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-all">
                                        <Phone className="w-3 h-3" /> {t('Call', 'அழை')}
                                    </a>
                                ) : undefined}
                            />
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
