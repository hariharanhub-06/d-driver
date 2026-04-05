'use client';

import { useState, useEffect } from 'react';
import { Bus, Clock, CheckCircle, ChevronRight, Navigation, Shield, Bell, Settings } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function DriverDashboard() {
    const { user, logout } = useAuth();
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="min-h-screen bg-black text-white p-6 font-sans flex flex-col relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[100px] rounded-full"></div>

            {/* Top Navigation */}
            <div className="flex justify-between items-center mb-10 z-10">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-xl">
                        <Bus className="w-6 h-6 text-black" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black tracking-tight leading-none uppercase">Greenwood</h2>
                        <span className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mt-1 block">Drive Control</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button className="w-11 h-11 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5 hover:bg-white/10 transition-colors">
                        <Bell className="w-5 h-5 text-white/40" />
                    </button>
                    <button onClick={logout} className="w-11 h-11 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5 hover:bg-white/10 transition-colors">
                        <Settings className="w-5 h-5 text-white/40" />
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="space-y-6 z-10 flex-1">
                {/* Greeting */}
                <div>
                    <h1 className="text-3xl font-black tracking-tight">How's it going, {user?.name.split(' ')[0]}?</h1>
                    <p className="text-white/40 font-bold uppercase tracking-widest text-xs mt-2">Ready for your shift</p>
                </div>

                {/* Assigned Vehicle Card */}
                <div className="bg-[#121212] rounded-[32px] p-8 border border-white/5 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/5 rounded-full blur-3xl -mr-24 -mt-24 group-hover:bg-blue-600/10 transition-all"></div>
                    <div className="flex justify-between items-start mb-8 relative z-10">
                        <div className="px-5 py-2.5 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center">
                            <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                            <span className="text-[11px] font-black text-green-500 uppercase tracking-widest">Active Status</span>
                        </div>
                        <Navigation className="w-6 h-6 text-white/20" />
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-[0.4em] mb-2">Assigned Fleet</h3>
                        <div className="flex items-baseline gap-3">
                            <span className="text-6xl font-black tracking-tighter text-white">BUS 12</span>
                        </div>
                        <p className="text-white/40 text-sm mt-4 font-bold flex items-center">
                            <Clock className="w-4 h-4 mr-2" /> Shift Ends: 04:30 PM
                        </p>
                    </div>
                </div>

                {/* Schedule Header */}
                <div className="flex items-center justify-between pt-4">
                    <h3 className="text-lg font-black tracking-tight border-l-4 border-blue-600 pl-4 uppercase">Upcoming Trips</h3>
                    <span className="text-white/30 text-xs font-bold uppercase">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                {/* Trip Cards */}
                <div className="space-y-4">
                    <Link href="/driver/ride" className="block bg-[#121212] rounded-[28px] p-6 border border-white/5 hover:border-white/10 transition-all group active:scale-[0.98]">
                        <div className="flex justify-between items-center mb-5">
                            <div className="px-4 py-1.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Ongoing</div>
                            <span className="text-white/30 text-sm font-bold flex items-center">
                                <Clock className="w-4 h-4 mr-1.5" /> 07:00 AM
                            </span>
                        </div>
                        <h4 className="text-2xl font-black tracking-tight mb-2 group-hover:text-blue-500 transition-colors">Route A - North City</h4>
                        <div className="flex items-center text-white/40 text-xs font-bold uppercase tracking-widest gap-4">
                            <span>42 Students</span>
                            <span>•</span>
                            <span>8 Stops</span>
                        </div>
                        <div className="mt-8 flex items-center justify-between">
                            <div className="flex -space-x-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="w-8 h-8 rounded-full border-2 border-[#121212] bg-white/10 flex items-center justify-center text-[10px] font-bold">
                                        ST
                                    </div>
                                ))}
                                <div className="w-8 h-8 rounded-full border-2 border-[#121212] bg-blue-600 flex items-center justify-center text-[10px] font-bold">
                                    +39
                                </div>
                            </div>
                            <div className="bg-white text-black h-12 px-6 rounded-2xl flex items-center font-black text-sm group-hover:bg-blue-500 group-hover:text-white transition-all">
                                Open Map <Navigation className="w-4 h-4 ml-2" />
                            </div>
                        </div>
                    </Link>

                    <div className="bg-[#121212]/40 rounded-[28px] p-6 border border-white/5 opacity-50 grayscale transition-all cursor-not-allowed">
                        <div className="flex justify-between items-center mb-5">
                            <div className="px-4 py-1.5 bg-white/10 text-white/40 rounded-xl text-[10px] font-black uppercase tracking-widest">Pending</div>
                            <span className="text-white/30 text-sm font-bold flex items-center">
                                <Clock className="w-4 h-4 mr-1.5" /> 03:15 PM
                            </span>
                        </div>
                        <h4 className="text-2xl font-black tracking-tight mb-2">Route A - Return</h4>
                        <div className="flex items-center text-white/40 text-xs font-bold uppercase tracking-widest gap-4">
                            <span>42 Students</span>
                            <span>•</span>
                            <span>8 Stops</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Safe Area Padding */}
            <div className="h-4"></div>
        </div>
    );
}
