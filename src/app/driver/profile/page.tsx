'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { Lock, LogOut, Eye, EyeOff, CheckCircle, AlertCircle, ChevronRight, Bus } from 'lucide-react';
import { ta } from '@/lib/i18n';

// ── ALL EXISTING LOGIC PRESERVED — VERBATIM ───────────────────────────────
export default function DriverProfilePage() {
    const { user, logout } = useAuth();
    const [cpForm, setCpForm] = useState({ current: '', newPw: '', confirm: '' });
    const [cpError, setCpError] = useState('');
    const [cpSuccess, setCpSuccess] = useState(false);
    const [cpLoading, setCpLoading] = useState(false);
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [driverInfo, setDriverInfo] = useState<any>(null);

    useEffect(() => {
        api.get('/drivers/me').then(r => setDriverInfo(r.data)).catch(() => {});
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
        } catch (err: any) { setCpError(err.response?.data?.error || 'Failed to update password'); }
        finally { setCpLoading(false); }
    };

    const initials = (user?.name || 'D').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
    const inputCls = "w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[var(--brand)] transition-colors";

    // ─── NEW BILINGUAL UI ────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            {/* Header */}
            <div className="bg-white dark:bg-slate-800 px-4 pt-10 pb-8 text-center">
                <div className="w-20 h-20 rounded-full bg-[var(--brand)]/20 border-4 border-[var(--brand)]/40 flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl font-black text-[var(--brand)]">{initials}</span>
                </div>
                <h1 className="text-xl font-bold text-white">{user?.name}</h1>
                <p className="text-slate-400 text-sm mt-0.5">Driver / {ta.driver}</p>
                {user?.phone && <p className="text-slate-500 text-sm mt-0.5">{user.phone}</p>}
            </div>

            <div className="px-4 py-4 space-y-4">
                {/* My Bus */}
                {driverInfo?.bus && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                        <h2 className="text-sm font-bold text-slate-300 mb-3">{ta.myBus} / My Bus</h2>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-[var(--brand)]/20 rounded-xl flex items-center justify-center">
                                <Bus className="w-6 h-6 text-[var(--brand)]" />
                            </div>
                            <div>
                                <p className="text-white font-black text-lg">{driverInfo.bus.bus_number}</p>
                                {driverInfo.bus.routes?.[0] && <p className="text-slate-400 text-xs">{driverInfo.bus.routes[0].name}</p>}
                                {driverInfo.bus.capacity && <p className="text-slate-500 text-xs">Capacity: {driverInfo.bus.capacity} students</p>}
                            </div>
                        </div>
                    </div>
                )}

                {/* Change Password */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                    <div className="flex items-center gap-2.5 mb-5">
                        <Lock className="w-5 h-5 text-[var(--brand)]" />
                        <h2 className="text-base font-semibold text-white">Change Password / {ta.changePassword}</h2>
                    </div>
                    <form onSubmit={handleChangePassword} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Current Password</label>
                            <div className="relative">
                                <input type={showCurrent ? 'text' : 'password'} value={cpForm.current} onChange={e => setCpForm(p => ({ ...p, current: e.target.value }))} required className={inputCls + ' pr-10'} placeholder="Enter current password" autoComplete="current-password" />
                                <button type="button" onClick={() => setShowCurrent(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">New Password</label>
                            <div className="relative">
                                <input type={showNew ? 'text' : 'password'} value={cpForm.newPw} onChange={e => setCpForm(p => ({ ...p, newPw: e.target.value }))} required className={inputCls + ' pr-10'} placeholder="Min 8 characters" autoComplete="new-password" />
                                <button type="button" onClick={() => setShowNew(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Confirm New Password</label>
                            <input type="password" value={cpForm.confirm} onChange={e => setCpForm(p => ({ ...p, confirm: e.target.value }))} required className={inputCls} placeholder="Repeat new password" autoComplete="new-password" />
                        </div>
                        {cpError && <div className="flex items-center gap-2 text-sm text-red-400 bg-red-900/20 rounded-xl px-4 py-2.5"><AlertCircle className="w-4 h-4 shrink-0" />{cpError}</div>}
                        {cpSuccess && <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-900/20 rounded-xl px-4 py-2.5"><CheckCircle className="w-4 h-4 shrink-0" />Password updated!</div>}
                        <button type="submit" disabled={cpLoading} className="w-full bg-[var(--brand)] hover:opacity-90 text-white rounded-xl py-2.5 font-semibold text-sm disabled:opacity-50 active:scale-95 transition-all">
                            {cpLoading ? 'Updating...' : 'Update Password'}
                        </button>
                    </form>
                </div>

                {/* Settings */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    {[
                        { label: 'Language / மொழி', sub: 'English · தமிழ்', href: '#' },
                        { label: 'Help & Support', sub: ta.helpSupport, href: '#' },
                    ].map((item, idx) => (
                        <a key={idx} href={item.href} className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700 last:border-0 hover:bg-slate-700/50 transition-colors">
                            <div>
                                <p className="text-sm font-medium text-white">{item.label}</p>
                                <p className="text-xs text-slate-400 mt-0.5">{item.sub}</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                        </a>
                    ))}
                </div>

                {/* Logout */}
                <button onClick={logout} className="w-full flex items-center justify-center gap-2 py-3.5 text-sm font-bold text-red-400 border border-red-900/50 bg-red-900/20 hover:bg-red-900/30 rounded-2xl transition-colors active:scale-95">
                    <LogOut className="w-4 h-4" /> Logout / {ta.logout}
                </button>

                <p className="text-center text-slate-600 text-[10px] uppercase tracking-widest py-2">D-Driver v1.0.0</p>
            </div>
        </div>
    );
}
