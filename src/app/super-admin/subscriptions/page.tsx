'use client';

import { ShieldCheck, Calendar, CheckCircle2, AlertCircle, ArrowUpRight, DollarSign, Clock } from 'lucide-react';

export default function SubscriptionsPage() {
    const plans = [
        { id: 1, name: 'Standard', schools: 12, price: '$49/mo', status: 'Active', growth: '+12%' },
        { id: 2, name: 'Enterprise', schools: 45, price: '$199/mo', status: 'Active', growth: '+25%' },
        { id: 3, name: 'Infinite', schools: 8, price: '$499/mo', status: 'Legacy', growth: '-5%' },
    ];

    return (
        <div className="space-y-8 animate-in p-2 max-w-7xl mx-auto">
            <div className="flex justify-between items-center bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Subscription Plans</h1>
                    <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-1 flex items-center">
                        <ShieldCheck className="w-3 h-3 mr-1 text-primary-500" /> Revenue & Licensing Control
                    </p>
                </div>
                <div className="flex gap-4">
                    <div className="bg-primary-50 px-6 py-3 rounded-2xl border border-primary-100 flex flex-col items-center">
                        <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest leading-none mb-1">M.R.R</p>
                        <p className="text-xl font-black text-primary-700 leading-none">₹12.4K</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {plans.map((plan) => (
                    <div key={plan.id} className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm hover:shadow-xl transition-all group">
                        <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mb-6 border border-gray-100 group-hover:bg-primary-50 transition-colors">
                            <ShieldCheck className="w-6 h-6 text-gray-300 group-hover:text-primary-500 transition-colors" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 mb-1">{plan.name}</h3>
                        <p className="text-3xl font-black text-primary-500 mb-6">{plan.price.replace('$', '₹')}</p>

                        <div className="space-y-4 mb-8">
                            <div className="flex justify-between items-center text-sm font-bold text-slate-500">
                                <span>Active Schools</span>
                                <span className="text-slate-900">{plan.schools}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm font-bold text-slate-500">
                                <span>Growth Rate</span>
                                <span className="text-green-500 flex items-center">{plan.growth} <ArrowUpRight className="w-3 h-3 ml-1" /></span>
                            </div>
                        </div>

                        <button className="w-full py-4 rounded-2xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10">
                            Configure Plan
                        </button>
                    </div>
                ))}
            </div>

            <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white overflow-hidden relative border border-white/10 shadow-2xl">
                <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                    <div>
                        <h2 className="text-3xl font-black tracking-tight mb-4 uppercase">License Alerts</h2>
                        <p className="text-slate-400 font-medium mb-8">System detected 3 legacy accounts with pending subscription renewals.</p>
                        <div className="space-y-4">
                            <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
                                <AlertCircle className="text-orange-400 w-5 h-5 shrink-0" />
                                <span className="text-sm font-bold">St. Mary's Academy - Expires in 48h</span>
                            </div>
                            <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 opacity-60">
                                <AlertCircle className="text-red-400 w-5 h-5 shrink-0" />
                                <span className="text-sm font-bold">Lakeside District - Subscription Suspended</span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white/5 rounded-3xl p-8 border border-white/10">
                        <div className="flex items-center justify-between mb-8">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Schools Processed</p>
                            <Calendar className="w-4 h-4 text-primary-500" />
                        </div>
                        <div className="space-y-6">
                            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full w-3/4 bg-primary-500 animate-pulse"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
