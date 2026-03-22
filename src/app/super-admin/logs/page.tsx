'use client';
import { Activity } from 'lucide-react';

export default function SystemLogsPage() {
    return (
        <div className="space-y-6 animate-in">
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">SYSTEM LOGS</h1>
            <div className="bg-white dark:bg-[#121212] p-8 rounded-[32px] border border-slate-200 dark:border-white/5 shadow-premium">
                <p className="text-slate-500 dark:text-white/40 text-xs font-black uppercase tracking-widest mb-6">Real-Time Event Stream</p>
                <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
                            <div className="flex items-center mb-2 md:mb-0">
                                <Activity className="w-5 h-5 text-blue-500 mr-4" />
                                <div>
                                    <p className="text-slate-900 dark:text-white font-bold text-sm">System Process Executed</p>
                                    <p className="text-slate-500 dark:text-white/30 text-xs font-medium uppercase tracking-wider">Node: ap-southeast-2</p>
                                </div>
                            </div>
                            <span className="text-slate-400 dark:text-white/40 text-[10px] font-black uppercase tracking-widest text-right">Just Now</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
