'use client';

import { useState } from 'react';
import { RefreshCw, LogOut, Smartphone } from 'lucide-react';

// QA multi-login page: four phone frames, each an isolated session (via ?ns=).
// Log into a different role in each frame and test the whole app side by side.
const FRAMES = [
    { ns: 'qa1', label: 'Screen 1' },
    { ns: 'qa2', label: 'Screen 2' },
    { ns: 'qa3', label: 'Screen 3' },
    { ns: 'qa4', label: 'Screen 4' },
];

export default function QAPage() {
    const [reloadKey, setReloadKey] = useState(0);

    const reloadAll = () => setReloadKey(k => k + 1);

    const clearAll = () => {
        try {
            Object.keys(localStorage)
                .filter(k => k.startsWith('ns_qa'))
                .forEach(k => localStorage.removeItem(k));
        } catch { /* ignore */ }
        reloadAll();
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white">
            {/* Toolbar */}
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-3 bg-slate-950/90 backdrop-blur border-b border-slate-800">
                <div className="flex items-center gap-2 min-w-0">
                    <Smartphone className="w-5 h-5 text-[var(--brand)] shrink-0" />
                    <div className="min-w-0">
                        <h1 className="font-bold text-sm leading-tight truncate">Onlive — QA Multi-Login</h1>
                        <p className="text-[11px] text-slate-400 leading-tight truncate">
                            Each screen is an isolated session — log in as a different role in each.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={reloadAll}
                        className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold transition-colors"
                    >
                        <RefreshCw className="w-3.5 h-3.5" /> Reload all
                    </button>
                    <button
                        onClick={clearAll}
                        className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/40 text-red-300 rounded-xl px-3 py-2 text-xs font-semibold transition-colors"
                    >
                        <LogOut className="w-3.5 h-3.5" /> Clear all sessions
                    </button>
                </div>
            </div>

            {/* Phone frames */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 p-4">
                {FRAMES.map(frame => (
                    <div key={frame.ns} className="flex flex-col items-center">
                        <div className="w-full max-w-[380px] bg-slate-950 rounded-[2rem] border-4 border-slate-700 shadow-2xl overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
                                <span className="text-xs font-bold text-slate-200">{frame.label}</span>
                                <span className="text-[10px] text-slate-500 font-mono">{frame.ns}</span>
                            </div>
                            <iframe
                                key={`${frame.ns}-${reloadKey}`}
                                src={`/login?ns=${frame.ns}`}
                                title={frame.label}
                                allow="geolocation"
                                className="w-full h-[72vh] bg-white"
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
