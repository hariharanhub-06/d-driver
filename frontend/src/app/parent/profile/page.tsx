'use client';

import { Settings, Shield, Bell, LogOut, ChevronRight, UserCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function ParentProfile() {
    const { user, logout } = useAuth();

    return (
        <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-950 min-h-full flex flex-col">
            <div className="flex flex-col items-center py-8">
                <div className="w-24 h-24 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                    <UserCircle className="w-16 h-16" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{user?.name || 'Parent Name'}</h2>
                <p className="text-slate-500 text-sm">{user?.email}</p>
            </div>

            <div className="space-y-2 mt-4">
                <button className="w-full p-5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl flex items-center justify-between group">
                    <div className="flex items-center">
                        <Settings className="w-5 h-5 mr-3 text-slate-400 group-hover:text-primary-500 transition-colors" />
                        <span className="font-bold text-slate-700 dark:text-slate-200">Account Settings</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300" />
                </button>

                <button className="w-full p-5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl flex items-center justify-between group">
                    <div className="flex items-center">
                        <Bell className="w-5 h-5 mr-3 text-slate-400 group-hover:text-primary-500 transition-colors" />
                        <span className="font-bold text-slate-700 dark:text-slate-200">Notifications</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300" />
                </button>

                <button className="w-full p-5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl flex items-center justify-between group">
                    <div className="flex items-center">
                        <Shield className="w-5 h-5 mr-3 text-slate-400 group-hover:text-primary-500 transition-colors" />
                        <span className="font-bold text-slate-700 dark:text-slate-200">Privacy & Terms</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300" />
                </button>

                <div className="pt-8">
                    <button onClick={logout} className="w-full p-5 bg-red-50 dark:bg-red-900/10 text-red-600 border border-red-100 dark:border-red-900/30 rounded-2xl flex items-center justify-center font-bold">
                        <LogOut className="w-5 h-5 mr-2" /> Log Out
                    </button>
                </div>
            </div>

            <div className="mt-auto py-8 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                D-Driver Version 1.0.0
            </div>
        </div>
    );
}
