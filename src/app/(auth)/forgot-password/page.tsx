'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, Smartphone } from 'lucide-react';
import api from '@/lib/api';
import { usePlatformLogo } from '@/lib/usePlatformLogo';

export default function ForgotPasswordPage() {
  const platformLogo = usePlatformLogo();
  const [method, setMethod] = useState<'email' | 'mobile'>('email');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Backend expects { value, method }. For 'mobile' it looks the user up by phone and
      // still emails the reset link to that account's registered email address.
      await api.post('/auth/forgot-password', { value: email.trim(), method });
    } catch {
      // Silently swallow to prevent user enumeration
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
          <img src={platformLogo} alt="Onlive" className="w-24 h-24 rounded-2xl object-contain bg-[#0a0f1e] mb-4 shadow-md" />
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {submitted ? 'Check Your Email' : 'Forgot Password'}
          </h1>
          <p className="text-xs text-slate-400 mt-1 text-center">
            {submitted
              ? 'A reset link has been sent if the account exists.'
              : 'Enter your email or mobile number — we’ll email a reset link to your registered address.'}
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
              className="w-full bg-blue-500 hover:brightness-90 text-white rounded-xl py-3.5 font-bold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg mt-2"
              style={{ boxShadow: '0 8px 24px #3B82F633' }}
            >
              <ArrowLeft size={16} />
              Back to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Method toggle */}
            <div className="grid grid-cols-2 gap-2">
              {([['email', 'Email', Mail], ['mobile', 'Mobile', Smartphone]] as const).map(([key, label, Icon]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => { setMethod(key); setEmail(''); }}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-all ${method === key
                    ? 'border-blue-500 bg-blue-500/10 text-blue-500'
                    : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                    }`}
                >
                  <Icon className="w-4 h-4" /> {label}
                </button>
              ))}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                {method === 'mobile' ? 'Mobile Number' : 'Email Address'}
              </label>
              <input
                type={method === 'mobile' ? 'tel' : 'email'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border-0 border-b-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 bg-transparent py-3 text-slate-900 dark:text-white text-sm outline-none transition-colors placeholder:text-slate-300 dark:placeholder:text-slate-600"
                onFocus={e => (e.currentTarget.style.borderBottomColor = '#3B82F6')}
                onBlur={e => (e.currentTarget.style.borderBottomColor = '')}
                placeholder={method === 'mobile' ? '9876543210' : 'you@school.com'}
                required
                autoComplete={method === 'mobile' ? 'tel' : 'email'}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 text-white font-bold rounded-xl transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg bg-blue-500"
              style={{ boxShadow: '0 8px 24px #3B82F633' }}
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
