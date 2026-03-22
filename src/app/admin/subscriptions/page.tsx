'use client';

import { Check, Zap, Shield, Crown } from 'lucide-react';

export default function SubscriptionsPage() {
    const plans = [
        { name: 'Basic', price: '₹4,999', icon: Zap, color: 'text-blue-500', features: ['Up to 5 Buses', 'Real-time Tracking', 'Daily Reports', 'Standard Support'] },
        { name: 'Premium', price: '₹9,999', icon: Crown, color: 'text-amber-500', current: true, features: ['Unlimited Buses', 'Advanced Analytics', 'Parent PWA Access', 'Priority 24/7 Support', 'Custom Branding'] },
        { name: 'Enterprise', price: 'Custom', icon: Shield, color: 'text-purple-500', features: ['Multi-Institutional', 'API Access', 'Dedicated Manager', 'On-premise Options'] },
    ];

    return (
        <div className="space-y-6">
            <div className="text-center max-w-2xl mx-auto py-8">
                <h1 className="text-3xl font-bold tracking-tight mb-3">Simple, Transparent Pricing</h1>
                <p className="text-slate-500">Choose the perfect transport management plan for your institution.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {plans.map((plan) => (
                    <div key={plan.name} className={`card flex flex-col relative ${plan.current ? 'border-primary-500 ring-4 ring-primary-50 dark:ring-primary-900/20' : ''}`}>
                        {plan.current && (
                            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">Current Plan</span>
                        )}
                        <div className="flex items-center mb-6">
                            <div className={`w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center mr-4 ${plan.color}`}>
                                <plan.icon className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-xl">{plan.name}</h3>
                                <p className="text-slate-500 text-sm">per institution / month</p>
                            </div>
                        </div>

                        <div className="mb-6">
                            <span className="text-4xl font-black">{plan.price}</span>
                        </div>

                        <ul className="space-y-4 flex-1 mb-8">
                            {plan.features.map(f => (
                                <li key={f} className="flex items-start text-sm text-slate-600 dark:text-slate-300">
                                    <Check className="w-4 h-4 mr-3 text-emerald-500 mt-0.5 shrink-0" /> {f}
                                </li>
                            ))}
                        </ul>

                        <button className={`w-full py-3 rounded-xl font-bold transition-all ${plan.current ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-600/20'}`}>
                            {plan.current ? 'Your Current Plan' : 'Upgrade Now'}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
