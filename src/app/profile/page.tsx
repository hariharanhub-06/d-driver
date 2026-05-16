'use client';

import { useAuth } from '@/context/AuthContext';
import { User, Shield, Key, Bell, AlertCircle, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  school_id?: string;
  is_first_login?: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'School Admin',
  driver: 'Driver',
  parent: 'Parent',
};

interface ToggleItem {
  label: string;
  description: string;
  adminOnly?: boolean;
}

const NOTIFICATION_TOGGLES: ToggleItem[] = [
  { label: 'Bus Approaching', description: 'Get notified when the bus is near your stop' },
  { label: 'Student Boarded', description: 'Know the moment your child boards the bus' },
  { label: 'Fee Reminder', description: 'Reminders for upcoming or overdue fee payments' },
  { label: 'SOS Alerts', description: 'Receive emergency alerts from drivers', adminOnly: true },
];

export default function ProfilePage() {
  const { user: authUser } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/users/me')
      .then(r => setProfile(r.data))
      .catch(() => {
        // Fallback to auth context user data
        if (authUser) setProfile(authUser as UserProfile);
      })
      .finally(() => setLoading(false));
  }, [authUser]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const displayUser = profile || authUser;
  if (!displayUser) return null;

  const roleLabel = ROLE_LABELS[displayUser.role] ?? displayUser.role;
  const initials = displayUser.name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="space-y-6 animate-in max-w-2xl mx-auto p-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Profile</h1>
        <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">Your account information and preferences</p>
      </div>

      {/* Identity card */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-gray-100 dark:border-slate-800 p-8 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="w-20 h-20 shrink-0 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
          <span className="text-2xl font-black text-primary-600 dark:text-primary-400">{initials}</span>
        </div>
        <div className="flex-1 text-center sm:text-left">
          <h2 className="text-xl font-black text-gray-900 dark:text-white">{displayUser.name}</h2>
          <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 border border-primary-100 dark:border-primary-800">
            {roleLabel}
          </span>
        </div>
      </div>

      {/* Profile details — read-only */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-gray-100 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center">
            <User className="w-4 h-4 text-primary-600" />
          </div>
          <h3 className="font-black text-gray-800 dark:text-white text-sm">Account Details</h3>
        </div>

        {[
          { label: 'Full Name', value: displayUser.name },
          { label: 'Email Address', value: displayUser.email },
          { label: 'Phone Number', value: displayUser.phone || '—' },
          { label: 'Role', value: roleLabel },
        ].map(field => (
          <div key={field.label} className="flex flex-col gap-1">
            <span className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">
              {field.label}
            </span>
            <span className="text-sm font-bold text-gray-700 dark:text-slate-300 bg-gray-50 dark:bg-slate-800 px-4 py-2.5 rounded-xl border border-gray-100 dark:border-slate-700">
              {field.value}
            </span>
          </div>
        ))}
      </div>

      {/* Change Password */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-gray-100 dark:border-slate-800 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
              <Key className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="font-black text-gray-800 dark:text-white text-sm">Password</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Keep your account secure</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/change-password')}
            className="px-4 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-primary-50 dark:hover:bg-primary-900/20 text-gray-700 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 text-xs font-black rounded-xl transition-all"
          >
            Change
          </button>
        </div>
      </div>

      {/* Notification Preferences — coming soon */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-gray-100 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
            <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-black text-gray-800 dark:text-white text-sm">Notification Preferences</h3>
          </div>
        </div>

        {/* Coming soon banner */}
        <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-2xl p-4">
          <AlertCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-600 dark:text-blue-400 font-bold leading-relaxed">
            Email notifications coming soon — currently all alerts are in-app only
          </p>
        </div>

        {/* Disabled toggles */}
        <div className="space-y-3">
          {NOTIFICATION_TOGGLES.filter(t => !t.adminOnly || displayUser.role === 'admin' || displayUser.role === 'super_admin').map(toggle => (
            <div
              key={toggle.label}
              className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700 opacity-50"
            >
              <div className="flex-1 min-w-0 pr-4">
                <p className="text-sm font-bold text-gray-700 dark:text-slate-300">{toggle.label}</p>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{toggle.description}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-black text-gray-300 dark:text-slate-600 uppercase tracking-widest">
                  Soon
                </span>
                {/* Fake disabled toggle */}
                <div className="w-10 h-5 bg-gray-200 dark:bg-slate-700 rounded-full relative cursor-not-allowed">
                  <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white dark:bg-slate-500 rounded-full shadow-sm" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Security note */}
      <div className="flex items-center gap-2 justify-center pb-4">
        <Shield className="w-3.5 h-3.5 text-gray-300 dark:text-slate-600" />
        <p className="text-[10px] text-gray-300 dark:text-slate-600 font-bold uppercase tracking-widest">
          D-Driver v1.0 · All data encrypted
        </p>
      </div>
    </div>
  );
}
