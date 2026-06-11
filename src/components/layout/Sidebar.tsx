'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Tamil labels for bilingual sidebar
const LABEL_TA: Record<string, string> = {
    'Dashboard': 'டாஷ்போர்டு', 'Students': 'மாணவர்கள்', 'Drivers': 'ஓட்டுநர்கள்',
    'Bus Staff': 'பேருந்து ஊழியர்கள்', 'Routes': 'வழிகள்', 'Buses': 'பேருந்துகள்',
    'Tracking': 'கண்காணிப்பு', 'Attendance': 'வருகை பதிவு', 'Fees': 'கட்டணம்',
    'Fuel Requests': 'எரிபொருள்', 'Shift Logs': 'பணிமாற்றம்', 'Bus Switches': 'பேருந்து மாற்றம்',
    'Stop Requests': 'நிறுத்தம்', 'Notifications': 'அறிவிப்புகள்', 'Reports': 'அறிக்கைகள்',
    'Settings': 'அமைப்புகள்', 'Schools': 'பள்ளிகள்', 'Billing': 'கட்டணப் பட்டியல்',
    'Revenue': 'வருவாய்', 'Expenses': 'செலவுகள்', 'SA Users': 'SA பயனர்கள்',
    'Audit Trail': 'தணிக்கை', 'Maintenance': 'பராமரிப்பு', 'Profile': 'சுயவிவரம்', 'Ride': 'பயணம்',
    'Track Bus': 'பேருந்து கண்காணி', 'Home': 'முகப்பு', 'Change Stop': 'நிறுத்தம் மாற்று',
};

import {
    LayoutDashboard, Users, FileText, Settings, LogOut,
    Bus, CreditCard, ShieldCheck, Building2, Truck, Map,
    MapPin, CheckSquare, Locate, Bell, BarChart2,
    Fuel, GitMerge, ArrowLeftRight, X, User,
    DollarSign, Activity, ClipboardList, BookOpen, Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useSchoolBranding } from '@/context/SchoolBrandingContext';

export default function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const branding = useSchoolBranding();

    const getNavItems = () => {
        const role = user?.role || 'admin';
        const p = branding.permissions;

        // Helper: when permissions are null (not yet loaded or no restrictions), show everything
        const allow = (key: keyof typeof p) => !p || p[key] !== false;

        if (role === 'super_admin') return [
            { section: 'MENU', items: [
                { icon: LayoutDashboard, label: 'Dashboard', href: '/super-admin/dashboard' },
                { icon: Building2, label: 'Schools', href: '/super-admin/schools' },
                { icon: Locate, label: 'Tracking', href: '/super-admin/tracking' },
                { icon: DollarSign, label: 'Billing', href: '/super-admin/billing' },
                { icon: BarChart2, label: 'Revenue', href: '/super-admin/revenue' },
                { icon: Activity, label: 'Expenses', href: '/super-admin/expenses' },
            ]},
            { section: 'GENERAL', items: [
                { icon: Users, label: 'SA Users', href: '/super-admin/users' },

                { icon: ClipboardList, label: 'Audit Trail', href: '/super-admin/audit' },
                { icon: FileText, label: 'Reports', href: '/super-admin/reports' },
                { icon: Settings, label: 'Settings', href: '/super-admin/settings' },
            ]},
        ];
        if (role === 'driver') return [
            { section: 'MENU', items: [
                { icon: LayoutDashboard, label: 'Dashboard', href: '/driver/dashboard' },
                { icon: CheckSquare, label: 'Attendance', href: '/driver/attendance', disabled: !allow('attendance') },
                { icon: Map, label: 'Ride', href: '/driver/ride', disabled: !allow('gps_tracking') },
            ]},
            { section: 'GENERAL', items: [
                { icon: User, label: 'Profile', href: '/driver/profile' },
            ]},
        ];
        if (role === 'bus_staff') return [
            { section: 'MENU', items: [
                { icon: CheckSquare, label: 'Attendance', href: '/bus-staff/attendance' },
            ]},
            { section: 'GENERAL', items: [
                { icon: User, label: 'Profile', href: '/bus-staff/profile' },
            ]},
        ];
        if (role === 'parent') return [
            { section: 'MENU', items: [
                { icon: LayoutDashboard, label: 'Home', href: '/parent/dashboard' },
                { icon: Locate, label: 'Track Bus', href: '/parent/tracking', disabled: !allow('gps_tracking') },
                { icon: CheckSquare, label: 'Attendance', href: '/parent/attendance', disabled: !allow('attendance') },
                { icon: CreditCard, label: 'Fees', href: '/parent/fees', disabled: !allow('fee_management') },
            ]},
            { section: 'GENERAL', items: [
                { icon: MapPin, label: 'Change Stop', href: '/parent/requests', disabled: !allow('stop_change_requests') },
                { icon: User, label: 'Profile', href: '/parent/profile' },
            ]},
        ];
        // Admin
        return [
            { section: 'MENU', items: [
                { icon: LayoutDashboard, label: 'Dashboard', href: '/admin/dashboard', tourId: 'dashboard' },
                { icon: Users, label: 'Students', href: '/admin/students', tourId: 'students' },
                { icon: Truck, label: 'Drivers', href: '/admin/drivers' },
                { icon: Shield, label: 'Bus Staff', href: '/admin/bus-staff' },
                { icon: Map, label: 'Routes', href: '/admin/routes', tourId: 'routes', disabled: !allow('route_management') },
                { icon: Bus, label: 'Buses', href: '/admin/buses', tourId: 'buses' },
                { icon: Locate, label: 'Tracking', href: '/admin/tracking', disabled: !allow('gps_tracking') },
                { icon: CheckSquare, label: 'Attendance', href: '/admin/attendance', disabled: !allow('attendance') },
                { icon: CreditCard, label: 'Fees', href: '/admin/fees', tourId: 'fees', disabled: !allow('fee_management') },
                { icon: BookOpen, label: 'Maintenance', href: '/admin/maintenance' },
            ]},
            { section: 'GENERAL', items: [
                { icon: Fuel, label: 'Fuel Requests', href: '/admin/fuel-requests', disabled: !allow('fuel_management') },
                { icon: GitMerge, label: 'Shift Logs', href: '/admin/shift-logs', disabled: !allow('shift_tracking') },
                { icon: ArrowLeftRight, label: 'Bus Switches', href: '/admin/bus-switches' },
                { icon: MapPin, label: 'Stop Requests', href: '/admin/stop-change-requests', disabled: !allow('stop_change_requests') },
                { icon: Bell, label: 'Notifications', href: '/admin/notifications' },
                { icon: BarChart2, label: 'Reports', href: '/admin/reports' },
                { icon: Settings, label: 'Settings', href: '/admin/settings', tourId: 'settings' },
            ]},
        ];
    };

    const sections = getNavItems();
    const schoolName = branding?.name || 'D-Driver';
    const logoUrl = branding?.logo_url;

    return (
        <>
            {/* Mobile overlay */}
            {isOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden" onClick={onClose} />
            )}
            <aside className={cn(
                'admin-sidebar transition-transform duration-300 ease-in-out',
                isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
            )}>
                {/* Logo */}
                <div className="flex items-center justify-between h-16 px-5 border-b border-slate-100 dark:border-slate-700 shrink-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                        {logoUrl ? (
                            <img src={logoUrl} alt={schoolName} className="h-8 w-8 rounded-lg object-cover overflow-hidden shrink-0" />
                        ) : (
                            <div className="w-8 h-8 rounded-lg bg-[var(--brand)] flex items-center justify-center shrink-0">
                                <Bus className="w-4 h-4 text-white" />
                            </div>
                        )}
                        <span className="font-bold text-slate-900 dark:text-white text-sm truncate">{schoolName}</span>
                    </div>
                    <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Nav */}
                <div className="flex-1 overflow-y-auto py-4 space-y-6">
                    {sections.map((section) => (
                        <div key={section.section}>
                            <p className="px-5 mb-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{section.section}</p>
                            <nav className="space-y-0.5">
                                {section.items.map((item) => {
                                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                                    if ((item as any).disabled) {
                                        return (
                                            <div
                                                key={item.href}
                                                className="nav-item opacity-40 cursor-not-allowed pointer-events-none"
                                                {...((item as any).tourId ? { 'data-tour': (item as any).tourId } : {})}
                                            >
                                                <item.icon className="w-4 h-4 shrink-0" />
                                                <span className="flex-1 min-w-0">
                                                    <span className="block truncate">{item.label}</span>
                                                    {LABEL_TA[item.label] && <span className="block text-[9px] opacity-60 truncate leading-tight">{LABEL_TA[item.label]}</span>}
                                                </span>
                                            </div>
                                        );
                                    }
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={onClose}
                                            className={cn('nav-item', isActive && 'nav-item-active')}
                                            {...((item as any).tourId ? { 'data-tour': (item as any).tourId } : {})}
                                        >
                                            <item.icon className="w-4 h-4 shrink-0" />
                                            <span className="flex-1 min-w-0">
                                                <span className="block truncate">{item.label}</span>
                                                {LABEL_TA[item.label] && <span className="block text-[9px] opacity-60 truncate leading-tight">{LABEL_TA[item.label]}</span>}
                                            </span>
                                        </Link>
                                    );
                                })}
                            </nav>
                        </div>
                    ))}
                </div>

                {/* User + Logout */}
                <div className="border-t border-slate-100 dark:border-slate-700 p-4 shrink-0">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-xl bg-[var(--brand)]/10 flex items-center justify-center shrink-0">
                            <User className="w-4 h-4 text-[var(--brand)]" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user?.name || 'User'}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email || ''}</p>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Logout
                    </button>
                </div>
            </aside>
        </>
    );
}
