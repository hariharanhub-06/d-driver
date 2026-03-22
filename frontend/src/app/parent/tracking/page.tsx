'use client';

import { MapPin, Navigation, Bus } from 'lucide-react';

export default function ParentTracking() {
    return (
        <div className="flex flex-col h-full h-[calc(100vh-4rem)] relative bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden m-4 sm:m-0">
            <div className="absolute inset-0 z-0 flex items-center justify-center flex-col text-slate-400 dark:text-slate-500">
                <MapPin className="w-16 h-16 mb-2 opacity-50" />
                <p className="text-sm font-medium">Map Component Loading...</p>
            </div>

            <div className="absolute top-4 left-4 right-4 z-10 bg-white dark:bg-slate-900 rounded-xl shadow-lg p-4 flex items-center border border-slate-100 dark:border-slate-800">
                <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 text-primary-600 flex items-center justify-center rounded-full mr-3 shrink-0">
                    <Bus className="w-5 h-5" />
                </div>
                <div className="flex-1">
                    <h4 className="font-bold text-slate-800 dark:text-white">Bus 12</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center mt-0.5">
                        <Navigation className="w-3 h-3 mr-1" /> Moving at 45 km/h
                    </p>
                </div>
                <div className="text-right">
                    <span className="block text-sm font-bold text-emerald-600 dark:text-emerald-400">8 mins</span>
                    <span className="block text-xs text-slate-500">to stop</span>
                </div>
            </div>
        </div>
    );
}
