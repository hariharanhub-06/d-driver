'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import api from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Backend expects { value, method } — method 'email' looks the user up by email.
      await api.post('/auth/forgot-password', { value: email.trim(), method: 'email' });
    } catch {
      // Silently swallow to prevent email enumeration
    } finally {
      setIsLoading(false);
      setSubmitted(true);
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

        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/onlive-logo.png" alt="Onlive" className="w-14 h-14 rounded-2xl object-contain bg-[#0a0f1e] mb-4 shadow-md" />
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {submitted ? 'Check Your Email' : 'Forgot Password'}
          </h1>
          <p className="text-xs text-slate-400 mt-1 text-center">
            {submitted
              ? 'A reset link has been sent if the account exists.'
              : 'Enter your email to receive a password reset link.'}
          </p>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800 mb-6" />

        {submitted ? (
          <div className="space-y-4">
            <div className="text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl px-4 py-3">
              If this email exists in our system, a reset link has been sent. Please check your inbox and spam folder.
            </div>
            <Link
              href="/login"
              className="w-full bg-green-500 hover:brightness-90 text-white rounded-xl py-3.5 font-bold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg mt-2"
              style={{ boxShadow: '0 8px 24px #22c55e33' }}
            >
              <ArrowLeft size={16} />
              Back to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border-0 border-b-2 border-slate-200 dark:border-slate-700 focus:border-green-500 bg-transparent py-3 text-slate-900 dark:text-white text-sm outline-none transition-colors placeholder:text-slate-300 dark:placeholder:text-slate-600"
                onFocus={e => (e.currentTarget.style.borderBottomColor = '#22c55e')}
                onBlur={e => (e.currentTarget.style.borderBottomColor = '')}
                placeholder="you@school.com"
                required
                autoComplete="email"
              />
            </div>

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
                  Sending…
                </>
              ) : 'Send Reset Link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
