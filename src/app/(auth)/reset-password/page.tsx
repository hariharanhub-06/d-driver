'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Bus, Eye, EyeOff, KeyRound } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import dynamic from 'next/dynamic';

const AuthBusPanel = dynamic(() => import('@/components/ui/AuthBusPanel'), { ssr: false });

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
            <KeyRound className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white text-center mb-1">Reset Password</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-8">Create a new secure password for your account</p>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5 mb-4">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">New Password</label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors pr-10"
                  placeholder="••••••••"
                  required
                  minLength={8}
                  disabled={!token}
                />
                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors pr-10"
                  placeholder="••••••••"
                  required
                  minLength={8}
                  disabled={!token}
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading || !token}
              className="w-full bg-[var(--brand)] hover:opacity-90 text-white rounded-xl py-3 font-semibold text-sm transition-all active:scale-95 disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Resetting…
                </span>
              ) : 'Reset Password'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/login" className="text-sm text-[var(--brand)] hover:underline font-medium">Back to Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[var(--brand)]/30 border-t-[var(--brand)] rounded-full animate-spin" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
