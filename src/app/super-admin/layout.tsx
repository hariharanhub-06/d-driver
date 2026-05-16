'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard, Building2, CreditCard, TrendingUp,
    Receipt, Users, Settings, Bus, LogOut, Menu, X, HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { TourProvider, useTour } from '@/components/tour/TourProvider';
import SuperAdminTour from '@/components/tour/SuperAdminTour';

const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/super-admin/dashboard', tourKey: undefined },
    { icon: Building2,       label: 'Schools',   href: '/super-admin/schools',   tourKey: 'sa-schools' },
    { icon: CreditCard,      label: 'Billing',   href: '/super-admin/billing',   tourKey: 'sa-billing' },
    { icon: TrendingUp,      label: 'Revenue',   href: '/super-admin/revenue',   tourKey: 'sa-revenue' },
    { icon: Receipt,         label: 'Expenses',  href: '/super-admin/expenses',  tourKey: 'sa-expenses' },
    { icon: Users,           label: 'SA Users',  href: '/super-admin/users',     tourKey: undefined },
    { icon: Settings,        label: 'Settings',  href: '/super-admin/settings',  tourKey: 'sa-settings' },
];

function SuperAdminLayoutInner({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const { startTour } = useTour();
    const [mobileOpen, setMobileOpen] = useState(false);

    const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
        <aside className={cn(
            'flex flex-col bg-[#0d1117] border-r border-white/5 h-full',
            mobile ? 'w-full' : 'w-64 shrink-0'
        )}>
            {/* Logo */}
            <div className="h-14 flex items-center px-5 border-b border-white/5 shrink-0">
                <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-primary-500 rounded-lg">
                        <Bus className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-white font-black tracking-tight">
                        D-DRIVER <span className="text-primary-500 text-[10px] font-bold tracking-widest">PLATFORM</span>
                    </span>
                </div>
                {mobile && (
                    <button onClick={() => setMobileOpen(false)} className="ml-auto text-white/40 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* User info */}
            <div className="px-4 py-3 border-b border-white/5 shrink-0">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center font-black text-white text-sm shrink-0">
                        {(user?.name || 'SA').charAt(0)}
                    </div>
                    <div className="min-w-0">
                        <p className="text-white text-xs font-black truncate">{user?.name || 'Super Admin'}</p>
                        <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse" />
                            <span className="text-[9px] text-white/30 font-bold uppercase tracking-widest">Platform Admin</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto py-3 px-2">
                <p className="text-[9px] font-black text-white/20 uppercase tracking-widest px-3 py-2">Navigation</p>
                {navItems.map(item => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileOpen(false)}
                            {...(item.tourKey ? { 'data-tour': item.tourKey } : {})}
                            className={cn(
                                'flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 transition-all group',
                                isActive
                                    ? 'bg-primary-600/20 text-primary-400 border border-primary-600/20'
                                    : 'text-white/40 hover:text-white hover:bg-white/5'
                            )}
                        >
                            <item.icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-primary-400' : 'text-white/30 group-hover:text-white/60')} />
                            <span className="text-[11px] font-black uppercase tracking-tight">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Logout */}
            <div className="p-3 border-t border-white/5 shrink-0">
                <button
                    onClick={() => logout?.()}
                    className="flex items-center gap-3 w-full px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all group"
                >
                    <LogOut className="w-4 h-4 group-hover:text-red-400" />
                    <span>Sign Out</span>
                </button>
            </div>
        </aside>
    );

    return (
        <div className="flex h-screen bg-[#080c10] overflow-hidden">
            <SuperAdminTour />

            {/* Desktop sidebar */}
            <div className="hidden md:flex">
                <Sidebar />
            </div>

            {/* Mobile sidebar overlay */}
            {mobileOpen && (
                <div className="fixed inset-0 z-50 md:hidden flex">
                    <div className="w-64">
                        <Sidebar mobile />
                    </div>
                    <div className="flex-1 bg-black/50" onClick={() => setMobileOpen(false)} />
                </div>
            )}

            {/* Main */}
            <div className="flex flex-col flex-1 overflow-hidden min-w-0">
                {/* Top bar */}
                <header className="h-14 bg-[#0d1117] border-b border-white/5 flex items-center px-5 shrink-0">
                    <button
                        onClick={() => setMobileOpen(true)}
                        className="md:hidden w-9 h-9 flex items-center justify-center text-white/40 hover:text-white mr-3"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                    <div className="flex-1">
                        <p className="text-white/40 text-xs font-bold uppercase tracking-widest">D-Driver Platform Control</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">All Systems Operational</span>
                        </div>
                        <button
                            onClick={() => startTour('superadmin')}
                            title="Platform tour"
                            className="w-8 h-8 flex items-center justify-center text-white/30 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                        >
                            <HelpCircle className="w-4 h-4" />
                        </button>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-5 md:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <TourProvider>
            <SuperAdminLayoutInner>{children}</SuperAdminLayoutInner>
        </TourProvider>
    );
}
