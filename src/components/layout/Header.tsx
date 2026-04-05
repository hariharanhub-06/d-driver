'use client';

import { Menu, Search, Bell, User, Sun, Moon, LogOut, Settings } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function Header({ onMenuClick }: { onMenuClick: () => void }) {
    const { user, logout } = useAuth();
    const router = useRouter();
    const [isDark, setIsDark] = useState(false);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    useEffect(() => {
        if (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) {
            setIsDark(true);
        }
    }, []);

    const toggleTheme = () => {
        document.documentElement.classList.toggle('dark');
        setIsDark(!isDark);
    };

    const notifications = [
        { id: 1, title: 'Bus #12 is 1km away', time: '2 mins ago', type: 'info' },
        { id: 2, title: 'Alex Johnson marked Present', time: '5 mins ago', type: 'success' },
        { id: 3, title: 'Stop Change Request: Sarah Williams', time: '1 hour ago', type: 'warning' },
    ];

    return (
        <header className="h-16 bg-white dark:bg-[#1a2226] border-b border-gray-200 dark:border-black/10 flex items-center justify-between px-4 sticky top-0 z-[100]">
            <div className="flex items-center gap-4">
                <button
                    onClick={onMenuClick}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                >
                    <Menu size={20} className="text-gray-600 dark:text-gray-400" />
                </button>
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-[#222d32] rounded-lg group border border-transparent focus-within:border-primary-500/30 transition-all">
                    <Search size={16} className="text-gray-400 group-focus-within:text-primary-500" />
                    <input
                        type="text"
                        placeholder="Search Students, Drivers, Routes..."
                        className="bg-transparent border-none focus:ring-0 text-sm w-72 text-gray-700 dark:text-gray-300"
                    />
                </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
                <button
                    onClick={toggleTheme}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md text-gray-500 transition-colors"
                >
                    {isDark ? <Sun size={18} /> : <Moon size={18} />}
                </button>

                {/* Notifications Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => {
                            setIsNotificationOpen(!isNotificationOpen);
                            setIsProfileOpen(false);
                        }}
                        className={cn(
                            "p-2 rounded-md text-gray-500 relative transition-colors",
                            isNotificationOpen ? "bg-primary-50 text-primary-500" : "hover:bg-gray-100 dark:hover:bg-gray-800"
                        )}
                    >
                        <Bell size={18} />
                        <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-[#1a2226]"></span>
                    </button>

                    {isNotificationOpen && (
                        <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-premium border border-gray-100 dark:border-slate-800 overflow-hidden animate-in">
                            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
                                <span className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-widest">Notifications</span>
                                <span className="text-[10px] text-primary-500 font-bold cursor-pointer">Mark all read</span>
                            </div>
                            <div className="max-h-[300px] overflow-y-auto">
                                {notifications.map(n => (
                                    <div key={n.id} className="p-4 border-b border-gray-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group">
                                        <div className="flex gap-3">
                                            <div className={cn(
                                                "w-2 h-2 rounded-full mt-1.5 shrink-0",
                                                n.type === 'info' ? "bg-blue-500" : n.type === 'success' ? "bg-green-500" : "bg-orange-500"
                                            )} />
                                            <div>
                                                <p className="text-sm font-bold text-gray-800 dark:text-gray-200 group-hover:text-primary-600 transition-colors">{n.title}</p>
                                                <p className="text-[10px] text-gray-400 mt-1">{n.time}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div onClick={() => { setIsNotificationOpen(false); router.push(`/${user?.role === 'super_admin' ? 'super-admin' : user?.role === 'driver' ? 'driver' : 'admin'}/notifications`); }} className="p-3 text-center bg-slate-50 dark:bg-slate-800/50 text-[10px] font-bold text-gray-500 uppercase tracking-widest cursor-pointer hover:text-primary-500 transition-colors">
                                View All Notifications
                            </div>
                        </div>
                    )}
                </div>

                <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>

                {/* Profile Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => {
                            setIsProfileOpen(!isProfileOpen);
                            setIsNotificationOpen(false);
                        }}
                        className={cn(
                            "flex items-center gap-3 p-1 rounded-full transition-all",
                            isProfileOpen ? "bg-primary-50" : "hover:bg-gray-50"
                        )}
                    >
                        <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center border-2 border-white overflow-hidden shadow-sm">
                            <User size={16} className="text-white" />
                        </div>
                        <div className="text-left hidden sm:block pr-2">
                            <p className="text-xs font-bold text-gray-700 dark:text-gray-200 leading-none">{user?.name || 'Zahi Ejaz'}</p>
                            <p className="text-[10px] text-gray-400 font-medium mt-1 uppercase tracking-tighter">
                                {user?.role?.replace('_', ' ') || 'Admin'}
                            </p>
                        </div>
                    </button>

                    {isProfileOpen && (
                        <div className="absolute right-0 mt-3 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-premium border border-gray-100 dark:border-slate-800 overflow-hidden animate-in">
                            <div className="p-4 border-b border-gray-50 dark:border-slate-800 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-gray-400">
                                    <User size={20} />
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">{user?.name || 'Zahi Ejaz'}</p>
                                    <p className="text-[10px] text-gray-400 truncate">{user?.email || 'zahi@example.com'}</p>
                                </div>
                            </div>
                            <div className="p-2 space-y-1">
                                <button onClick={() => { setIsProfileOpen(false); router.push(`/${user?.role === 'super_admin' ? 'super-admin' : user?.role === 'driver' ? 'driver' : 'admin'}/settings`); }} className="w-full text-left px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-primary-50 hover:text-primary-600 rounded-xl transition-all flex items-center gap-2">
                                    <User size={16} /> My Profile
                                </button>
                                <button onClick={() => { setIsProfileOpen(false); router.push(`/${user?.role === 'super_admin' ? 'super-admin' : user?.role === 'driver' ? 'driver' : 'admin'}/settings`); }} className="w-full text-left px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-primary-50 hover:text-primary-600 rounded-xl transition-all flex items-center gap-2">
                                    <Settings size={16} /> Account Settings
                                </button>
                                <div className="h-px bg-gray-50 dark:bg-slate-800 mx-2 my-1"></div>
                                <button
                                    onClick={() => logout?.()}
                                    className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 rounded-xl transition-all flex items-center gap-2"
                                >
                                    <LogOut size={16} /> Sign Out
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
