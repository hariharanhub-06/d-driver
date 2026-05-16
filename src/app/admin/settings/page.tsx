'use client';

import { useState, useEffect } from 'react';
import { School, CreditCard, CheckCircle2, XCircle, Loader2, Eye, EyeOff, CheckSquare } from 'lucide-react';
import api from '@/lib/api';

type SchoolInfo = {
    name?: string;
    address?: string;
    phone?: string;
    email_contact?: string;
    notification_email?: string;
    razorpay_configured?: boolean;
    onboarding_dismissed?: boolean;
};

const ONBOARDING_STEPS = [
    { label: 'Add your school information', desc: 'Fill in school name, address and contact.' },
    { label: 'Create your first bus', desc: 'Add at least one bus to the fleet.' },
    { label: 'Set up a route', desc: 'Create a morning or afternoon route.' },
    { label: 'Enroll students', desc: 'Add students and link them to parents.' },
    { label: 'Configure Razorpay', desc: 'Enable online fee collection.' },
];

export default function SettingsPage() {
    const [school, setSchool] = useState<SchoolInfo>({});
    const [loading, setLoading] = useState(true);
    const [infoForm, setInfoForm] = useState({ name: '', address: '', phone: '', email_contact: '', notification_email: '' });
    const [isSavingInfo, setIsSavingInfo] = useState(false);
    const [infoSaved, setInfoSaved] = useState(false);

    const [rzpForm, setRzpForm] = useState({ key_id: '', key_secret: '' });
    const [showSecret, setShowSecret] = useState(false);
    const [isSavingRzp, setIsSavingRzp] = useState(false);
    const [rzpSaved, setRzpSaved] = useState(false);

    const [isDismissing, setIsDismissing] = useState(false);

    useEffect(() => { fetchSchool(); }, []);

    const fetchSchool = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/schools/my');
            setSchool(data || {});
            setInfoForm({
                name: data?.name || '',
                address: data?.address || '',
                phone: data?.phone || '',
                email_contact: data?.email_contact || '',
                notification_email: data?.notification_email || '',
            });
        } catch {
            setSchool({});
        } finally {
            setLoading(false);
        }
    };

    const handleSaveInfo = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingInfo(true);
        setInfoSaved(false);
        try {
            await api.put('/schools/my', infoForm);
            setSchool(prev => ({ ...prev, ...infoForm }));
            setInfoSaved(true);
            setTimeout(() => setInfoSaved(false), 3000);
        } catch { /* ignore */ }
        setIsSavingInfo(false);
    };

    const handleSaveRzp = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingRzp(true);
        setRzpSaved(false);
        try {
            await api.put('/schools/my/razorpay', rzpForm);
            setSchool(prev => ({ ...prev, razorpay_configured: true }));
            setRzpSaved(true);
            setRzpForm({ key_id: '', key_secret: '' });
            setTimeout(() => setRzpSaved(false), 3000);
        } catch { /* ignore */ }
        setIsSavingRzp(false);
    };

    const handleDismissOnboarding = async () => {
        setIsDismissing(true);
        try {
            await api.post('/schools/my/dismiss-onboarding');
            setSchool(prev => ({ ...prev, onboarding_dismissed: true }));
        } catch { /* ignore */ }
        setIsDismissing(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in max-w-3xl">
            <div>
                <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Settings</h1>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Manage school information, integrations and onboarding.</p>
            </div>

            {/* Onboarding Checklist */}
            {!school.onboarding_dismissed && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                                <CheckSquare className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <h2 className="font-black text-gray-900 dark:text-white">Getting Started</h2>
                                <p className="text-xs text-gray-400">Complete these steps to set up your portal</p>
                            </div>
                        </div>
                        <button
                            onClick={handleDismissOnboarding}
                            disabled={isDismissing}
                            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 font-bold transition-all"
                        >
                            {isDismissing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Dismiss'}
                        </button>
                    </div>
                    <div className="space-y-3">
                        {ONBOARDING_STEPS.map((step, i) => (
                            <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-xl">
                                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                                    {i + 1}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-800 dark:text-white">{step.label}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">{step.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* School Info */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                        <School className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h2 className="font-black text-gray-900 dark:text-white">School Information</h2>
                        <p className="text-xs text-gray-400">Basic details shown on invoices and notifications</p>
                    </div>
                </div>
                <form onSubmit={handleSaveInfo} className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">School Name</label>
                        <input type="text" placeholder="e.g. Sunrise Public School" className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500" value={infoForm.name} onChange={e => setInfoForm({ ...infoForm, name: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Address</label>
                        <textarea rows={2} placeholder="School address..." className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" value={infoForm.address} onChange={e => setInfoForm({ ...infoForm, address: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Phone</label>
                            <input type="tel" placeholder="+91 98765 43210" className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500" value={infoForm.phone} onChange={e => setInfoForm({ ...infoForm, phone: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Contact Email</label>
                            <input type="email" placeholder="admin@school.com" className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500" value={infoForm.email_contact} onChange={e => setInfoForm({ ...infoForm, email_contact: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Notification Email</label>
                        <input type="email" placeholder="notifications@school.com" className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500" value={infoForm.notification_email} onChange={e => setInfoForm({ ...infoForm, notification_email: e.target.value })} />
                    </div>
                    <div className="flex items-center gap-3 pt-2">
                        <button type="submit" disabled={isSavingInfo} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-60 flex items-center gap-2">
                            {isSavingInfo ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            Save Changes
                        </button>
                        {infoSaved && (
                            <span className="flex items-center gap-1.5 text-emerald-600 text-sm font-bold">
                                <CheckCircle2 className="w-4 h-4" /> Saved
                            </span>
                        )}
                    </div>
                </form>
            </div>

            {/* Razorpay Integration */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                            <CreditCard className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="font-black text-gray-900 dark:text-white">Razorpay Integration</h2>
                            <p className="text-xs text-gray-400">Enable online fee collection via Razorpay</p>
                        </div>
                    </div>
                    {school.razorpay_configured ? (
                        <span className="flex items-center gap-1.5 text-emerald-600 text-xs font-black">
                            <CheckCircle2 className="w-4 h-4" /> Connected
                        </span>
                    ) : (
                        <span className="flex items-center gap-1.5 text-red-500 text-xs font-black">
                            <XCircle className="w-4 h-4" /> Not configured
                        </span>
                    )}
                </div>
                <form onSubmit={handleSaveRzp} className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Key ID</label>
                        <input
                            type="text"
                            placeholder="rzp_live_..."
                            className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                            value={rzpForm.key_id}
                            onChange={e => setRzpForm({ ...rzpForm, key_id: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Key Secret</label>
                        <div className="relative">
                            <input
                                type={showSecret ? 'text' : 'password'}
                                placeholder="Your Razorpay secret"
                                className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 pr-10 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                                value={rzpForm.key_secret}
                                onChange={e => setRzpForm({ ...rzpForm, key_secret: e.target.value })}
                            />
                            <button type="button" onClick={() => setShowSecret(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-all">
                                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 pt-2">
                        <button type="submit" disabled={isSavingRzp || !rzpForm.key_id || !rzpForm.key_secret} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-60 flex items-center gap-2">
                            {isSavingRzp ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            Save Keys
                        </button>
                        {rzpSaved && (
                            <span className="flex items-center gap-1.5 text-emerald-600 text-sm font-bold">
                                <CheckCircle2 className="w-4 h-4" /> Saved
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-gray-400">Keys are stored securely and never exposed to the client after saving.</p>
                </form>
            </div>
        </div>
    );
}
