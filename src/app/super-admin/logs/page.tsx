'use client';
import { Activity } from 'lucide-react';
import { useT } from '@/lib/i18n';

export default function SystemLogsPage() {
    const t = useT();
    return (
        <div className="space-y-6 animate-in">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <Activity className="w-7 h-7 text-[var(--brand)]" />
                        {t('System Logs', 'கணினி பதிவுகள்')}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('Platform activity logs', 'தள செயல்பாட்டு பதிவுகள்')}</p>
                </div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">
                    <Activity className="w-12 h-12 mx-auto text-slate-200 dark:text-slate-700 mb-4" />
                    <p className="font-medium">{t('No logs found', 'பதிவுகள் இல்லை')}</p>
                    <p className="text-xs mt-1">{t('Production log monitoring is active. Fresh events will appear here.', 'உற்பத்தி பதிவு கண்காணிப்பு செயலில் உள்ளது. புதிய நிகழ்வுகள் இங்கே தோன்றும்.')}</p>
                </div>
            </div>
        </div>
    );
}
