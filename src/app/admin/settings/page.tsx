'use client';
import { Settings, Shield } from 'lucide-react';

export default function AdminSettingsPage() {
    return (
        <div className="space-y-6 animate-in">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">ADMINISTRATOR SETTINGS</h1>
            <div className="bg-white dark:bg-[#121212] p-8 rounded-[32px] border border-slate-200 dark:border-white/5 shadow-premium">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/20 rounded-2xl flex items-center justify-center border border-primary-200 dark:border-primary-500/20">
                        <Settings className="w-8 h-8 text-primary-600 dark:text-primary-500" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Profile Configuration</h2>
                        <p className="text-slate-500 dark:text-white/40 text-sm">Manage your security tokens and preferences</p>
                    </div>
                </div>

                <div className="space-y-4 max-w-2xl">
                    <div className="p-6 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Shield className="w-6 h-6 text-emerald-500" />
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white">Two-Factor Authentication</h3>
                                <p className="text-sm text-slate-500 dark:text-white/40">Secure your account with OTP triggers</p>
                            </div>
                        </div>
                        <button className="px-4 py-2 bg-slate-900 text-white dark:bg-white dark:text-black text-sm font-bold rounded-xl" onClick={() => alert('2FA Settings coming soon.')}>Configure</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
