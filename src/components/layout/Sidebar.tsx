'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Bus, Users, Map, IndianRupee, Bell, Settings, Building, UserCheck, X, Shield, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

export default function Sidebar({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const pathname = usePathname();
    const { user } = useAuth();

    const getNavItems = () => {
        if (user?.role === 'super_admin') {
            return [
                { icon: Shield, label: 'Network Dashboard', href: '/super-admin/dashboard' },
                { icon: Building, label: 'Registered Schools', href: '/super-admin/schools' },
                { icon: IndianRupee, label: 'Global Revenue', href: '/super-admin/revenue' },
                { icon: Activity, label: 'System Logs', href: '/super-admin/logs' },
                { icon: Bell, label: 'Global Alerts', href: '/super-admin/notifications' },
            ];
        }

        // Default Admin Navigation
        return [
            { icon: Home, label: 'Dashboard', href: '/admin/dashboard' },
            { icon: Bus, label: 'Buses', href: '/admin/buses' },
            { icon: Users, label: 'Drivers', href: '/admin/drivers' },
            { icon: Users, label: 'Students', href: '/admin/students' },
            { icon: Users, label: 'Parents', href: '/admin/parents' },
            { icon: UserCheck, label: 'Staff Admins', href: '/admin/staff' },
            { icon: Map, label: 'Routes & Stops', href: '/admin/routes' },
            { icon: Map, label: 'Live Tracking', href: '/admin/tracking' },
            { icon: IndianRupee, label: 'Fees', href: '/admin/fees' },
            { icon: Bell, label: 'Notifications', href: '/admin/notifications' },
            { icon: Settings, label: 'Settings', href: '/admin/settings' },
        ];
    };

    const navItems = getNavItems();

    return (
        <aside className={cn(
            "fixed inset-y-0 left-0 w-72 bg-black border-r border-white/5 h-screen flex-col z-30 transition-transform duration-300 md:relative md:translate-x-0 flex shrink-0 font-sans",
            isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}>
            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-black">
                <div className="flex items-center">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center mr-4 shadow-xl transform transition-transform hover:rotate-12">
                        <Bus className="w-6 h-6 text-black" strokeWidth={2} />
                    </div>
                    <div>
                        <span className="block font-black text-xl text-white tracking-tighter leading-none">D-DRIVER</span>
                        <span className="block text-[10px] font-bold text-white/30 tracking-[0.2em] uppercase mt-1">
                            {user?.role === 'super_admin' ? 'Network Controller' : 'Transport ERP'}
                        </span>
                    </div>
                </div>
                <button onClick={onClose} className="md:hidden text-white/50 hover:text-white transition-colors">
                    <X className="w-6 h-6" />
                </button>
            </div>

            <nav className="flex-1 overflow-y-auto py-6 bg-black scrollbar-hide">
                <ul className="space-y-2 px-4">
                    {navItems.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        return (
                            <li key={item.label}>
                                <Link
                                    href={item.href}
                                    onClick={() => onClose()}
                                    className={cn(
                                        "flex items-center px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 group relative",
                                        isActive
                                            ? "bg-white text-black shadow-premium"
                                            : "text-white/50 hover:bg-white/5 hover:text-white"
                                    )}
                                >
                                    <item.icon className={cn(
                                        "w-5 h-5 mr-3.5 transition-colors",
                                        isActive ? "text-black" : "text-white/20 group-hover:text-white/60"
                                    )} strokeWidth={isActive ? 2.5 : 2} />
                                    {item.label}
                                    {isActive && (
                                        <div className="absolute left-0 w-1.5 h-6 bg-white rounded-r-full -translate-x-4"></div>
                                    )}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* Premium Logout/Profile Section */}
            <div className="p-4 border-t border-white/5 bg-[#080808]">
                <div className="flex items-center p-3 rounded-2xl hover:bg-white/5 transition-colors group cursor-pointer">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/10 overflow-hidden">
                        <Users className="w-6 h-6 text-white/40" />
                    </div>
                    <div className="ml-3 flex-1">
                        <p className="text-sm font-black text-white leading-none truncate">{user?.name}</p>
                        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-1">{user?.role?.replace('_', ' ')}</p>
                    </div>
                    <Settings className="w-4 h-4 text-white/20 group-hover:text-white/60 transition-colors" />
                </div>
            </div>
        </aside>
    );
}
