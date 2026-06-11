'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { ShieldCheck, Calendar, CheckCircle2, ArrowUpRight } from 'lucide-react';
import { useT } from '@/lib/i18n';

export default function SubscriptionsPage() {
    const t = useT();
    const [schools, setSchools] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSchools = async () => {
            try {
                const res = await api.get('/schools');
                setSchools(res.data);
            } catch (error) {
                console.error('Error fetching schools for subscriptions:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchSchools();
    }, []);

    const plans = [
        { id: 1, name: t('Basic', 'அடிப்படை'), schools: schools.filter(s => s.subscription_plan === 'Basic' || !s.subscription_plan).length, price: '₹9,999/mo', icon: ShieldCheck },
        { id: 2, name: t('Standard', 'நிலையான'), schools: schools.filter(s => s.subscription_plan === 'Standard').length, price: '₹19,999/mo', icon: ShieldCheck },
        { id: 3, name: t('Enterprise', 'நிறுவனம்'), schools: schools.filter(s => s.subscription_plan === 'Enterprise').length, price: '₹49,999/mo', icon: ShieldCheck },
    ];

    const mrr = plans.reduce((acc, plan) => {
        const price = parseInt(plan.price.replace(/[^\d]/g, ''));
        return acc + (plan.schools * price);
    }, 0);

    return (
        <div className="space-y-6 animate-in">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <ShieldCheck className="w-7 h-7 text-[var(--brand)]" />
                        {t('Subscriptions', 'சந்தாக்கள்')}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('Manage school subscription plans', 'பள்ளி சந்தா திட்டங்களை நிர்வகிக்கவும்')}</p>
                </div>
                <div className="bg-[var(--brand)] text-white rounded-2xl p-6 shadow-lg shadow-[var(--brand)]/20">
                    <p className="text-xs font-semibold uppercase tracking-wider opacity-80 mb-1">M.R.R</p>
                    <p className="text-2xl font-bold">₹{(mrr / 1000).toFixed(1)}K</p>
                </div>
            </div>

            {/* Plan Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map((plan) => (
                    <div key={plan.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 hover:shadow-md transition-all group">
                        <div className="w-12 h-12 bg-slate-50 dark:bg-slate-700 rounded-xl flex items-center justify-center mb-5 border border-slate-100 dark:border-slate-600 group-hover:bg-[var(--brand)]/10 group-hover:border-[var(--brand)]/20 transition-colors">
                            <plan.icon className="w-6 h-6 text-slate-400 group-hover:text-[var(--brand)] transition-colors" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{plan.name}</h3>
                        <p className="text-2xl font-bold text-[var(--brand)] mb-5">{plan.price}</p>

                        <div className="space-y-3 mb-6">
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-medium text-slate-500 dark:text-slate-400">{t('Active Schools', 'செயலில் பள்ளிகள்')}</span>
                                <span className="font-bold text-slate-900 dark:text-white">{loading ? t('Loading...', 'ஏற்றுகிறது...') : plan.schools}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-medium text-slate-500 dark:text-slate-400">{t('Growth Rate', 'வளர்ச்சி விகிதம்')}</span>
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center">Live <ArrowUpRight className="w-3 h-3 ml-1" /></span>
                            </div>
                        </div>

                        <button className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-slate-700 text-white font-semibold text-sm hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors">
                            {t('Configure Plan', 'திட்டம் கட்டமை')}
                        </button>
                    </div>
                ))}
            </div>

            {/* License Manager */}
            <div className="bg-slate-900 rounded-2xl p-8 text-white border border-slate-800 shadow-xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
                    <div>
                        <h2 className="text-2xl font-bold mb-3">{t('License Manager', 'உரிம மேலாளர்')}</h2>
                        <p className="text-slate-400 text-sm mb-6">{t('All school licenses are currently validated through the Neon PostgreSQL cluster.', 'அனைத்து பள்ளி உரிமங்களும் தற்போது Neon PostgreSQL கொத்தகம் மூலம் சரிபார்க்கப்படுகின்றன.')}</p>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 bg-white/5 p-4 rounded-xl border border-white/10">
                                <CheckCircle2 className="text-emerald-400 w-5 h-5 shrink-0" />
                                <span className="text-sm font-medium">{t('Network Wide Synced', 'நெட்வொர்க் முழுவதும் ஒத்திசைக்கப்பட்டது')}</span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                        <div className="flex items-center justify-between mb-6">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{t('Database Consistency', 'தரவுத்தள நிலைத்தன்மை')}</p>
                            <Calendar className="w-4 h-4 text-[var(--brand)]" />
                        </div>
                        <div className="space-y-4">
                            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full w-full bg-[var(--brand)]"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
