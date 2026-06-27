'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { authStorage } from '@/lib/authStorage';

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user, login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) { setError('New passwords do not match.'); return; }
    if (newPassword.length < 8) { setError('New password must be at least 8 characters.'); return; }

    setIsLoading(true);
    try {
      await api.post('/auth/change-password', { current_password: currentPassword, new_password: newPassword });
      const token = authStorage.get('access_token') || '';
      const refreshToken = authStorage.get('refresh_token') || undefined;
      const storedUser = JSON.parse(authStorage.get('user') || 'null');
      const resolvedUser = user || storedUser;
      if (resolvedUser && token) {
        login(token, { ...resolvedUser, is_first_login: false }, refreshToken);
      } else {
        router.push('/login');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to change password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fields = [
    { label: 'Current Password',     autoComplete: 'current-password', value: currentPassword, set: setCurrentPassword, show: showCurrent, toggle: () => setShowCurrent(v => !v), minLen: undefined },
    { label: 'New Password',         autoComplete: 'new-password',     value: newPassword,     set: setNewPassword,     show: showNew,     toggle: () => setShowNew(v => !v),     minLen: 8 },
    { label: 'Confirm New Password', autoComplete: 'new-password',     value: confirmPassword, set: setConfirmPassword, show: showConfirm, toggle: () => setShowConfirm(v => !v), minLen: 8 },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-slate-50 dark:bg-slate-950">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 px-8 py-10 w-full max-w-md mx-auto">

        {/* Logo + heading */}
        <div className="flex flex-col items-center mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/onlive-logo.png" alt="Onlive" className="w-14 h-14 rounded-2xl object-contain bg-[#0a0f1e] mb-4 shadow-md" />
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Set New Password</h1>
          <p className="text-xs text-slate-400 mt-1 text-center">First login — please secure your account</p>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800 mb-6" />

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-600 dark:text-red-400 flex items-center gap-2 mb-5">
            <span className="shrink-0">⚠</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {fields.map(({ label, autoComplete, value, set, show, toggle, minLen }) => (
            <div key={label}>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                {label}
              </label>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  autoComplete={autoComplete}
                  className="w-full border-0 border-b-2 border-slate-200 dark:border-slate-700 bg-transparent py-3 text-slate-900 dark:text-white text-sm outline-none transition-colors placeholder:text-slate-300 dark:placeholder:text-slate-600 pr-10"
                  onFocus={e => (e.currentTarget.style.borderBottomColor = '#22c55e')}
                  onBlur={e => (e.currentTarget.style.borderBottomColor = '')}
                  placeholder="••••••••"
                  required
                  minLength={minLen}
                />
                <button
                  type="button"
                  onClick={toggle}
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                  tabIndex={-1}
                >
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          ))}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 text-white font-bold rounded-xl transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg bg-green-500"
            style={{ boxShadow: '0 8px 24px #22c55e33' }}
            onMouseEnter={e => !isLoading && (e.currentTarget.style.filter = 'brightness(0.9)')}
            onMouseLeave={e => (e.currentTarget.style.filter = '')}
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Updating…
              </>
            ) : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
