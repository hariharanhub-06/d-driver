'use client';

import { useEffect, useState } from 'react';
import { Check, X, Crown, Loader2, PackageOpen } from 'lucide-react';
import api from '@/lib/api';
import { useT } from '@/lib/i18n';
import { PLAN_FEATURES, planAllows } from '@/lib/planFeatures';

interface Plan {
    id: string;
    name: string;
    description?: string;
    permissions?: Record<string, boolean>;
}
interface ParentSub { student_id: string; student_name: string; plan: Plan }

export default function ParentSubscription() {
    const t = useT();
    const [subs, setSubs] = useState<ParentSub[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/billing/my-subscription')
            .then(res => setSubs(Array.isArray(res.data?.subscriptions) ? res.data.subscriptions : []))
            .catch(() => setSubs([]))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[var(--brand)]" /></div>;
    }

    return (
        <div className="px-4 pt-4 pb-24 space-y-5 max-w-lg mx-auto">
            <div>
                <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">{t('My Subscription', 'எனது சந்தா')}</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{t('Your plan and included features.', 'உங்கள் திட்டமும் அம்சங்களும்.')}</p>
            </div>

            {subs.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-8 text-center">
                    <PackageOpen className="w-9 h-9 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                    <p className="font-bold text-slate-700 dark:text-slate-200">{t('No individual plan', 'தனிப்பட்ட திட்டம் இல்லை')}</p>
                    <p className="text-sm text-slate-400 mt-1">{t('Your transport is billed through your school.', 'உங்கள் போக்குவரத்து பள்ளி மூலம் கட்டணமிடப்படுகிறது.')}</p>
                </div>
            ) : (
                subs.map(s => {
                    const perms = s.plan?.permissions;
                    return (
                        <div key={s.student_id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-xl bg-[var(--brand)]/10 text-[var(--brand)] flex items-center justify-center shrink-0">
                                    <Crown className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-lg font-black text-slate-900 dark:text-white leading-tight truncate">{s.plan?.name}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{s.student_name}</p>
                                </div>
                            </div>
                            {s.plan?.description && <p className="text-sm text-slate-500 dark:text-slate-400">{s.plan.description}</p>}
                            <div className="space-y-2">
                                {PLAN_FEATURES.map(f => {
                                    const included = planAllows(perms, f.key);
                                    return (
                                        <div key={f.key} className={`flex items-center gap-2.5 ${included ? '' : 'opacity-45'}`}>
                                            <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${included ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                                                {included ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                            </span>
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{f.label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
}
