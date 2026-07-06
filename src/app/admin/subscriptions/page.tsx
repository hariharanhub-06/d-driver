'use client';

import { useEffect, useState } from 'react';
import { Check, X, Crown, Loader2, PackageOpen, IndianRupee } from 'lucide-react';
import api from '@/lib/api';
import { useT } from '@/lib/i18n';
import { PLAN_FEATURES, planAllows } from '@/lib/planFeatures';

interface PlanLineItem { label: string; description?: string; metric: string; unit_rate: number }
interface Plan {
    id: string;
    name: string;
    description?: string;
    plan_type?: string;
    permissions?: Record<string, boolean>;
    lineItems?: PlanLineItem[];
}
interface Subscription {
    holder_name?: string;
    plan?: Plan | null;
    effective_permissions?: Record<string, boolean>;
}

const METRIC_LABEL: Record<string, string> = {
    fixed: 'flat', per_bus: '/ bus', per_student: '/ student', per_route: '/ route',
    per_gps_hour: '/ GPS hr', per_km: '/ km', per_shift: '/ shift', custom: '',
};

export default function SubscriptionsPage() {
    const t = useT();
    const [sub, setSub] = useState<Subscription | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/billing/my-subscription')
            .then(res => setSub(res.data))
            .catch(() => setSub(null))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[var(--brand)]" /></div>;
    }

    const plan = sub?.plan || null;
    const perms = plan?.permissions;
    const billable = (plan?.lineItems || []).filter(li => !['expense', 'profit'].includes(li.metric));

    return (
        <div className="space-y-6 animate-in max-w-4xl mx-auto">
            <div className="py-4">
                <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">{t('Your Subscription', 'உங்கள் சந்தா')}</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('The plan and features active for your school.', 'உங்கள் பள்ளிக்கு செயலில் உள்ள திட்டமும் அம்சங்களும்.')}</p>
            </div>

            {!plan ? (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-10 text-center">
                    <PackageOpen className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                    <p className="font-bold text-slate-700 dark:text-slate-200">{t('No plan assigned yet', 'இன்னும் திட்டம் ஒதுக்கப்படவில்லை')}</p>
                    <p className="text-sm text-slate-400 mt-1">{t('Contact Onlive support to activate a subscription plan.', 'சந்தா திட்டத்தை செயல்படுத்த Onlive ஆதரவைத் தொடர்பு கொள்ளவும்.')}</p>
                </div>
            ) : (
                <>
                    {/* Current plan card */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-6">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-[var(--brand)]/10 text-[var(--brand)] flex items-center justify-center shrink-0">
                                    <Crown className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 dark:text-white leading-tight">{plan.name}</h2>
                                    {plan.description && <p className="text-sm text-slate-500 dark:text-slate-400">{plan.description}</p>}
                                </div>
                            </div>
                            <span className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shrink-0">{t('Active', 'செயலில்')}</span>
                        </div>

                        {billable.length > 0 && (
                            <div className="mt-5 border-t border-slate-100 dark:border-slate-700 pt-4">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">{t('Pricing', 'விலை')}</p>
                                <div className="flex flex-wrap gap-2">
                                    {billable.map((li, i) => (
                                        <span key={i} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 rounded-lg px-2.5 py-1.5">
                                            <IndianRupee className="w-3 h-3" />{li.unit_rate.toLocaleString('en-IN')}
                                            <span className="text-slate-400 font-normal">{METRIC_LABEL[li.metric] ?? ''} · {li.label}</span>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Included features */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-6">
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4">{t('Features', 'அம்சங்கள்')}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {PLAN_FEATURES.map(f => {
                                const included = planAllows(perms, f.key);
                                return (
                                    <div key={f.key} className={`flex items-start gap-2.5 p-3 rounded-xl border ${included ? 'border-slate-100 dark:border-slate-700' : 'border-slate-100 dark:border-slate-700 opacity-50'}`}>
                                        <span className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${included ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                                            {included ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                        </span>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-slate-800 dark:text-white">{f.label}</p>
                                            <p className="text-xs text-slate-400 dark:text-slate-500 leading-tight">{f.description}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <p className="text-xs text-slate-400 mt-4">{t('To change your plan or features, contact Onlive support.', 'உங்கள் திட்டத்தை மாற்ற Onlive ஆதரவைத் தொடர்பு கொள்ளவும்.')}</p>
                    </div>
                </>
            )}
        </div>
    );
}
