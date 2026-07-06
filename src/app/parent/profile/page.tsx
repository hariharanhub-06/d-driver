'use client';

import { useState, useEffect, useRef } from 'react';
import { Lock, LogOut, Eye, EyeOff, CheckCircle, AlertCircle, ChevronRight, Bus, Camera } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { useT, ta } from '@/lib/i18n';

interface Child { id: string; name: string; grade?: string; bus?: { bus_number: string }; route?: { name: string }; }

// ── ALL EXISTING LOGIC PRESERVED ──────────────────────────────────────────
export default function ParentProfile() {
    const { user, logout, refreshUser } = useAuth();
    const t = useT();
    const [cpForm, setCpForm] = useState({ current: '', newPw: '', confirm: '' });
    const [cpError, setCpError] = useState('');
    const [cpSuccess, setCpSuccess] = useState(false);
    const [cpLoading, setCpLoading] = useState(false);
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [children, setChildren] = useState<Child[]>([]);
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [photoUploading, setPhotoUploading] = useState(false);
    const photoInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        api.get('/students/my-children').then(r => setChildren(Array.isArray(r.data) ? r.data : [])).catch(() => {});
        api.get('/users/me').then(r => setPhotoUrl(r.data?.profile_photo_url || null)).catch(() => {});
    }, []);

    const handlePhotoUpload = async (file: File) => {
        setPhotoUploading(true);
        try {
            const fd = new FormData();
            fd.append('photo', file);
            const res = await api.post('/upload/profile-photo', fd, { headers: { 'Content-Type': undefined } });
            setPhotoUrl(res.data.url);
            refreshUser();
        } catch { alert('Photo upload failed'); }
        finally { setPhotoUploading(false); }
    };

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

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
            {/* Header with avatar */}
            <div className="bg-[var(--brand)] px-4 pt-10 pb-8 text-center">
                <div className="relative inline-block mb-3">
                    {photoUrl ? (
                        <img src={photoUrl} alt={t('Profile', 'சுயவிவரம்')} className="w-20 h-20 rounded-full object-cover border-4 border-white/40" />
                    ) : (
                        <div className="w-20 h-20 rounded-full bg-white/20 border-4 border-white/40 flex items-center justify-center">
                            <span className="text-2xl font-black text-white">{initials}</span>
                        </div>
                    )}
                    <button
                        onClick={() => photoInputRef.current?.click()}
                        disabled={photoUploading}
                        className="absolute bottom-0 right-0 w-7 h-7 bg-white rounded-full flex items-center justify-center border-2 border-[var(--brand)] shadow-sm disabled:opacity-50"
                    >
                        {photoUploading ? <div className="w-3 h-3 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin" /> : <Camera className="w-3.5 h-3.5 text-[var(--brand)]" />}
                    </button>
                    <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f); e.target.value = ''; }} />
                </div>
                <h1 className="text-xl font-bold text-white">{user?.name || 'Parent'}</h1>
                <p className="text-white/70 text-sm mt-0.5">{t('Parent', 'பெற்றோர்')}</p>
                {user?.phone && <p className="text-white/60 text-sm mt-0.5">{user.phone}</p>}
            </div>

            <div className="px-4 py-4 space-y-4">
                {/* My Child */}
                {children.length > 0 && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
                        <h2 className="text-sm font-bold text-slate-700 dark:text-white mb-3">
                            {t('My Child', 'என் குழந்தை')}
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
                                            {child.grade && `${t('Grade', 'வகுப்பு')} ${child.grade}`}{child.bus && ` · ${t('Bus', 'பேருந்து')} ${child.bus.bus_number}`}
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
                            {t('Change Password', 'கடவுச்சொல் மாற்று')}
                        </h2>
                    </div>
                    <form onSubmit={handleChangePassword} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('Current Password', 'தற்போதைய கடவுச்சொல்')}</label>
                            <div className="relative">
                                <input type={showCurrent ? 'text' : 'password'} value={cpForm.current} onChange={e => setCpForm(p => ({ ...p, current: e.target.value }))} required className={inputCls + ' pr-10'} placeholder={t('Enter current password', 'தற்போதைய கடவுச்சொல் உள்ளிடு')} autoComplete="current-password" />
                                <button type="button" onClick={() => setShowCurrent(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('New Password', 'புதிய கடவுச்சொல்')}</label>
                            <div className="relative">
                                <input type={showNew ? 'text' : 'password'} value={cpForm.newPw} onChange={e => setCpForm(p => ({ ...p, newPw: e.target.value }))} required className={inputCls + ' pr-10'} placeholder={t('Min 8 characters', 'குறைந்தது 8 எழுத்துகள்')} autoComplete="new-password" />
                                <button type="button" onClick={() => setShowNew(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('Confirm New Password', 'புதிய கடவுச்சொல் உறுதிப்படுத்து')}</label>
                            <input type="password" value={cpForm.confirm} onChange={e => setCpForm(p => ({ ...p, confirm: e.target.value }))} required className={inputCls} placeholder={t('Repeat new password', 'புதிய கடவுச்சொல் மீண்டும் உள்ளிடு')} autoComplete="new-password" />
                        </div>
                        {cpError && <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-2.5"><AlertCircle className="w-4 h-4 shrink-0" />{cpError}</div>}
                        {cpSuccess && <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl px-4 py-2.5"><CheckCircle className="w-4 h-4 shrink-0" />{t('Password updated!', 'கடவுச்சொல் புதுப்பிக்கப்பட்டது!')}</div>}
                        <button type="submit" disabled={cpLoading} className="w-full bg-[var(--brand)] hover:opacity-90 text-white rounded-xl py-2.5 font-semibold text-sm disabled:opacity-50 active:scale-95 transition-all">
                            {cpLoading ? t('Updating...', 'புதுப்பிக்கிறது...') : t('Update Password', 'கடவுச்சொல் புதுப்பி')}
                        </button>
                    </form>
                </div>

                {/* Settings list */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                    {[
                        { label: t('Notification Preferences', 'அறிவிப்பு விருப்பங்கள்'), sublabel: ta.notificationPreferences, href: '/parent/notifications' },
                        { label: t('My Subscription', 'எனது சந்தா'), sublabel: t('Plan & features', 'திட்டம் & அம்சங்கள்'), href: '/parent/subscription' },
                        { label: t('Language', 'மொழி'), sublabel: 'English · தமிழ்', href: '#' },
                        { label: t('Help & Support', 'உதவி & ஆதரவு'), sublabel: ta.helpSupport, href: '#' },
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
                    <LogOut className="w-4 h-4" /> {t('Logout', 'வெளியேறு')}
                </button>

                <p className="text-center text-slate-400 text-[10px] uppercase tracking-widest py-2">Onlive v1.0.0</p>
            </div>
        </div>
    );
}
