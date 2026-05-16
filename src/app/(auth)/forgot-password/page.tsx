'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';
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
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Ambient Background Glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-600/10 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-600/5 blur-[120px] rounded-full"></div>

      <div className="max-w-[420px] w-full z-10 animate-in">
        <div className="bg-[#121212] rounded-[32px] shadow-2xl overflow-hidden border border-white/5 relative">
          {/* Header */}
          <div className="p-6 pt-8 text-center relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-20"></div>
            <div className="w-16 h-16 bg-white rounded-2xl mx-auto flex items-center justify-center shadow-2xl mb-4 border border-white/10 p-3">
              {submitted ? (
                <CheckCircle className="w-8 h-8 text-green-500" strokeWidth={1.5} />
              ) : (
                <Mail className="w-8 h-8 text-black" strokeWidth={1.5} />
              )}
            </div>
            <h1 className="text-2xl font-black text-white tracking-tighter mb-1">
              {submitted ? 'Check Your Email' : 'Forgot Password'}
            </h1>
            <p className="text-white/40 text-[9px] font-black uppercase tracking-[0.3em]">
              {submitted ? 'Reset Link Sent' : 'Account Recovery'}
            </p>
          </div>

          <div className="p-8 pt-2">
            {submitted ? (
              <div className="space-y-6 text-center">
                <div className="bg-green-500/10 text-green-400 border border-green-500/20 p-4 rounded-2xl text-sm font-medium">
                  If this email exists, a reset link has been sent.
                  <br />
                  <span className="text-green-400/70 text-xs">Please check your inbox and spam folder.</span>
                </div>
                <Link
                  href="/login"
                  className="w-full bg-white hover:bg-white/90 text-black font-black py-4 px-6 rounded-[18px] transition-all flex justify-center items-center h-[56px] text-base active:scale-[0.98] shadow-2xl group"
                >
                  <ArrowLeft className="mr-2 w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                  Back to Login
                </Link>
              </div>
            ) : (
              <>
                {error && (
                  <div className="bg-red-500/10 text-red-400 border border-red-500/20 p-3 rounded-2xl text-[10px] font-bold mb-4 text-center animate-in">
                    {error}
                  </div>
                )}

                <p className="text-white/40 text-xs text-center mb-6">
                  Enter the email address associated with your account and we&apos;ll send you a reset link.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
                  <div className="space-y-2">
                    <label className="block text-[9px] font-black text-white/40 uppercase tracking-widest ml-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-5 py-3.5 rounded-[18px] border border-white/10 bg-white/5 text-white placeholder:text-white/20 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-lg font-bold"
                      placeholder="admin@school.com"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-white hover:bg-white/90 text-black font-black py-4 px-6 rounded-[18px] transition-all flex justify-center items-center h-[56px] text-lg active:scale-[0.98] shadow-2xl overflow-hidden group mt-4"
                  >
                    {isLoading ? (
                      <div className="w-6 h-6 border-4 border-black/10 border-t-black rounded-full animate-spin"></div>
                    ) : (
                      <span className="flex items-center">
                        Send Reset Link
                        <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </span>
                    )}
                  </button>
                </form>

                <div className="mt-6 text-center relative z-10">
                  <Link
                    href="/login"
                    className="text-white/30 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-1"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    Back to Login
                  </Link>
                </div>
              </>
            )}

            <div className="mt-6 text-center border-t border-white/5 pt-5 relative z-10">
              <p className="text-white/20 text-[9px] font-black uppercase tracking-[0.4em]">
                &copy; 2025 D-Driver Portal
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
