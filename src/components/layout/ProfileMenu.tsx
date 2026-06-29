'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, LogOut, ChevronDown, Check, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

// Role → its profile/settings route.
function profileHref(role?: string) {
    switch (role) {
        case 'super_admin': return '/super-admin/settings';
        case 'admin': return '/admin/settings';
        case 'driver': return '/driver/profile';
        case 'bus_staff': return '/bus-staff/profile';
        case 'parent': return '/parent/profile';
        default: return '/';
    }
}

// Top-right avatar button → dropdown with "My Profile" + "Sign Out".
// Reusable across every role layout.
export default function ProfileMenu({ compact = false }: { compact?: boolean }) {
    const { user, logout, login } = useAuth();
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // Parent account/child switching, surfaced right here in the profile menu.
    const [children, setChildren] = useState<{ id: string; name: string; school?: string }[]>([]);
    const [accounts, setAccounts] = useState<{ user_id: string; name: string }[]>([]);
    const [activeChildId, setActiveChildId] = useState<string | null>(null);

    useEffect(() => {
        const onClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        if (open) document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, [open]);

    useEffect(() => {
        if (user?.role !== 'parent') return;
        setActiveChildId(localStorage.getItem('active_child_id'));
        api.get('/students/my-children')
            .then(r => setChildren((Array.isArray(r.data) ? r.data : []).map((c: any) => ({ id: c.id, name: c.name, school: c.school?.name }))))
            .catch(() => {});
        api.get('/auth/linked-accounts')
            .then(r => {
                const list = Array.isArray(r.data) ? r.data : (r.data?.accounts ?? []);
                setAccounts(list.map((a: any) => ({ user_id: a.user_id ?? a.id, name: a.name })));
            })
            .catch(() => {});
    }, [user]);

    const selectChild = (id: string) => {
        localStorage.setItem('active_child_id', id);
        setOpen(false);
        window.location.reload();
    };
    const switchAccount = async (targetId: string) => {
        try {
            const res = await api.post('/auth/switch-account', { target_user_id: targetId });
            localStorage.removeItem('active_child_id');
            login?.(res.data.access_token, res.data.user, res.data.refresh_token);
            setOpen(false);
            window.location.reload();
        } catch { /* ignore */ }
    };
    const showSwitch = user?.role === 'parent' && (children.length > 1 || accounts.length > 0);

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen(o => !o)}
                aria-label="Profile menu"
                className={cn(
                    'flex items-center gap-2 rounded-xl transition-all p-1',
                    open ? 'bg-slate-100 dark:bg-slate-700' : 'hover:bg-slate-100 dark:hover:bg-slate-700/50'
                )}
            >
                <div className="w-9 h-9 rounded-xl bg-[var(--brand)]/10 flex items-center justify-center shrink-0 overflow-hidden">
                    {user?.profile_photo_url
                        ? <img src={user.profile_photo_url} alt={user.name} className="w-full h-full object-cover" />
                        : <User size={17} className="text-[var(--brand)]" />
                    }
                </div>
                {!compact && <ChevronDown size={15} className="text-slate-400" />}
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden z-[100]">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[var(--brand)]/10 flex items-center justify-center text-[var(--brand)] overflow-hidden shrink-0">
                            {user?.profile_photo_url
                                ? <img src={user.profile_photo_url} alt={user?.name} className="w-full h-full object-cover" />
                                : <User size={20} />
                            }
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user?.name || 'User'}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate capitalize">
                                {user?.role?.replace('_', ' ') || ''}
                            </p>
                        </div>
                    </div>
                    <div className="p-2 space-y-0.5">
                        <button
                            onClick={() => { setOpen(false); router.push(profileHref(user?.role)); }}
                            className="w-full text-left px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-[var(--brand)] rounded-xl transition-all flex items-center gap-2"
                        >
                            <User size={15} /> My Profile
                        </button>

                        {showSwitch && (
                            <>
                                <div className="h-px bg-slate-100 dark:bg-slate-700 mx-1 my-1" />
                                <p className="px-3 pt-1 pb-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Switch</p>
                                {children.length > 1 && children.map(c => (
                                    <button
                                        key={c.id}
                                        onClick={() => selectChild(c.id)}
                                        className="w-full text-left px-3 py-2 text-sm rounded-xl transition-all flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-300"
                                    >
                                        <span className="w-6 h-6 rounded-full bg-[var(--brand)]/15 text-[var(--brand)] text-xs font-bold flex items-center justify-center shrink-0">{c.name.charAt(0)}</span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate font-medium">{c.name}</span>
                                            {c.school && <span className="block truncate text-[10px] text-slate-400">{c.school}</span>}
                                        </span>
                                        {activeChildId === c.id && <Check size={14} className="text-[var(--brand)] shrink-0" />}
                                    </button>
                                ))}
                                {accounts.map(a => (
                                    <button
                                        key={a.user_id}
                                        onClick={() => switchAccount(a.user_id)}
                                        className="w-full text-left px-3 py-2 text-sm rounded-xl transition-all flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-300"
                                    >
                                        <Users size={15} className="shrink-0 text-slate-400" />
                                        <span className="truncate">{a.name}</span>
                                    </button>
                                ))}
                            </>
                        )}

                        <div className="h-px bg-slate-100 dark:bg-slate-700 mx-1 my-1" />
                        <button
                            onClick={() => logout?.()}
                            className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all flex items-center gap-2"
                        >
                            <LogOut size={15} /> Sign Out
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
