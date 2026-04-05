'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    User,
    Users,
    FileText,
    Settings,
    LogOut,
    ChevronRight,
    Bus,
    CreditCard,
    ShieldCheck,
    Building2,
    Truck,
    Map,
    MapPin,
    CheckSquare,
    Locate,
    Bell
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

export default function Sidebar({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const pathname = usePathname();
    const { user, logout } = useAuth();

    interface NavItem {
        icon: any;
        label: string;
        href: string;
        children?: { label: string, href: string }[];
    }

    const getNavItems = (): NavItem[] => {
        const role = user?.role || 'admin';

        if (role === 'super_admin') {
            return [
                { icon: LayoutDashboard, label: 'Dashboard', href: '/super-admin/dashboard' },
                { icon: Building2, label: 'Schools', href: '/super-admin/schools' },
                { icon: ShieldCheck, label: 'Subscriptions', href: '/super-admin/subscriptions' },
                { icon: Users, label: 'Permissions', href: '/super-admin/permissions' },
                { icon: FileText, label: 'Reports', href: '/super-admin/reports' },
            ];
        } else if (role === 'driver') {
            return [
                { icon: LayoutDashboard, label: 'Dashboard', href: '/driver/dashboard' },
                { icon: CheckSquare, label: 'Mark Attendance', href: '/driver/attendance' },
                { icon: Map, label: 'My Route', href: '/driver/route' },
            ];
        } else if (role === 'parent') {
            return [
                { icon: LayoutDashboard, label: 'Dashboard', href: '/parent/dashboard' },
                { icon: Locate, label: 'Track Bus', href: '/parent/tracking' },
                { icon: MapPin, label: 'Stop Request', href: '/parent/stop-request' },
                { icon: CreditCard, label: 'My Fees', href: '/parent/fees' },
            ];
        } else {
            // School Admin
            return [
                { icon: LayoutDashboard, label: 'Dashboard', href: '/admin/dashboard' },
                { icon: Users, label: 'Students & Parents', href: '/admin/students' },
                { icon: Truck, label: 'Drivers', href: '/admin/drivers' },
                { icon: Map, label: 'Routes', href: '/admin/routes' },
                { icon: Bus, label: 'Buses', href: '/admin/buses' },
                { icon: MapPin, label: 'Stops', href: '/admin/stops' },
                { icon: CheckSquare, label: 'Attendance', href: '/admin/attendance' },
                { icon: CreditCard, label: 'Fees', href: '/admin/fees' },
                { icon: Bell, label: 'Notifications', href: '/admin/notifications' },
                { icon: Settings, label: 'Settings', href: '/admin/settings' },
            ];
        }
    };

    const navItems = getNavItems();

    return (
        <aside className={cn(
            "admin-sidebar transition-all duration-300 flex flex-col",
            isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}>
            {/* Logo Section */}
            <div className="h-12 flex items-center px-4 bg-[#1a2226] border-b border-black/10 shrink-0">
                <div className="flex items-center gap-2">
                    <div className="p-1 bg-primary-500 rounded-md">
                        <Bus className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-lg font-black text-white tracking-tight">
                        D-DRIVER<span className="text-primary-500 text-[10px] ml-0.5 font-bold uppercase tracking-widest">365</span>
                    </span>
                </div>
            </div>

            {/* User Profile Section */}
            <div className="px-4 py-3 bg-[#1e282c] shrink-0 border-b border-black/5">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg border border-primary-500/30 p-0.5 overflow-hidden shrink-0">
                        <div className="w-full h-full rounded-md bg-slate-700 flex items-center justify-center">
                            <User size={14} className="text-slate-400" />
                        </div>
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-xs font-black text-white truncate uppercase tracking-tight">{user?.name || 'Zahi Ejaz'}</span>
                        <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse"></div>
                            <span className="text-[9px] text-gray-400 uppercase font-bold tracking-widest">Live</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Section */}
            <div className="flex-1 overflow-y-auto py-2">
                <div className="px-6 py-2 text-[9px] font-black text-gray-500 uppercase tracking-widest opacity-60">
                    Control Tower
                </div>
                <nav>
                    <ul>
                        {navItems.map((item) => {
                            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                            return (
                                <li key={item.label}>
                                    <Link
                                        href={item.href}
                                        onClick={() => onClose()}
                                        className={cn(
                                            "nav-item",
                                            isActive && "nav-item-active"
                                        )}
                                    >
                                        <item.icon className={cn(
                                            "w-4 h-4",
                                            isActive ? "text-white" : "text-gray-400"
                                        )} />
                                        <span className="flex-1 text-[11px] font-bold uppercase tracking-tight">{item.label}</span>
                                        {item.children && (
                                            <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
                                        )}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>
            </div>

            {/* Logout Section */}
            <div className="p-3 border-t border-black/10 bg-[#1a2226] shrink-0">
                <button
                    onClick={() => logout?.()}
                    className="flex items-center gap-3 w-full px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white hover:bg-red-500/10 rounded-xl transition-all group"
                >
                    <LogOut className="w-4 h-4 group-hover:text-red-500" />
                    <span>Terminate Session</span>
                </button>
            </div>
        </aside>
    );
}

