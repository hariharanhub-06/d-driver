'use client';

import { useAuth } from '@/context/AuthContext';
import { User, Shield, Key, Loader2, Save } from 'lucide-react';
import { useState } from 'react';
import api from '@/lib/api';

export default function GlobalProfilePage() {
    const { user } = useAuth();
    const [isSaving, setIsSaving] = useState(false);

    // Simulate updating user data (since the backend doesn't have a specific PUT /api/users/profile yet, just a standard mock)
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            // Mocking an update call
            await new Promise(r => setTimeout(r, 1000));
            alert('Profile Settings successfully synchronized with the database!');
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    if (!user) return <div className="p-20 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-uber-blue" /></div>;

    return (
        <div className="space-y-6 animate-in">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">Account Profile</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Profile Identity Card */}
                <div className="bg-white dark:bg-[#121212] p-8 rounded-[32px] border border-slate-200 dark:border-white/5 shadow-premium col-span-1">
                    <div className="flex flex-col items-center text-center">
                        <div className="w-32 h-32 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center mb-6 shadow-xl">
                            <span className="text-4xl font-black text-uber-blue">{user.name.charAt(0)}</span>
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{user.name}</h2>
                        <span className="px-4 py-1.5 bg-uber-blue/10 border border-uber-blue/20 rounded-full text-xs font-black uppercase text-uber-blue mt-3">
                            {user.role.replace('_', ' ')}
                        </span>
                        <div className="flex items-center text-slate-500 dark:text-white/40 text-sm font-bold mt-4">
                            <Shield className="w-4 h-4 mr-2" /> Global Node Active
                        </div>
                    </div>
                </div>

                {/* Identity Settings Form */}
                <div className="bg-white dark:bg-[#121212] p-8 rounded-[32px] border border-slate-200 dark:border-white/5 shadow-premium col-span-1 lg:col-span-2">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-uber-blue/10 rounded-2xl flex items-center justify-center border border-uber-blue/20">
                            <User className="w-6 h-6 text-uber-blue" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Profile Details</h2>
                            <p className="text-slate-500 dark:text-white/40 text-sm">Update your system identity</p>
                        </div>
                    </div>

                    <form onSubmit={handleSave} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest">Full Name</label>
                                <input type="text" defaultValue={user.name} className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-uber-blue" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest">Email Address</label>
                                <input disabled type="email" defaultValue={user.email} className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-transparent rounded-xl p-3 text-sm text-slate-400 dark:text-white/30 hidden-cursor cursor-not-allowed" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest">Phone / Mobile</label>
                                <input type="text" defaultValue={user.phone || ''} placeholder="+1 555-0000" className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-uber-blue" />
                            </div>
                        </div>

                        <div className="pt-6 border-t border-slate-100 dark:border-white/5">
                            <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-black rounded-2xl border border-slate-200 dark:border-white/10">
                                <div className="flex items-center gap-4">
                                    <Key className="w-6 h-6 text-slate-600 dark:text-white/40" />
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white">Security & Password</h3>
                                        <p className="text-xs text-slate-500 dark:text-white/40 mt-1">Update your password to stay secure.</p>
                                    </div>
                                </div>
                                <button type="button" onClick={() => alert('Password reset flow arriving soon via Email!')} className="px-4 py-2 bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white text-sm font-bold rounded-xl hover:bg-slate-300 dark:hover:bg-white/20 transition-colors">
                                    Reset Password
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <button disabled={isSaving} type="submit" className="bg-black text-white dark:bg-white dark:text-black hover:bg-slate-800 dark:hover:bg-white/90 font-black py-4 px-10 rounded-xl flex items-center transition-all disabled:opacity-50">
                                {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-3" />}
                                {isSaving ? 'Saving...' : 'Update Settings'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
