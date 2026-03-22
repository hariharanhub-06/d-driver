'use client';

import { Map as MapIcon, Navigation, Bus, Users } from 'lucide-react';

export default function TrackingPage() {
    return (
        <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)]">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Real-Time Fleet Tracking</h1>
                    <p className="text-slate-500 text-sm mt-1">Monitor live GPS coordinates and student safety on the go.</p>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
                <div className="card lg:col-span-1 p-0 overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-[var(--border)] bg-slate-50/50">
                        <h3 className="font-bold">Active Buses (4)</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {[12, 18, 5, 22].map(num => (
                            <div key={num} className="p-3 rounded-lg border border-[var(--border)] hover:border-primary-500 cursor-pointer transition-colors bg-white dark:bg-slate-800 shadow-sm">
                                <div className="flex justify-between items-start">
                                    <span className="font-bold text-primary-600 flex items-center">
                                        <Bus className="w-4 h-4 mr-2" /> Bus {num}
                                    </span>
                                    <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Moving</span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-1 flex items-center">
                                    <Navigation className="w-3 h-3 mr-1" /> Near Tech Park, Main Rd
                                </p>
                                <div className="mt-3 flex items-center justify-between text-[11px] font-medium text-slate-400">
                                    <span className="flex items-center"><Users className="w-3 h-3 mr-1" /> 24 Pupils</span>
                                    <span>ETA: 12m</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="card lg:col-span-3 p-0 overflow-hidden bg-slate-100 dark:bg-slate-800 relative shadow-inner">
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                        <div className="relative w-20 h-20 mb-4">
                            <div className="absolute inset-0 bg-primary-500 opacity-20 rounded-full animate-ping"></div>
                            <div className="relative bg-primary-600 w-20 h-20 rounded-full flex items-center justify-center text-white">
                                <MapIcon className="w-10 h-10" />
                            </div>
                        </div>
                        <p className="font-bold text-lg text-slate-600">Enterprise Map Engine</p>
                        <p className="text-sm text-slate-500 max-w-sm text-center px-6 mt-2">
                            Streaming real-time telemetry from all connected driver devices. Select a vehicle to view detailed logs.
                        </p>
                    </div>

                    {/* Mock Map Controls */}
                    <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-10">
                        <button className="w-10 h-10 bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 flex items-center justify-center font-bold text-lg text-slate-700">+</button>
                        <button className="w-10 h-10 bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 flex items-center justify-center font-bold text-lg text-slate-700">-</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
