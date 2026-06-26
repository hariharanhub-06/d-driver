'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, LogOut, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

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
    const { user, logout } = useAuth();
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        if (open) document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, [open]);

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
