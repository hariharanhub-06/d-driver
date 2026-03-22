'use client';

import { Bell, Bus, User as UserIcon, AlertTriangle, AlertCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function ParentDashboard() {
    const { user } = useAuth();

    return (
        <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-950 min-h-full">
            <div className="mb-6 mt-2">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">Welcome back, {user?.name || 'Parent'}!</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Here is the latest update on your children.</p>
            </div>

            <div className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl shadow-lg p-5 text-white mb-6 relative overflow-hidden">
                <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white opacity-10"></div>
                <div className="flex justify-between items-start relative z-10">
                    <div>
                        <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-semibold mb-3">Live Status</span>
                        <h3 className="text-2xl font-bold">In Transit</h3>
                        <p className="text-primary-100 mt-1 flex items-center text-sm">
                            <Bus className="w-4 h-4 mr-1.5" /> Bus 12 (Morning Route)
                        </p>
                    </div>
                    <div className="bg-white text-primary-600 w-12 h-12 rounded-full flex items-center justify-center shadow-md">
                        <span className="font-bold text-lg">S3</span>
                    </div>
                </div>

                <div className="mt-6 pt-4 border-t border-white/20 flex justify-between items-center text-sm">
                    <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1.5" /> ETA: 08:45 AM
                    </div>
                    <Link href="/parent/tracking" className="text-white underline underline-offset-4 decoration-white/50 hover:decoration-white font-medium">
                        View Map
                    </Link>
                </div>
            </div>

            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Children</h3>
            <div className="space-y-4 mb-8">
                <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-4 shadow-sm flex items-center">
                    <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mr-4">
                        <UserIcon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold text-slate-800 dark:text-white">Alex Johnson</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Boarded at 08:12 AM</p>
                    </div>
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                </div>

                <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-4 shadow-sm flex items-center">
                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 text-slate-400 rounded-full flex items-center justify-center mr-4">
                        <UserIcon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold text-slate-800 dark:text-white">Mia Johnson</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Pending Afternoon Trip</p>
                    </div>
                    <div className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-600"></div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <button className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-4 shadow-sm flex flex-col justify-center text-left hover:border-primary-500 transition-colors">
                    <AlertCircle className="w-6 h-6 text-orange-500 mb-2" />
                    <span className="font-bold text-slate-800 dark:text-white text-sm">Report Absent</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">Notify transport team</span>
                </button>
                <Link href="/parent/request" className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-4 shadow-sm flex flex-col justify-center text-left hover:border-primary-500 transition-colors">
                    <AlertTriangle className="w-6 h-6 text-red-500 mb-2" />
                    <span className="font-bold text-slate-800 dark:text-white text-sm">Request Stop Change</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">Temporary or permanent</span>
                </Link>
            </div>
        </div>
    );
}
