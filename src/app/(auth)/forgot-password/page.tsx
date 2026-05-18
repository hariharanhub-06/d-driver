'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import api from '@/lib/api';
import dynamic from 'next/dynamic';

const BusScene = dynamic(() => import('@/components/ui/BusScene'), { ssr: false });

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
    } catch {
      // Silently swallow to prevent email enumeration
    } finally {
      setIsLoading(false);
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel — animated bus scene only ────────────────── */}
      <div className="hidden lg:block lg:w-[48%] relative overflow-hidden" style={{ backgroundColor: 'var(--brand, #3B82F6)' }}>
        <BusScene fullPanel />
      </div>

      {/* ── Right panel — form ───────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-slate-900 px-6 py-12">
        {/* Mobile logo */}
        <div className="flex items-center gap-2 mb-8 lg:hidden">
          <div className="w-9 h-9 rounded-xl bg-[var(--brand)] flex items-center justify-center">
            <Bus className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-slate-900 dark:text-white text-lg">D-Driver</span>
        </div>

        <div className="w-full max-w-sm">
          {/* Icon */}
          <div className="w-14 h-14 rounded-2xl bg-[var(--brand)] flex items-center justify-center mx-auto mb-6 shadow-lg">
            {submitted ? <CheckCircle className="w-7 h-7 text-white" /> : <Mail className="w-7 h-7 text-white" />}
          </div>

          <h1 className="text-2xl font-bold text-slate-900 dark:text-white text-center mb-1">
            {submitted ? 'Check Your Email' : 'Forgot Password'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-8">
            {submitted
              ? 'A reset link has been sent if the account exists.'
              : 'Enter your email to receive a password reset link.'}
          </p>

          {submitted ? (
            <div className="space-y-4">
              <div className="text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl px-4 py-3">
                If this email exists in our system, a reset link has been sent. Please check your inbox and spam folder.
              </div>
              <Link
                href="/login"
                className="w-full bg-[var(--brand)] hover:opacity-90 text-white rounded-xl py-3 font-semibold text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <ArrowLeft size={16} />
                Back to Login
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5 mb-4">
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors"
                    placeholder="admin@school.com"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[var(--brand)] hover:opacity-90 text-white rounded-xl py-3 font-semibold text-sm transition-all active:scale-95 disabled:opacity-50"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending…
                    </span>
                  ) : 'Send Reset Link'}
                </button>
              </form>
              <div className="mt-6 text-center">
                <Link href="/login" className="text-sm text-[var(--brand)] hover:underline font-medium flex items-center justify-center gap-1">
                  <ArrowLeft size={14} />
                  Back to Login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
