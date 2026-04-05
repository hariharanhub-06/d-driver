'use client';

import { Map as MapIcon, Navigation, Bus, Users, Shield, Target, Loader2 } from 'lucide-react';

export default function TrackingPage() {
    return (
        <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)] animate-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none uppercase">LIVESTREAM TELEMETRY</h1>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-2 flex items-center gap-2">
                        <Target className="w-3.5 h-3.5 text-primary-500 animate-pulse" /> Precision GPS monitoring and active fleet safety.
                    </p>
                </div>
                <div className="flex gap-2">
                    <span className="flex items-center px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl text-[9px] font-black uppercase tracking-widest border border-emerald-100 shadow-sm">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2 animate-pulse" /> System Online
                    </span>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
                {/* Active Fleet Sidebar */}
                <div className="card lg:col-span-1 p-0 overflow-hidden flex flex-col border-none shadow-xl">
                    <div className="p-4 border-b border-border bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Active Fleet (4)</h3>
                        <Loader2 className="w-3 h-3 text-primary-500 animate-spin" />
                    </div>
                    <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 bg-white dark:bg-[#0a0a0a]">
                        {[12, 18, 5, 22].map(num => (
                            <div key={num} className="p-3.5 rounded-2xl border border-slate-100 hover:border-primary-300 cursor-pointer transition-all bg-white dark:bg-slate-900 shadow-sm group">
                                <div className="flex justify-between items-start">
                                    <span className="font-black text-xs text-slate-900 dark:text-white flex items-center group-hover:text-primary-600">
                                        <Bus size={14} className="mr-2 text-primary-500" /> Bus {num}
                                    </span>
                                    <span className="text-[8px] uppercase font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded tracking-widest">Live</span>
                                </div>
                                <p className="text-[10px] text-slate-400 font-bold mt-1.5 flex items-center">
                                    <Navigation className="w-2.5 h-2.5 mr-1" /> Near Tech Park, Main Rd
                                </p>
                                <div className="mt-4 pt-3 border-t border-slate-50 dark:border-white/5 flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
                                    <span className="flex items-center"><Users size={10} className="mr-1" /> 24 Pupils</span>
                                    <span className="text-primary-500">ETA: 12m</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Map Interface */}
                <div className="card lg:col-span-3 p-0 overflow-hidden bg-slate-50 dark:bg-slate-800/20 relative shadow-inner border-none group">
                    {/* Simulated Map Background */}
                    <div className="absolute inset-0 bg-[url('https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/0,0,1/1x1?access_token=mock')] bg-center bg-cover opacity-10"></div>

                    {/* Map Logic Overlay */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                        <div className="relative w-24 h-24 mb-6">
                            <div className="absolute inset-0 bg-primary-500 opacity-20 rounded-full animate-ping"></div>
                            <div className="absolute inset-[-20%] bg-primary-500 opacity-10 rounded-full animate-pulse"></div>
                            <div className="relative bg-primary-600 w-24 h-24 rounded-[32px] flex items-center justify-center text-white shadow-2xl shadow-primary-500/40 border border-primary-500/50">
                                <MapIcon className="w-10 h-10" />
                            </div>
                        </div>
                        <h2 className="font-black text-xl text-slate-900 dark:text-white tracking-tight uppercase">Map Intelligence Engine</h2>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 max-w-sm text-center px-10 mt-3 leading-relaxed">
                            Streaming real-time telemetry from all connected driver devices. Select a vehicle to engage dedicated surveillance.
                        </p>
                    </div>

                    {/* HUD Controls */}
                    <div className="absolute top-6 left-6 p-4 bg-white/80 dark:bg-black/40 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl">
                        <div className="flex items-center gap-3">
                            <Shield className="w-4 h-4 text-emerald-500" />
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white leading-none">Security Active</p>
                                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-tight mt-1">End-to-End Encryption Engaged</p>
                            </div>
                        </div>
                    </div>

                    {/* Map Controls */}
                    <div className="absolute bottom-6 right-6 flex flex-col gap-2.5 z-10">
                        <button className="w-10 h-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-xl shadow-2xl border border-slate-200 dark:border-white/10 flex items-center justify-center font-black text-lg text-slate-800 dark:text-white hover:bg-white transition-all">+</button>
                        <button className="w-10 h-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-xl shadow-2xl border border-slate-200 dark:border-white/10 flex items-center justify-center font-black text-lg text-slate-800 dark:text-white hover:bg-white transition-all">-</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
