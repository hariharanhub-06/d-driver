'use client';
import { Activity } from 'lucide-react';

export default function SystemLogsPage() {
    return (
        <div className="space-y-6 animate-in max-w-5xl mx-auto">
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">SYSTEM LOGS</h1>
            <div className="bg-white dark:bg-[#121212] p-20 rounded-[32px] border border-slate-200 dark:border-white/5 shadow-premium text-center">
                <Activity className="w-12 h-12 mx-auto text-slate-100 mb-4" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No System Events Recorded</p>
                <p className="text-slate-300 text-[10px] mt-1 font-medium italic">Production log monitoring is active. Fresh events will appear here.</p>
            </div>
        </div>
    );
}
