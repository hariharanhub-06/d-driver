'use client';
import { Settings, Shield, User, Bell, Lock, Database } from 'lucide-react';

export default function AdminSettingsPage() {
    return (
        <div className="space-y-6 animate-in max-w-4xl">
            <div className="shrink-0">
                <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none uppercase">System Configuration</h1>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-2">Manage institutional security, preferences, and data tokens.</p>
            </div>

            <div className="card p-6 border-none shadow-xl bg-white dark:bg-[#121212]">
                <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100 dark:border-white/5">
                    <div className="w-12 h-12 bg-primary-50 dark:bg-primary-900/20 rounded-xl flex items-center justify-center border border-primary-100 dark:border-primary-500/10">
                        <User className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-slate-900 dark:text-white leading-none">Administrative Profile</h2>
                        <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider">Primary identity and access management.</p>
                    </div>
                </div>

                <div className="space-y-3.5">
                    {[
                        { icon: Shield, title: 'Two-Factor Auth', desc: 'Secure your login with biometric or OTP triggers.', action: 'Configure', color: 'text-emerald-500', bg: 'bg-emerald-50' },
                        { icon: Bell, title: 'Notification Hub', desc: 'Control which alerts reach your dashboard and email.', action: 'Manage', color: 'text-blue-500', bg: 'bg-blue-50' },
                        { icon: Lock, title: 'Password Entropy', desc: 'Update your access credentials with high-strength keys.', action: 'Reset', color: 'text-purple-500', bg: 'bg-purple-50' },
                        { icon: Database, title: 'Data Retention', desc: 'Configure how long logs and student data are stored.', action: 'Policy', color: 'text-amber-500', bg: 'bg-amber-50' },
                    ].map((item) => (
                        <div key={item.title} className="p-4 bg-slate-50/50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 flex items-center justify-between group hover:border-slate-200 transition-all">
                            <div className="flex items-center gap-3.5">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${item.bg} ${item.color}`}>
                                    <item.icon size={16} />
                                </div>
                                <div>
                                    <h3 className="font-black text-xs text-slate-900 dark:text-white uppercase tracking-widest">{item.title}</h3>
                                    <p className="text-[10px] text-slate-500 dark:text-white/40 font-medium">{item.desc}</p>
                                </div>
                            </div>
                            <button className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 dark:bg-white/10 dark:text-white dark:border-none text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm hover:bg-slate-50 transition-all" onClick={() => alert(`${item.title} settings coming soon.`)}>{item.action}</button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="pt-4">
                <button className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:bg-red-50 px-4 py-2 rounded-xl transition-all">Deactivate Institutional Instance</button>
            </div>
        </div>
    );
}
