'use client';

import { useState, useEffect } from 'react';
import { Lock, LogOut, Eye, EyeOff, CheckCircle, AlertCircle, ChevronRight, Bus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { ta } from '@/lib/i18n';

interface Child { id: string; name: string; grade?: string; bus?: { bus_number: string }; route?: { name: string }; }

// ── ALL EXISTING LOGIC PRESERVED ──────────────────────────────────────────
export default function ParentProfile() {
    const { user, logout } = useAuth();
    const [cpForm, setCpForm] = useState({ current: '', newPw: '', confirm: '' });
    const [cpError, setCpError] = useState('');
    const [cpSuccess, setCpSuccess] = useState(false);
    const [cpLoading, setCpLoading] = useState(false);
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [children, setChildren] = useState<Child[]>([]);

    useEffect(() => {
        api.get('/students/my-children')
            .then(r => setChildren(Array.isArray(r.data) ? r.data : []))
            .catch(() => {});
    }, []);

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setCpError(''); setCpSuccess(false);
        if (cpForm.newPw !== cpForm.confirm) { setCpError('Passwords do not match'); return; }
        if (cpForm.newPw.length < 8) { setCpError('Minimum 8 characters'); return; }
        setCpLoading(true);
        try {
            await api.post('/auth/change-password', { current_password: cpForm.current, new_password: cpForm.newPw });
            setCpSuccess(true);
            setCpForm({ current: '', newPw: '', confirm: '' });
        } catch (err: any) {
            setCpError(err.response?.data?.error || 'Failed');
        } finally { setCpLoading(false); }
    };

    const initials = (user?.name || 'P').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    const inputCls = "w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors";

    // ─── NEW BILINGUAL UI ────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
            {/* Header with avatar */}
            <div className="bg-[var(--brand)] px-4 pt-10 pb-8 text-center">
                <div className="w-20 h-20 rounded-full bg-white/20 border-4 border-white/40 flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl font-black text-white">{initials}</span>
                </div>
                <h1 className="text-xl font-bold text-white">{user?.name || 'Parent'}</h1>
                <p className="text-white/70 text-sm mt-0.5">Parent / {ta.parent}</p>
                {user?.phone && <p className="text-white/60 text-sm mt-0.5">{user.phone}</p>}
            </div>

            <div className="px-4 py-4 space-y-4">
                {/* My Child */}
                {children.length > 0 && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
                        <h2 className="text-sm font-bold text-slate-700 dark:text-white mb-3">
                            My Child / {ta.myChild}
                        </h2>
                        <div className="space-y-2">
                            {children.map(child => (
                                <div key={child.id} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3">
                                    <div className="w-10 h-10 bg-[var(--brand)]/10 rounded-xl flex items-center justify-center font-bold text-[var(--brand)] shrink-0">
                                        {child.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-slate-900 dark:text-white text-sm">{child.name}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            {child.grade && `Grade ${child.grade}`}{child.bus && ` · Bus ${child.bus.bus_number}`}
                                        </p>
                                        {child.route && <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><Bus className="w-3 h-3" />{child.route.name}</p>}
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Change Password */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
                    <div className="flex items-center gap-2.5 mb-5">
                        <Lock className="w-5 h-5 text-[var(--brand)]" />
                        <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                            Change Password / {ta.changePassword}
                        </h2>
                    </div>
                    <form onSubmit={handleChangePassword} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Current Password</label>
                            <div className="relative">
                                <input type={showCurrent ? 'text' : 'password'} value={cpForm.current} onChange={e => setCpForm(p => ({ ...p, current: e.target.value }))} required className={inputCls + ' pr-10'} placeholder="Enter current password" autoComplete="current-password" />
                                <button type="button" onClick={() => setShowCurrent(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">New Password</label>
                            <div className="relative">
                                <input type={showNew ? 'text' : 'password'} value={cpForm.newPw} onChange={e => setCpForm(p => ({ ...p, newPw: e.target.value }))} required className={inputCls + ' pr-10'} placeholder="Min 8 characters" autoComplete="new-password" />
                                <button type="button" onClick={() => setShowNew(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Confirm New Password</label>
                            <input type="password" value={cpForm.confirm} onChange={e => setCpForm(p => ({ ...p, confirm: e.target.value }))} required className={inputCls} placeholder="Repeat new password" autoComplete="new-password" />
                        </div>
                        {cpError && <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-2.5"><AlertCircle className="w-4 h-4 shrink-0" />{cpError}</div>}
                        {cpSuccess && <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl px-4 py-2.5"><CheckCircle className="w-4 h-4 shrink-0" />Password updated!</div>}
                        <button type="submit" disabled={cpLoading} className="w-full bg-[var(--brand)] hover:opacity-90 text-white rounded-xl py-2.5 font-semibold text-sm disabled:opacity-50 active:scale-95 transition-all">
                            {cpLoading ? 'Updating...' : 'Update Password'}
                        </button>
                    </form>
                </div>

                {/* Settings list */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                    {[
                        { label: 'Notification Preferences', sublabel: ta.notificationPreferences, href: '/parent/notifications' },
                        { label: 'Language / மொழி', sublabel: 'English · தமிழ்', href: '#' },
                        { label: 'Help & Support', sublabel: ta.helpSupport, href: '#' },
                    ].map((item, idx) => (
                        <a key={idx} href={item.href} className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                            <div>
                                <p className="text-sm font-medium text-slate-800 dark:text-white">{item.label}</p>
                                <p className="text-xs text-slate-400 mt-0.5">{item.sublabel}</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                        </a>
                    ))}
                </div>

                {/* Logout */}
                <button onClick={logout} className="w-full flex items-center justify-center gap-2 py-3.5 text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-colors border border-red-200 dark:border-red-900/30 bg-white dark:bg-slate-800">
                    <LogOut className="w-4 h-4" /> Logout / {ta.logout}
                </button>

                <p className="text-center text-slate-400 text-[10px] uppercase tracking-widest py-2">D-Driver v1.0.0</p>
            </div>
        </div>
    );
}
