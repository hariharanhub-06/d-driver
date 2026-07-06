'use client';

import { IdCard, Sparkles, Lock } from 'lucide-react';
import { useT } from '@/lib/i18n';

export default function StudentPassportPage() {
    const t = useT();
    return (
        <div className="px-4 pt-8 pb-24 flex flex-col items-center text-center max-w-md mx-auto">
            <div className="relative mb-6">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[var(--brand)] to-[var(--accent)] flex items-center justify-center shadow-xl shadow-[var(--brand)]/30">
                    <IdCard className="w-12 h-12 text-white" />
                </div>
                <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center shadow-lg">
                    <Lock className="w-4 h-4 text-white" />
                </span>
            </div>

            <div className="inline-flex items-center gap-1.5 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[11px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full mb-4">
                <Sparkles className="w-3.5 h-3.5" /> {t('Premium Feature', 'பிரீமியம் அம்சம்')}
            </div>

            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mb-2">
                {t('Student Passport', 'மாணவர் பாஸ்போர்ட்')}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                {t(
                    'A living digital record of your child — talents, achievements, milestones and more, all in one beautiful passport. Coming soon.',
                    'உங்கள் குழந்தையின் திறமைகள், சாதனைகள் மற்றும் மைல்கற்களை ஒரே இடத்தில் காணும் டிஜிட்டல் பதிவு. விரைவில் வருகிறது.',
                )}
            </p>

            <div className="w-full bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">{t("What's coming", 'வரவிருப்பவை')}</p>
                <ul className="space-y-2.5 text-left">
                    {[
                        t('Talent & achievement records', 'திறமை & சாதனை பதிவுகள்'),
                        t('Digital ID & QR verification', 'டிஜிட்டல் அடையாள அட்டை & QR'),
                        t('Milestones and certificates', 'மைல்கற்கள் & சான்றிதழ்கள்'),
                    ].map((line, i) => (
                        <li key={i} className="flex items-center gap-2.5 text-sm font-medium text-slate-600 dark:text-slate-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand)]" /> {line}
                        </li>
                    ))}
                </ul>
            </div>

            <p className="text-xs text-slate-400 mt-6">
                {t("We'll notify you the moment it's ready.", 'தயாரானதும் உங்களுக்கு அறிவிப்போம்.')}
            </p>
        </div>
    );
}
