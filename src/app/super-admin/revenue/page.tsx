import { useState, useEffect } from 'react';
import api from '@/lib/api';

export default function GlobalRevenuePage() {
    const [revenue, setRevenue] = useState<number | null>(null);

    useEffect(() => {
        const fetchRevenue = async () => {
            try {
                const res = await api.get('/dashboard/stats');
                setRevenue(res.data.totalRevenue);
            } catch (error) {
                console.error('Error fetching revenue:', error);
            }
        };
        fetchRevenue();
    }, []);

    return (
        <div className="space-y-6 animate-in">
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">GLOBAL REVENUE</h1>
            <div className="bg-white dark:bg-[#121212] p-8 rounded-[32px] border border-slate-200 dark:border-white/5 shadow-premium">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <p className="text-slate-500 dark:text-white/40 text-xs font-black uppercase tracking-widest">Total Network Earnings</p>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-2 tracking-tighter">
                            {revenue === null ? 'Loading...' : `₹${(revenue / 100000).toFixed(2)}L`}
                        </h3>
                    </div>
                    <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/20">
                        <IndianRupee className="w-8 h-8 text-amber-500" />
                    </div>
                </div>
                <div className="h-48 border-dashed border-2 border-slate-200 dark:border-white/10 rounded-2xl flex items-center justify-center text-slate-500 dark:text-white/30 font-bold uppercase tracking-widest text-xs">
                    Network Transaction Charts (Live)
                </div>
            </div>
        </div>
    );
}

function IndianRupee({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M6 3h12" /><path d="M6 8h12" /><path d="m6 13 8.5 8" /><path d="M6 13h3" /><path d="M9 13c6.667 0 6.667-10 0-10" />
        </svg>
    );
}
