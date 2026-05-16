'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, ShieldCheck, ArrowRight } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  const getDashboardRoute = (role?: string) => {
    switch (role) {
      case 'super_admin': return '/super-admin/dashboard';
      case 'driver': return '/driver/dashboard';
      case 'parent': return '/parent/dashboard';
      default: return '/admin/dashboard';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }

    setIsLoading(true);
    try {
      await api.put('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      router.push(getDashboardRoute(user?.role));
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to change password. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
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
              <Lock className="w-8 h-8 text-black" strokeWidth={1.5} />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tighter mb-1">
              Set New Password
            </h1>
            <p className="text-white/40 text-[9px] font-black uppercase tracking-[0.3em]">
              First Login — Secure Your Account
            </p>
          </div>

          <div className="p-8 pt-2">
            {error && (
              <div className="bg-red-500/10 text-red-400 border border-red-500/20 p-3 rounded-2xl text-[10px] font-bold mb-4 text-center animate-in flex items-center justify-center gap-2">
                <ShieldCheck className="w-3 h-3" /> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
              {/* Current Password */}
              <div className="space-y-2">
                <label className="block text-[9px] font-black text-white/40 uppercase tracking-widest ml-1">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-5 py-3.5 rounded-[18px] border border-white/10 bg-white/5 text-white placeholder:text-white/20 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-lg font-bold"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors"
                  >
                    {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-2">
                <label className="block text-[9px] font-black text-white/40 uppercase tracking-widest ml-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-5 py-3.5 rounded-[18px] border border-white/10 bg-white/5 text-white placeholder:text-white/20 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-lg font-bold"
                    placeholder="••••••••"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors"
                  >
                    {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <label className="block text-[9px] font-black text-white/40 uppercase tracking-widest ml-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-5 py-3.5 rounded-[18px] border border-white/10 bg-white/5 text-white placeholder:text-white/20 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-lg font-bold"
                    placeholder="••••••••"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors"
                  >
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
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
                    Update Password
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                )}
              </button>
            </form>

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
