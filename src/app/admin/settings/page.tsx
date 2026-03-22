'use client';

import { Bell, Shield, Wallet, Globe } from 'lucide-react';

export default function SettingsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Account Settings</h1>
                <p className="text-slate-500 text-sm mt-1">Manage your institutional preferences and security settings.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card p-0 md:col-span-1">
                    <nav className="flex flex-col">
                        <button className="px-6 py-4 text-left border-b border-[var(--border)] bg-slate-50/50 flex items-center font-semibold text-primary-600">
                            <Shield className="w-5 h-5 mr-3" /> Security
                        </button>
                        <button className="px-6 py-4 text-left border-b border-[var(--border)] flex items-center text-slate-600 hover:bg-slate-50/50">
                            <Bell className="w-5 h-5 mr-3" /> Notifications
                        </button>
                        <button className="px-6 py-4 text-left border-b border-[var(--border)] flex items-center text-slate-600 hover:bg-slate-50/50">
                            <Wallet className="w-5 h-5 mr-3" /> Billing
                        </button>
                        <button className="px-6 py-4 text-left flex items-center text-slate-600 hover:bg-slate-50/50">
                            <Globe className="w-5 h-5 mr-3" /> Language & Region
                        </button>
                    </nav>
                </div>

                <div className="card md:col-span-2 space-y-6">
                    <h3 className="font-bold text-lg">Institution Profile</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Institution Name</label>
                            <input type="text" className="input-field" defaultValue="D-Driver Academy" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Contact Email</label>
                            <input type="email" className="input-field" defaultValue="admin@d-driver.com" />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Timezone</label>
                        <select className="input-field">
                            <option>Greenwich Mean Time (GMT +0:00)</option>
                            <option>India Standard Time (IST +5:30)</option>
                        </select>
                    </div>

                    <div className="pt-4 border-t border-[var(--border)]">
                        <button className="btn-primary px-8">Save Changes</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
