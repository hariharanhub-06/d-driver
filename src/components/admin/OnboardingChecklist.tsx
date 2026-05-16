'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, Circle, X, Bus, Map, MapPin, User, GraduationCap } from 'lucide-react';
import api from '@/lib/api';
import Link from 'next/link';

interface Step {
  id: number;
  label: string;
  icon: React.ElementType;
  href: string;
  checkKey: string;
}

const STEPS: Step[] = [
  { id: 1, label: 'Add your first bus', icon: Bus, href: '/admin/buses', checkKey: 'buses' },
  { id: 2, label: 'Create a route', icon: Map, href: '/admin/routes', checkKey: 'routes' },
  { id: 3, label: 'Add stops to your route', icon: MapPin, href: '/admin/stops', checkKey: 'stops' },
  { id: 4, label: 'Add a driver', icon: User, href: '/admin/drivers', checkKey: 'drivers' },
  { id: 5, label: 'Enroll your first student', icon: GraduationCap, href: '/admin/students', checkKey: 'students' },
];

interface Props {
  schoolData: any;
}

export default function OnboardingChecklist({ schoolData }: Props) {
  const [stats, setStats] = useState<Record<string, number>>({});
  const [dismissed, setDismissed] = useState<boolean>(schoolData?.onboarding_dismissed ?? false);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    if (dismissed) return;
    Promise.allSettled([
      api.get('/buses').then(r => ({ buses: Array.isArray(r.data) ? r.data.length : 0 })),
      api.get('/routes').then(r => ({ routes: Array.isArray(r.data) ? r.data.length : 0 })),
      api.get('/stops').then(r => ({ stops: Array.isArray(r.data) ? r.data.length : 0 })),
      api.get('/drivers').then(r => ({ drivers: Array.isArray(r.data) ? r.data.length : 0 })),
      api.get('/students').then(r => ({ students: Array.isArray(r.data) ? r.data.length : 0 })),
    ]).then(results => {
      const merged: Record<string, number> = {};
      results.forEach(r => {
        if (r.status === 'fulfilled') Object.assign(merged, r.value);
      });
      setStats(merged);
    });
  }, [dismissed]);

  if (dismissed) return null;

  const completed = STEPS.filter(s => (stats[s.checkKey] ?? 0) > 0).length;

  const handleDismiss = async () => {
    setDismissing(true);
    try {
      await api.post('/schools/my/dismiss-onboarding');
    } catch {
      // If the API fails, still dismiss locally so it doesn't block the UI
    } finally {
      setDismissed(true);
      setDismissing(false);
    }
  };

  if (completed === STEPS.length) return null; // all done — no need to show

  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 mb-6 text-white relative overflow-hidden">
      {/* Subtle glow */}
      <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/5 rounded-full blur-xl pointer-events-none" />

      <button
        onClick={handleDismiss}
        disabled={dismissing}
        aria-label="Dismiss checklist"
        className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors disabled:opacity-50"
      >
        <X className="w-5 h-5" />
      </button>

      <h3 className="font-bold text-lg mb-1">Setup Checklist ({completed}/{STEPS.length})</h3>
      <p className="text-blue-100 text-sm mb-4">Complete these steps to get your school running</p>

      {/* Progress bar */}
      <div className="h-2 bg-white/20 rounded-full mb-5">
        <div
          className="h-full bg-white rounded-full transition-all duration-700"
          style={{ width: `${(completed / STEPS.length) * 100}%` }}
        />
      </div>

      <div className="space-y-1.5">
        {STEPS.map(step => {
          const done = (stats[step.checkKey] ?? 0) > 0;
          return (
            <Link
              key={step.id}
              href={step.href}
              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/10 transition-colors group"
            >
              {done ? (
                <CheckCircle className="w-5 h-5 text-green-300 shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-white/40 shrink-0" />
              )}
              <step.icon className={`w-4 h-4 shrink-0 ${done ? 'text-green-200' : 'text-white/60'}`} />
              <span className={`text-sm font-medium flex-1 ${done ? 'line-through text-white/50' : 'text-white group-hover:text-blue-100'}`}>
                {step.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
