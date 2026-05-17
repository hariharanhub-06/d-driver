'use client';
import { Activity } from 'lucide-react';

export default function SystemLogsPage() {
    return (
        <div className="space-y-6 animate-in">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <Activity className="w-7 h-7 text-[var(--brand)]" />
                        System Logs
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Production log monitoring and audit trail</p>
                </div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">
                    <Activity className="w-12 h-12 mx-auto text-slate-200 dark:text-slate-700 mb-4" />
                    <p className="font-medium">No System Events Recorded</p>
                    <p className="text-xs mt-1">Production log monitoring is active. Fresh events will appear here.</p>
                </div>
            </div>
        </div>
    );
}
