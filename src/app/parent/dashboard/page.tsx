'use client';

import { useState } from 'react';
import { Bus, User as UserIcon, AlertTriangle, Bell, Clock, Map as MapIcon, Shield, CreditCard, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function ParentDashboard() {
    const { user } = useAuth();

    const students = [
        { id: '1', name: 'Alex Johnson', status: 'Boarded', time: '08:12 AM', color: 'bg-green-500' },
        { id: '2', name: 'Mia Johnson', status: 'Pending', time: '03:15 PM', color: 'bg-white/20' },
    ];

    return (
        <div className="min-h-screen bg-black text-white p-6 font-sans flex flex-col relative overflow-hidden">
            {/* Ambient Glow */}
            <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-blue-600/5 blur-[120px] rounded-full"></div>

            {/* Header */}
            <div className="flex justify-between items-center mb-10 z-10">
                <div>
                    <h2 className="text-2xl font-black tracking-tight leading-none">Hello, {user?.name.split(' ')[0]}</h2>
                    <p className="text-white/30 font-bold uppercase tracking-widest text-[10px] mt-2">Greenwood Parent Portal</p>
                </div>
                <div className="flex gap-3">
                    <button className="w-11 h-11 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5">
                        <Bell className="w-5 h-5 text-white/40" />
                    </button>
                    <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center shadow-premium">
                        <Bus className="w-5 h-5 text-black" />
                    </div>
                </div>
            </div>

            {/* Live Status Hero */}
            <div className="z-10 bg-[#121212] rounded-[40px] p-8 border border-white/5 shadow-2xl mb-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -mr-32 -mt-32 group-hover:bg-blue-600/15 transition-all"></div>

                <div className="flex justify-between items-start mb-10 relative z-10">
                    <div>
                        <div className="px-4 py-1.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest mb-4 inline-block">
                            Live Tracking
                        </div>
                        <h3 className="text-4xl font-black tracking-tighter">In Transit</h3>
                        <p className="text-white/40 mt-2 font-bold flex items-center text-sm">
                            <Bus className="w-4 h-4 mr-2 text-blue-500" /> Bus 12 • Morning Route
                        </p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-3xl border border-white/10">
                        <MapIcon className="w-6 h-6 text-white" />
                    </div>
                </div>

                <div className="pt-6 border-t border-white/5 flex gap-6 items-center relative z-10">
                    <div className="flex-1">
                        <p className="text-white/30 text-[10px] font-black uppercase tracking-widest mb-1">ETA at Stop</p>
                        <p className="text-2xl font-black tracking-tight flex items-center">
                            <Clock className="w-5 h-5 mr-2 text-blue-500" /> 08:45 AM
                        </p>
                    </div>
                    <Link href="/parent/tracking" className="bg-white text-black px-6 py-4 rounded-2xl font-black text-sm hover:bg-blue-500 hover:text-white transition-all shadow-xl">
                        Track Now
                    </Link>
                </div>
            </div>

            {/* Students Section */}
            <div className="z-10 mb-8">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-black tracking-tight uppercase border-l-4 border-blue-600 pl-4">Your Children</h3>
                    <button className="text-blue-500 text-xs font-black uppercase tracking-widest">View All</button>
                </div>

                <div className="space-y-4">
                    {students.map((student) => (
                        <div key={student.id} className="bg-[#121212] rounded-3xl p-5 border border-white/5 flex items-center group hover:bg-[#181818] transition-all">
                            <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mr-5 border border-white/5">
                                <UserIcon className="w-7 h-7 text-white/20" />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-white text-lg tracking-tight">{student.name}</h4>
                                <p className="text-xs text-white/30 font-bold uppercase tracking-widest mt-1">
                                    {student.status} • {student.time}
                                </p>
                            </div>
                            <div className={`w-3 h-3 rounded-full ${student.color} shadow-[0_0_12px_rgba(34,197,94,0.4)]`}></div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="z-10 grid grid-cols-2 gap-4 mt-auto">
                <button className="bg-[#121212] rounded-3xl p-6 border border-white/5 hover:border-blue-600/30 transition-all text-left group">
                    <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center mb-6 border border-orange-500/20 group-hover:bg-orange-500 group-hover:text-white transition-all">
                        <AlertTriangle className="w-6 h-6 text-orange-500 group-hover:text-white" />
                    </div>
                    <span className="block font-black text-white tracking-tight uppercase text-xs">Report Absent</span>
                </button>

                <Link href="/parent/fees" className="bg-[#121212] rounded-3xl p-6 border border-white/5 hover:border-blue-600/30 transition-all text-left group">
                    <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center mb-6 border border-blue-600/20 group-hover:bg-blue-600 group-hover:text-white transition-all">
                        <CreditCard className="w-6 h-6 text-blue-600 group-hover:text-white" />
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="block font-black text-white tracking-tight uppercase text-xs">Pay Fees</span>
                        <ChevronRight className="w-4 h-4 text-white/20" />
                    </div>
                </Link>
            </div>

            {/* System Footer Spacer */}
            <div className="h-4"></div>
        </div>
    );
}
