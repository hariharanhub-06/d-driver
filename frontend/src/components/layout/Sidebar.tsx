'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Bus, Users, Map, DollarSign, Bell, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
    { icon: Home, label: 'Dashboard', href: '/admin/dashboard' },
    { icon: Bus, label: 'Buses', href: '/admin/buses' },
    { icon: Users, label: 'Drivers', href: '/admin/drivers' },
    { icon: Users, label: 'Students', href: '/admin/students' },
    { icon: Map, label: 'Routes & Stops', href: '/admin/routes' },
    { icon: Map, label: 'Live Tracking', href: '/admin/tracking' },
    { icon: DollarSign, label: 'Fees', href: '/admin/fees' },
    { icon: Bell, label: 'Notifications', href: '/admin/notifications' },
    { icon: Settings, label: 'Settings', href: '/admin/settings' },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-64 bg-card-bg border-r border-border h-screen flex flex-col hidden md:flex shrink-0">
            <div className="p-6 border-b border-border flex items-center">
                <div className="w-8 h-8 rounded bg-primary-600 flex items-center justify-center mr-3">
                    <span className="text-white font-bold text-xl">D</span>
                </div>
                <span className="font-bold text-xl text-foreground tracking-tight">D-Driver</span>
            </div>
            <nav className="flex-1 overflow-y-auto py-4">
                <ul className="space-y-1 px-3">
                    {navItems.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        return (
                            <li key={item.label}>
                                <Link
                                    href={item.href}
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
