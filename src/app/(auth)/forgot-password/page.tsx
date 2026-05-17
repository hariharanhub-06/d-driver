'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bus, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import api from '@/lib/api';

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
      // Silently swallow errors to prevent email enumeration
    } finally {
      setIsLoading(false);
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 w-full max-w-md p-8">
        {/* Brand logo */}
        <div className="w-12 h-12 rounded-2xl bg-[var(--brand)] flex items-center justify-center mx-auto mb-6">
          {submitted ? (
            <CheckCircle className="w-6 h-6 text-white" />
          ) : (
            <Mail className="w-6 h-6 text-white" />
          )}
        </div>

        <h1 className="text-2xl font-bold text-slate-900 dark:text-white text-center mb-1">
          {submitted ? 'Check Your Email' : 'Forgot Password'}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6">
          {submitted ? 'A reset link has been sent if the account exists.' : 'Enter your email to receive a reset link.'}
        </p>

        {submitted ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl px-4 py-2.5">
              If this email exists, a reset link has been sent. Please check your inbox and spam folder.
            </div>
            <Link
              href="/login"
              className="w-full bg-[var(--brand)] hover:opacity-90 text-white rounded-xl py-2.5 font-semibold text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <ArrowLeft size={16} />
              Back to Login
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-2.5 mb-4">
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
                  className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors"
                  placeholder="admin@school.com"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[var(--brand)] hover:opacity-90 text-white rounded-xl py-2.5 font-semibold text-sm transition-all active:scale-95 disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Sending…
                  </span>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="text-sm text-[var(--brand)] hover:underline font-medium flex items-center justify-center gap-1"
              >
                <ArrowLeft size={14} />
                Back to Login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
