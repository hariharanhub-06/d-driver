'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bus, Eye, EyeOff, Lock } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import dynamic from 'next/dynamic';

const AuthBusPanel = dynamic(() => import('@/components/ui/AuthBusPanel'), { ssr: false });

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
      const token = localStorage.getItem('access_token') || '';
      const refreshToken = localStorage.getItem('refresh_token') || undefined;
      const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
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

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel — animated bus scene only ────────────────── */}
      <div className="hidden lg:block lg:w-[48%] relative overflow-hidden" style={{ backgroundColor: 'var(--brand, #3B82F6)' }}>
        <AuthBusPanel />
      </div>

      {/* ── Right panel ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-slate-900 px-6 py-12">
        <div className="flex items-center gap-2 mb-8 lg:hidden">
          <div className="w-9 h-9 rounded-xl bg-[var(--brand)] flex items-center justify-center">
            <Bus className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-slate-900 dark:text-white text-lg">D-Driver</span>
        </div>

        <div className="w-full max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-[var(--brand)] flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Lock className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white text-center mb-1">Set New Password</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-8">First login — please secure your account</p>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5 mb-4">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { label: 'Current Password',     autoComplete: 'current-password', value: currentPassword, set: setCurrentPassword, show: showCurrent, toggle: () => setShowCurrent(v => !v) },
              { label: 'New Password',         autoComplete: 'new-password',     value: newPassword,     set: setNewPassword,     show: showNew,     toggle: () => setShowNew(v => !v) },
              { label: 'Confirm New Password', autoComplete: 'new-password',     value: confirmPassword, set: setConfirmPassword, show: showConfirm, toggle: () => setShowConfirm(v => !v) },
            ].map(({ label, autoComplete, value, set, show, toggle }) => (
              <div key={label}>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{label}</label>
                <div className="relative">
                  <input
                    type={show ? 'text' : 'password'}
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    autoComplete={autoComplete}
                    className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors pr-10"
                    placeholder="••••••••"
                    required
                    minLength={label === 'Current Password' ? undefined : 8}
                  />
                  <button type="button" onClick={toggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            ))}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[var(--brand)] hover:opacity-90 text-white rounded-xl py-3 font-semibold text-sm transition-all active:scale-95 disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Updating…
                </span>
              ) : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
