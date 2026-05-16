'use client';
import { useState, useEffect } from 'react';
import { ChevronDown, Users } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface LinkedAccount {
  user_id: string;
  name: string;
  students: { name: string; route?: { name: string } }[];
}

export default function AccountSwitcher() {
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [open, setOpen] = useState(false);
  const { user, login } = useAuth();

  useEffect(() => {
    if (user?.role === 'parent') {
      api.get('/auth/linked-accounts')
        .then(r => {
          // Handle both {accounts: [...]} and flat array responses
          const data = r.data;
          const list = Array.isArray(data) ? data : (data?.accounts ?? []);
          // Normalise: backend returns {id, name, children} — map to our interface
          const normalised: LinkedAccount[] = list.map((acc: any) => ({
            user_id: acc.user_id ?? acc.id,
            name: acc.name,
            students: acc.students ?? acc.children ?? [],
          }));
          setAccounts(normalised);
        })
        .catch(() => {});
    }
  }, [user]);

  if (accounts.length === 0) return null;

  const switchTo = async (targetUserId: string) => {
    try {
      const res = await api.post('/auth/switch-account', { target_user_id: targetUserId });
      login(res.data.access_token, res.data.user);
      setOpen(false);
      window.location.reload();
    } catch {
      // silently ignore — user stays on current account
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl text-sm font-semibold"
      >
        <Users className="w-4 h-4" />
        Switch Child
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <>
          {/* backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full mb-2 left-0 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 min-w-[200px] overflow-hidden z-50">
            {accounts.map(acc => (
              <button
                key={acc.user_id}
                onClick={() => switchTo(acc.user_id)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                <p className="font-semibold text-sm text-gray-900 dark:text-white">{acc.name}</p>
                <p className="text-xs text-gray-400">
                  {acc.students.map(s => s.name).join(', ') || 'No children linked'}
                </p>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
