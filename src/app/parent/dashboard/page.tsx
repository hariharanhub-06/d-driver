'use client';

import { useState, useEffect } from 'react';
import { Bus, AlertTriangle, MapPin, Phone, Clock, ChevronRight, Navigation } from 'lucide-react';
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
    const [absentForm, setAbsentForm] = useState({ student_id: '', date: new Date().toISOString().split('T')[0], reason: '' });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchAll();
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
        if (!absentForm.student_id || !absentForm.reason) return;
        setSubmitting(true);
        try {
            await api.post('/absence', {
                student_id: absentForm.student_id,
                date: absentForm.date,
                reason: absentForm.reason,
            });
            setShowAbsentModal(false);
            setAbsentForm({ student_id: '', date: new Date().toISOString().split('T')[0], reason: '' });
            alert('Absence reported successfully.');
        } catch (e: any) {
            alert(e.response?.data?.message || 'Failed to report absence');
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusColor = (status?: string) => {
        switch (status?.toLowerCase()) {
            case 'boarding': return 'text-amber-400';
            case 'in transit': return 'text-blue-400';
            case 'at school': return 'text-green-400';
            case 'at home': return 'text-emerald-400';
            default: return 'text-white/40';
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

    const primaryChild = children[0];
    const driverPhone = primaryChild?.driver?.phone;

    return (
        <div className="min-h-full bg-black text-white font-sans relative overflow-hidden pb-8">
            {/* Ambient glow */}
            <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />

            <div className="relative z-10 p-6 pt-8 space-y-6">
                {/* Greeting */}
                <div>
                    <h1 className="text-2xl font-black tracking-tight">Hello, {user?.name.split(' ')[0]}</h1>
                    <p className="text-white/30 font-bold uppercase tracking-widest text-[10px] mt-1">
                        {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
                    </p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-red-400 text-sm font-bold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
                    </div>
                )}

                {/* Hero child status card */}
                {loading ? (
                    <div className="bg-[#121212] rounded-[40px] p-8 border border-white/5 flex justify-center">
                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : primaryChild ? (
                    <div className="bg-[#121212] rounded-[40px] p-8 border border-white/5 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -mr-32 -mt-32" />
                        <div className="relative z-10">
                            <div className="flex items-start justify-between mb-6">
                                <div>
                                    <div className="inline-block px-3 py-1 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest mb-3">
                                        Live Status
                                    </div>
                                    <h3 className="text-3xl font-black tracking-tighter">{primaryChild.name}</h3>
                                    <p className={`text-sm font-bold mt-1 ${getStatusColor(primaryChild.status)}`}>
                                        {primaryChild.status || 'Status unknown'}
                                    </p>
                                </div>
                                <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                                    <Bus className="w-6 h-6 text-white/60" />
                                </div>
                            </div>
                            {primaryChild.bus && (
                                <p className="text-white/40 text-sm font-bold flex items-center gap-2 mb-6">
                                    <Bus className="w-4 h-4 text-blue-400" />
                                    Bus {primaryChild.bus.bus_number}
                                    {primaryChild.driver && <span>· {primaryChild.driver.name}</span>}
                                </p>
                            )}
                            <Link
                                href="/parent/tracking"
                                className="flex items-center justify-center gap-2 bg-white text-black hover:bg-blue-500 hover:text-white transition-all py-3.5 rounded-2xl font-black text-sm shadow-xl active:scale-95"
                            >
                                <Navigation className="w-4 h-4" /> Track Now
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="bg-[#121212] rounded-[40px] p-8 border border-white/5 text-center">
                        <p className="text-white/30 font-bold text-sm">No children linked to your account</p>
                    </div>
                )}

                {/* Multiple children list */}
                {children.length > 1 && (
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-white/40 border-l-4 border-blue-600 pl-3 mb-4">Your Children</h3>
                        <div className="space-y-3">
                            {children.slice(1).map(child => (
                                <div key={child.id} className="bg-[#121212] rounded-3xl p-4 border border-white/5 flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5 font-black text-white/40">
                                        {child.name.charAt(0)}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-black text-white">{child.name}</p>
                                        <p className={`text-xs font-bold ${getStatusColor(child.status)}`}>{child.status || 'Pending'}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Quick actions */}
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => {
                            if (primaryChild) setAbsentForm(prev => ({ ...prev, student_id: primaryChild.id }));
                            setShowAbsentModal(true);
                        }}
                        className="bg-[#121212] rounded-3xl p-5 border border-white/5 hover:border-orange-500/30 transition-all text-left group active:scale-95"
                    >
                        <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center mb-4 border border-orange-500/20">
                            <AlertTriangle className="w-5 h-5 text-orange-400" />
                        </div>
                        <span className="text-xs font-black text-white uppercase tracking-tight">Report Absent</span>
                    </button>

                    <Link href="/parent/request" className="bg-[#121212] rounded-3xl p-5 border border-white/5 hover:border-purple-500/30 transition-all text-left group active:scale-95">
                        <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center mb-4 border border-purple-500/20">
                            <MapPin className="w-5 h-5 text-purple-400" />
                        </div>
                        <span className="text-xs font-black text-white uppercase tracking-tight">Change Stop</span>
                    </Link>

                    <Link href="/parent/tracking" className="bg-[#121212] rounded-3xl p-5 border border-white/5 hover:border-blue-500/30 transition-all text-left group active:scale-95">
                        <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4 border border-blue-500/20">
                            <Navigation className="w-5 h-5 text-blue-400" />
                        </div>
                        <span className="text-xs font-black text-white uppercase tracking-tight">Track Bus</span>
                    </Link>

                    {driverPhone ? (
                        <a href={`tel:${driverPhone}`} className="bg-[#121212] rounded-3xl p-5 border border-white/5 hover:border-green-500/30 transition-all text-left group active:scale-95">
                            <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center mb-4 border border-green-500/20">
                                <Phone className="w-5 h-5 text-green-400" />
                            </div>
                            <span className="text-xs font-black text-white uppercase tracking-tight">Call Driver</span>
                        </a>
                    ) : (
                        <Link href="/parent/fees" className="bg-[#121212] rounded-3xl p-5 border border-white/5 hover:border-emerald-500/30 transition-all text-left group active:scale-95">
                            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4 border border-emerald-500/20">
                                <ChevronRight className="w-5 h-5 text-emerald-400" />
                            </div>
                            <span className="text-xs font-black text-white uppercase tracking-tight">Pay Fees</span>
                        </Link>
                    )}
                </div>

                {/* Activity feed */}
                {notifications.length > 0 && (
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-white/40 border-l-4 border-blue-600 pl-3 mb-4">Today's Activity</h3>
                        <div className="space-y-3">
                            {notifications.map(notif => (
                                <div key={notif.id} className={`bg-[#121212] rounded-3xl p-4 border ${notif.read ? 'border-white/5' : 'border-blue-500/20'} flex items-start gap-4`}>
                                    <div className="text-xl mt-0.5 shrink-0">{getNotifIcon(notif.type)}</div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-black text-white text-sm">{notif.title}</p>
                                        <p className="text-white/40 text-xs mt-0.5 font-medium leading-relaxed">{notif.message}</p>
                                        <p className="text-white/20 text-[10px] font-bold mt-1 flex items-center gap-1 uppercase tracking-widest">
                                            <Clock className="w-3 h-3" />
                                            {new Date(notif.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Report Absent Modal */}
            {showAbsentModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-end justify-center p-4">
                    <div className="bg-[#111] border border-white/10 rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl">
                        <div className="flex items-center gap-3 mb-6">
                            <AlertTriangle className="w-6 h-6 text-orange-400" />
                            <h3 className="text-xl font-black text-white">Report Absence</h3>
                        </div>
                        <div className="space-y-4 mb-6">
                            {children.length > 1 && (
                                <div>
                                    <label className="text-[10px] font-black text-white/30 uppercase tracking-widest block mb-2">Student</label>
                                    <select
                                        value={absentForm.student_id}
                                        onChange={e => setAbsentForm({ ...absentForm, student_id: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold"
                                    >
                                        <option value="">Select child</option>
                                        {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest block mb-2">Date</label>
                                <input
                                    type="date"
                                    value={absentForm.date}
                                    onChange={e => setAbsentForm({ ...absentForm, date: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest block mb-2">Reason</label>
                                <textarea
                                    value={absentForm.reason}
                                    onChange={e => setAbsentForm({ ...absentForm, reason: e.target.value })}
                                    placeholder="Reason for absence..."
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold resize-none h-20"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setShowAbsentModal(false)} className="flex-1 py-4 bg-white/5 text-white/60 rounded-2xl font-bold">Cancel</button>
                            <button
                                onClick={handleReportAbsent}
                                disabled={submitting || !absentForm.reason || (!absentForm.student_id && children.length > 1)}
                                className="flex-1 py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black disabled:opacity-50 active:scale-95 transition-all"
                            >
                                {submitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" /> : 'Submit'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
