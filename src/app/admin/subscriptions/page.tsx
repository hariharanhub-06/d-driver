'use client';

import { Check, Zap, Shield, Crown } from 'lucide-react';

export default function SubscriptionsPage() {
    const plans = [
        { name: 'Basic', price: '₹4,999', icon: Zap, color: 'text-blue-500', features: ['Up to 5 Buses', 'Real-time Tracking', 'Daily Reports', 'Standard Support'] },
        { name: 'Premium', price: '₹9,999', icon: Crown, color: 'text-amber-500', current: true, features: ['Unlimited Buses', 'Advanced Analytics', 'Parent PWA Access', 'Priority 24/7 Support', 'Custom Branding'] },
        { name: 'Enterprise', price: 'Custom', icon: Shield, color: 'text-purple-500', features: ['Multi-Institutional', 'API Access', 'Dedicated Manager', 'On-premise Options'] },
    ];

    return (
        <div className="space-y-6 animate-in">
            <div className="text-center max-w-xl mx-auto py-6">
                <h1 className="text-2xl font-black tracking-tight mb-2">Institutional Licensing</h1>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest leading-relaxed">Select a transport management tier that scales with your fleet.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {plans.map((plan) => (
                    <div key={plan.name} className={`card flex flex-col relative p-5 border-none shadow-xl ${plan.current ? 'ring-2 ring-primary-500 shadow-primary-100' : ''}`}>
                        {plan.current && (
                            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary-600 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">Active Plan</span>
                        )}
                        <div className="flex items-center mb-5">
                            <div className={`w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center mr-3 ${plan.color}`}>
                                <plan.icon className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-black text-lg leading-none">{plan.name}</h3>
                                <p className="text-slate-400 text-[9px] font-bold mt-1 uppercase tracking-wider">Per Institution / Mo</p>
                            </div>
                        </div>

                        <div className="mb-6">
                            <span className="text-3xl font-black tracking-tighter">{plan.price}</span>
                        </div>

                        <ul className="space-y-3 flex-1 mb-6">
                            {plan.features.map(f => (
                                <li key={f} className="flex items-start text-xs text-slate-600 dark:text-slate-300 font-medium">
                                    <Check className="w-3.5 h-3.5 mr-2.5 text-emerald-500 mt-0.5 shrink-0" /> {f}
                                </li>
                            ))}
                        </ul>

                        <button className={`w-full py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${plan.current ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-200'}`}>
                            {plan.current ? 'Currently Active' : 'Upgrade License'}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
