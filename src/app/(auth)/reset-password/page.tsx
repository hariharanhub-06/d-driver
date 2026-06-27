'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';

function ResetPasswordContent() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const t = searchParams.get('token') || '';
    if (!t) setError('Invalid or missing reset token. Please request a new reset link.');
    setToken(t);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!token) { setError('Invalid or missing reset token. Please request a new reset link.'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (newPassword.length < 8) { setError('Password must be at least 8 characters.'); return; }

    setIsLoading(true);
    try {
      await api.post('/auth/reset-password', { token, new_password: newPassword });
      router.push('/login');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-md mx-auto mb-4">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 px-8 py-10 w-full max-w-md mx-auto">

        {/* Logo + heading */}
        <div className="flex flex-col items-center mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/onlive-logo.png" alt="Onlive" className="w-14 h-14 rounded-2xl object-contain bg-[#0a0f1e] mb-4 shadow-md" />
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Reset Password</h1>
          <p className="text-xs text-slate-400 mt-1 text-center">Create a new secure password for your account</p>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800 mb-6" />

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-600 dark:text-red-400 flex items-center gap-2 mb-5">
            <span className="shrink-0">⚠</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full border-0 border-b-2 border-slate-200 dark:border-slate-700 bg-transparent py-3 text-slate-900 dark:text-white text-sm outline-none transition-colors placeholder:text-slate-300 dark:placeholder:text-slate-600 pr-10"
                onFocus={e => (e.currentTarget.style.borderBottomColor = '#22c55e')}
                onBlur={e => (e.currentTarget.style.borderBottomColor = '')}
                placeholder="••••••••"
                required
                minLength={8}
                disabled={!token}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                tabIndex={-1}
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full border-0 border-b-2 border-slate-200 dark:border-slate-700 bg-transparent py-3 text-slate-900 dark:text-white text-sm outline-none transition-colors placeholder:text-slate-300 dark:placeholder:text-slate-600 pr-10"
                onFocus={e => (e.currentTarget.style.borderBottomColor = '#22c55e')}
                onBlur={e => (e.currentTarget.style.borderBottomColor = '')}
                placeholder="••••••••"
                required
                minLength={8}
                disabled={!token}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !token}
            className="w-full py-3.5 text-white font-bold rounded-xl transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg bg-green-500"
            style={{ boxShadow: '0 8px 24px #22c55e33' }}
            onMouseEnter={e => !isLoading && (e.currentTarget.style.filter = 'brightness(0.9)')}
            onMouseLeave={e => (e.currentTarget.style.filter = '')}
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Resetting…
              </>
            ) : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-8 h-8 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
