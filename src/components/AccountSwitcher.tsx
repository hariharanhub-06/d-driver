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

interface Child {
  id: string;
  name: string;
  school?: string;
}

export default function AccountSwitcher() {
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const { user, login } = useAuth();

  useEffect(() => {
    if (user?.role !== 'parent') return;
    const stored = localStorage.getItem('active_child_id');
    if (stored) setActiveChildId(stored);

    api.get('/auth/linked-accounts')
      .then(r => {
        const data = r.data;
        const list = Array.isArray(data) ? data : (data?.accounts ?? []);
        const normalised: LinkedAccount[] = list.map((acc: any) => ({
          user_id: acc.user_id ?? acc.id,
          name: acc.name,
          students: acc.students ?? acc.children ?? [],
        }));
        setAccounts(normalised);
      })
      .catch(() => {});

    api.get('/students/my-children')
      .then(r => {
        const list = Array.isArray(r.data) ? r.data : [];
        setChildren(list.map((c: any) => ({ id: c.id, name: c.name, school: c.school?.name })));
      })
      .catch(() => {});
  }, [user]);

  const hasLinkedAccounts = accounts.length > 0;
  const hasMultipleChildren = children.length > 1;

  if (!hasLinkedAccounts && !hasMultipleChildren) return null;

  const switchToAccount = async (targetUserId: string) => {
    try {
      const res = await api.post('/auth/switch-account', { target_user_id: targetUserId });
      localStorage.removeItem('active_child_id');
      login(res.data.access_token, res.data.user, res.data.refresh_token);
      setOpen(false);
      window.location.reload();
    } catch { /* silently ignore */ }
  };

  const selectChild = (childId: string) => {
    localStorage.setItem('active_child_id', childId);
    setActiveChildId(childId);
    setOpen(false);
    window.location.reload();
  };

  const activeChild = children.find(c => c.id === activeChildId);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2.5 py-1.5 rounded-lg font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
      >
        <Users className="w-3.5 h-3.5" />
        Switch
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full mb-2 left-0 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 min-w-[200px] overflow-hidden z-50">
            {hasMultipleChildren && (
              <>
                <p className="px-3 pt-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Your Children</p>
                {children.map(child => (
                  <button
                    key={child.id}
                    onClick={() => selectChild(child.id)}
                    className={`w-full text-left px-4 py-2.5 transition-colors flex items-center gap-2 ${
                      activeChildId === child.id
                        ? 'bg-[var(--brand)]/10 text-[var(--brand)]'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full bg-[var(--brand)]/20 flex items-center justify-center text-[var(--brand)] font-bold text-xs shrink-0">
                      {child.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-semibold block truncate">{child.name}</span>
                      {child.school && <span className="text-[10px] text-slate-400 block truncate">{child.school}</span>}
                    </div>
                    {activeChildId === child.id && <span className="ml-auto text-[10px] font-bold shrink-0">Active</span>}
                  </button>
                ))}
              </>
            )}

            {hasLinkedAccounts && (
              <>
                <p className="px-3 pt-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Other Accounts</p>
                {accounts.map(acc => (
                  <button
                    key={acc.user_id}
                    onClick={() => switchToAccount(acc.user_id)}
                    className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <p className="font-semibold text-sm text-slate-900 dark:text-white">{acc.name}</p>
                    <p className="text-xs text-slate-400">
                      {acc.students.map(s => s.name).join(', ') || 'No children linked'}
                    </p>
                  </button>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
