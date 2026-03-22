'use client';
import { IndianRupee, TrendingUp } from 'lucide-react';

export default function GlobalRevenuePage() {
    return (
        <div className="space-y-6 animate-in">
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">GLOBAL REVENUE</h1>
            <div className="bg-white dark:bg-[#121212] p-8 rounded-[32px] border border-slate-200 dark:border-white/5 shadow-premium">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <p className="text-slate-500 dark:text-white/40 text-xs font-black uppercase tracking-widest">Total Network Earnings</p>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-2 tracking-tighter">₹4.2M</h3>
                    </div>
                    <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/20">
                        <IndianRupee className="w-8 h-8 text-amber-500" />
                    </div>
                </div>
                <div className="h-48 border-dashed border-2 border-slate-200 dark:border-white/10 rounded-2xl flex items-center justify-center text-slate-500 dark:text-white/30 font-bold uppercase tracking-widest text-xs">
                    Revenue Charts Loading...
                </div>
            </div>
        </div>
    );
}
