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
            "admin-sidebar transition-all duration-300",
            isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}>
            {/* Logo Section */}
            <div className="h-16 flex items-center px-6 bg-[#1a2226] border-b border-black/10">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-primary-500 rounded-md">
                        <Bus className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xl font-bold text-white tracking-tight">
                        D-DRIVER<span className="text-primary-500">365</span>
                    </span>
                </div>
            </div>

            {/* User Profile Section */}
            <div className="px-4 py-6 bg-[#1e282c]">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full border-2 border-primary-500 p-0.5 overflow-hidden">
                        <div className="w-full h-full rounded-full bg-slate-700 flex items-center justify-center">
                            <User className="text-slate-400" />
                        </div>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold text-white truncate">{user?.name || 'Zahi Ejaz'}</span>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-primary-500"></div>
                            <span className="text-xs text-sidebar-text uppercase font-medium tracking-wider">Online</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Section */}
            <div className="py-2">
                <div className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    Main Navigation
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
                                            "w-5 h-5",
                                            isActive ? "text-white" : "text-gray-400"
                                        )} />
                                        <span className="flex-1 text-sm">{item.label}</span>
                                        {item.children && (
                                            <ChevronRight className="w-4 h-4 text-gray-500" />
                                        )}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>
            </div>

            {/* Logout Section */}
            <div className="absolute bottom-0 w-full p-4 border-t border-black/10">
                <button
                    onClick={() => logout?.()}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-400 hover:text-white transition-colors"
                >
                    <LogOut className="w-5 h-5" />
                    <span>Sign Out</span>
                </button>
            </div>
        </aside>
    );
}

