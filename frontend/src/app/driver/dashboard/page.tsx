'use client';

import { Bus, Clock, CheckCircle, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function DriverDashboard() {
    const { user, logout } = useAuth();

    return (
        <div className="min-h-screen p-4 sm:p-6 max-w-md mx-auto flex flex-col">
            <div className="flex justify-between items-center mb-8 mt-4 whitespace-nowrap">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Driver Portal</h1>
                    <p className="text-slate-500 dark:text-slate-400">Welcome, {user?.name}</p>
                </div>
                <button onClick={logout} className="text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white px-3 py-1.5 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                    Log Out
                </button>
            </div>

            <div className="bg-primary-600 rounded-2xl p-6 text-white shadow-lg shadow-primary-600/30 mb-8 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-32 h-32 bg-white opacity-5 rounded-full transform translate-x-10 -translate-y-10"></div>
                <div className="flex items-center mb-4 relative z-10">
                    <Bus className="w-6 h-6 mr-2 shrink-0" />
                    <span className="font-semibold text-primary-100 tracking-wide uppercase text-sm">Assigned Vehicle</span>
                </div>
                <h2 className="text-4xl font-black mb-1 relative z-10">BUS 12</h2>
                <p className="text-primary-100 flex items-center relative z-10 text-sm font-medium">
                    <CheckCircle className="w-4 h-4 mr-1.5" /> Ready for dispatch
                </p>
            </div>

            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Today's Schedule</h3>

            <div className="space-y-4 flex-1">
                <Link href="/ride" className="block bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 hover:border-primary-500 transition-all active:scale-95">
                    <div className="flex justify-between items-center mb-3">
                        <span className="bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-400 text-xs font-bold px-2.5 py-1 rounded-md">MORNING</span>
                        <span className="text-slate-500 dark:text-slate-400 text-sm flex items-center font-medium">
                            <Clock className="w-4 h-4 mr-1 shrink-0" /> 07:00 AM
                        </span>
                    </div>
                    <h4 className="font-bold text-xl text-slate-800 dark:text-white mb-1">Route A - North City</h4>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">42 Students • 8 Stops</p>
                    <div className="flex items-center text-primary-600 dark:text-primary-400 font-semibold text-sm">
                        Start Route <ChevronRight className="w-4 h-4 ml-1" />
                    </div>
                </Link>

                <div className="bg-slate-100 dark:bg-slate-800/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700 opacity-60">
                    <div className="flex justify-between items-center mb-3">
                        <span className="bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300 text-xs font-bold px-2.5 py-1 rounded-md">AFTERNOON</span>
                        <span className="text-slate-500 text-sm flex items-center font-medium">
                            <Clock className="w-4 h-4 mr-1 shrink-0" /> 03:15 PM
                        </span>
                    </div>
                    <h4 className="font-bold text-xl text-slate-800 dark:text-white mb-1">Route A - Return</h4>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">42 Students • 8 Stops</p>
                </div>
            </div>
        </div>
    );
}
