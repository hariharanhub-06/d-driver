'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Bus, Users, Map, DollarSign, Bell, Settings, Building, UserCheck, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

export default function Sidebar({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const pathname = usePathname();
    const { user } = useAuth();

    const navItems = [
        { icon: Home, label: 'Dashboard', href: '/admin/dashboard' },
        ...(user?.role === 'super_admin' ? [{ icon: Building, label: 'Schools', href: '/admin/schools' }] : []),
        { icon: Bus, label: 'Buses', href: '/admin/buses' },
        { icon: Users, label: 'Drivers', href: '/admin/drivers' },
        { icon: Users, label: 'Students', href: '/admin/students' },
        { icon: Users, label: 'Parents', href: '/admin/parents' },
        { icon: UserCheck, label: 'Staff Admins', href: '/admin/staff' },
        { icon: Map, label: 'Routes & Stops', href: '/admin/routes' },
        { icon: Map, label: 'Live Tracking', href: '/admin/tracking' },
        { icon: DollarSign, label: 'Fees', href: '/admin/fees' },
        { icon: Bell, label: 'Notifications', href: '/admin/notifications' },
        { icon: Settings, label: 'Settings', href: '/admin/settings' },
    ];

    const filteredItems = navItems.filter(item => {
        if (item.href === '/admin/schools' && user?.role !== 'super_admin') return false;
        return true;
    });

    return (
        <aside className={cn(
            "fixed inset-y-0 left-0 w-64 bg-card-bg border-r border-border h-screen flex-col z-30 transition-transform duration-300 md:relative md:translate-x-0 flex shrink-0",
            isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}>
            <div className="p-6 border-b border-border flex items-center justify-between">
                <div className="flex items-center">
                    <div className="w-8 h-8 rounded bg-primary-600 flex items-center justify-center mr-3">
                        <span className="text-white font-bold text-xl">D</span>
                    </div>
                    <span className="font-bold text-xl text-foreground tracking-tight">D-Driver</span>
                </div>
                <button onClick={onClose} className="md:hidden text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-4">
                <ul className="space-y-1 px-3">
                    {filteredItems.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        return (
                            <li key={item.label}>
                                <Link
                                    href={item.href}
                                    onClick={() => onClose()}
                                    className={cn(
                                        "flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                                        isActive
                                            ? "bg-primary-50 text-primary-600 dark:bg-slate-800 dark:text-primary-500"
                                            : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                                    )}
                                >
                                    <item.icon className={cn("w-5 h-5 mr-3", isActive ? "text-primary-600 dark:text-primary-500" : "text-slate-400")} />
                                    {item.label}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </aside>
    );
}
