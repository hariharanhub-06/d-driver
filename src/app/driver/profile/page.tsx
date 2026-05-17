'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { User, Lock, LogOut, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';

export default function DriverProfilePage() {
    const { user, logout } = useAuth();
    const [cpForm, setCpForm] = useState({ current: '', newPw: '', confirm: '' });
    const [cpError, setCpError] = useState('');
    const [cpSuccess, setCpSuccess] = useState(false);
    const [cpLoading, setCpLoading] = useState(false);
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);

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
            setCpError(err.response?.data?.error || 'Failed to update password');
        } finally { setCpLoading(false); }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 sm:p-6">
            <div className="max-w-lg mx-auto space-y-5">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Profile</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your account</p>
                </div>

                {/* Profile card */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-[var(--brand)]/10 flex items-center justify-center shrink-0">
                            <User className="w-7 h-7 text-[var(--brand)]" />
                        </div>
                        <div>
                            <p className="text-lg font-bold text-slate-900 dark:text-white">{user?.name}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{user?.email}</p>
                            <span className="inline-flex items-center mt-1 bg-[var(--brand)]/10 text-[var(--brand)] rounded-full px-2.5 py-0.5 text-xs font-medium">Driver</span>
                        </div>
                    </div>
                </div>

                {/* Change password card */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
                    <div className="flex items-center gap-2.5 mb-5">
                        <Lock className="w-5 h-5 text-[var(--brand)]" />
                        <h2 className="text-base font-semibold text-slate-900 dark:text-white">Change Password</h2>
                    </div>
                    <form onSubmit={handleChangePassword} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Current Password</label>
                            <div className="relative">
                                <input type={showCurrent ? 'text' : 'password'} value={cpForm.current} onChange={e => setCpForm(p => ({ ...p, current: e.target.value }))} required className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors pr-10" placeholder="Enter current password" />
                                <button type="button" onClick={() => setShowCurrent(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">{showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">New Password</label>
                            <div className="relative">
                                <input type={showNew ? 'text' : 'password'} value={cpForm.newPw} onChange={e => setCpForm(p => ({ ...p, newPw: e.target.value }))} required className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors pr-10" placeholder="Min 8 characters" />
                                <button type="button" onClick={() => setShowNew(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">{showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Confirm New Password</label>
                            <input type="password" value={cpForm.confirm} onChange={e => setCpForm(p => ({ ...p, confirm: e.target.value }))} required className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors" placeholder="Repeat new password" />
                        </div>
                        {cpError && <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-2.5"><AlertCircle className="w-4 h-4 shrink-0" />{cpError}</div>}
                        {cpSuccess && <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl px-4 py-2.5"><CheckCircle className="w-4 h-4 shrink-0" />Password updated successfully!</div>}
                        <button type="submit" disabled={cpLoading} className="w-full bg-[var(--brand)] hover:opacity-90 text-white rounded-xl py-2.5 font-semibold text-sm disabled:opacity-50 transition-all active:scale-95">
                            {cpLoading ? 'Updating...' : 'Update Password'}
                        </button>
                    </form>
                </div>

                {/* Logout */}
                <button onClick={logout} className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors border border-red-200 dark:border-red-900/30 bg-white dark:bg-slate-800">
                    <LogOut className="w-4 h-4" />Logout
                </button>
            </div>
        </div>
    );
}
