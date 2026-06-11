'use client';

import { useState, useEffect, useRef } from 'react';
import { School, CreditCard, CheckCircle2, XCircle, Loader2, Eye, EyeOff, CheckSquare, Shield, Lock, Camera, User } from 'lucide-react';
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

type ActiveTab = 'school' | 'razorpay' | 'security';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<ActiveTab>('school');
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

    // Change password state
    const [cpForm, setCpForm] = useState({ current: '', new: '', confirm: '' });
    const [cpError, setCpError] = useState('');
    const [cpSuccess, setCpSuccess] = useState(false);
    const [cpLoading, setCpLoading] = useState(false);

    // Profile photo state
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [photoUploading, setPhotoUploading] = useState(false);
    const photoInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchSchool();
        api.get('/users/me').then(r => setPhotoUrl(r.data?.profile_photo_url || null)).catch(() => {});
    }, []);

    const handlePhotoUpload = async (file: File) => {
        setPhotoUploading(true);
        try {
            const fd = new FormData();
            fd.append('photo', file);
            const res = await api.post('/upload/profile-photo', fd, { headers: { 'Content-Type': undefined } });
            setPhotoUrl(res.data.url);
        } catch { alert('Photo upload failed'); }
        finally { setPhotoUploading(false); }
    };

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

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setCpError(''); setCpSuccess(false);
        if (cpForm.new !== cpForm.confirm) { setCpError('Passwords do not match'); return; }
        if (cpForm.new.length < 8) { setCpError('Password must be at least 8 characters'); return; }
        setCpLoading(true);
        try {
            await api.post('/auth/change-password', { current_password: cpForm.current, new_password: cpForm.new });
            setCpSuccess(true);
            setCpForm({ current: '', new: '', confirm: '' });
        } catch (err: any) {
            setCpError(err.response?.data?.error || 'Failed to change password');
        } finally { setCpLoading(false); }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin"></div></div>
        );
    }

    const tabs: { key: ActiveTab; label: string; icon: React.ReactNode }[] = [
        { key: 'school', label: 'School Info', icon: <School className="w-4 h-4" /> },
        { key: 'razorpay', label: 'Razorpay', icon: <CreditCard className="w-4 h-4" /> },
        { key: 'security', label: 'Security', icon: <Shield className="w-4 h-4" /> },
    ];

    return (
        <div className="space-y-6 animate-in max-w-3xl">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage school information, integrations and onboarding.</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-100 dark:border-slate-700 gap-1">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-all ${
                            activeTab === tab.key
                                ? 'text-[var(--brand)] border-b-2 border-[var(--brand)]'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border-b-2 border-transparent'
                        }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* School Info Tab */}
            {activeTab === 'school' && (
                <>
                    {/* Onboarding Checklist */}
                    {!school.onboarding_dismissed && (
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                                        <CheckSquare className="w-5 h-5 text-[var(--brand)]" />
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-slate-900 dark:text-white">Getting Started</h2>
                                        <p className="text-xs text-slate-400">Complete these steps to set up your portal</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleDismissOnboarding}
                                    disabled={isDismissing}
                                    className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-semibold transition-all"
                                >
                                    {isDismissing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Dismiss'}
                                </button>
                            </div>
                            <div className="space-y-3">
                                {ONBOARDING_STEPS.map((step, i) => (
                                    <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                                        <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                                            {i + 1}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800 dark:text-white">{step.label}</p>
                                            <p className="text-xs text-slate-400 mt-0.5">{step.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* School Info Form */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                                <School className="w-5 h-5 text-[var(--brand)]" />
                            </div>
                            <div>
                                <h2 className="font-bold text-slate-900 dark:text-white">School Information</h2>
                                <p className="text-xs text-slate-400">Basic details shown on invoices and notifications</p>
                            </div>
                        </div>
                        <form onSubmit={handleSaveInfo} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">School Name</label>
                                <input type="text" placeholder="e.g. Sunrise Public School" className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors" value={infoForm.name} onChange={e => setInfoForm({ ...infoForm, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Address</label>
                                <textarea rows={2} placeholder="School address..." className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors resize-none" value={infoForm.address} onChange={e => setInfoForm({ ...infoForm, address: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Phone</label>
                                    <input type="tel" placeholder="+91 98765 43210" className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors" value={infoForm.phone} onChange={e => setInfoForm({ ...infoForm, phone: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Contact Email</label>
                                    <input type="email" placeholder="admin@school.com" className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors" value={infoForm.email_contact} onChange={e => setInfoForm({ ...infoForm, email_contact: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Notification Email</label>
                                <input type="email" placeholder="notifications@school.com" className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors" value={infoForm.notification_email} onChange={e => setInfoForm({ ...infoForm, notification_email: e.target.value })} />
                            </div>
                            <div className="flex items-center gap-3 pt-2">
                                <button type="submit" disabled={isSavingInfo} className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95 disabled:opacity-60">
                                    {isSavingInfo ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                    Save Changes
                                </button>
                                {infoSaved && (
                                    <span className="flex items-center gap-1.5 text-emerald-600 text-sm font-semibold">
                                        <CheckCircle2 className="w-4 h-4" /> Saved
                                    </span>
                                )}
                            </div>
                        </form>
                    </div>
                </>
            )}

            {/* Razorpay Tab */}
            {activeTab === 'razorpay' && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                                <CreditCard className="w-5 h-5 text-[var(--brand)]" />
                            </div>
                            <div>
                                <h2 className="font-bold text-slate-900 dark:text-white">Razorpay Integration</h2>
                                <p className="text-xs text-slate-400">Enable online fee collection via Razorpay</p>
                            </div>
                        </div>
                        {school.razorpay_configured ? (
                            <span className="inline-flex items-center bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full px-2.5 py-0.5 text-xs font-medium gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                            </span>
                        ) : (
                            <span className="inline-flex items-center bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full px-2.5 py-0.5 text-xs font-medium gap-1">
                                <XCircle className="w-3.5 h-3.5" /> Not configured
                            </span>
                        )}
                    </div>
                    <form onSubmit={handleSaveRzp} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Key ID</label>
                            <input
                                type="text"
                                placeholder="rzp_live_..."
                                className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors font-mono"
                                value={rzpForm.key_id}
                                onChange={e => setRzpForm({ ...rzpForm, key_id: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Key Secret</label>
                            <div className="relative">
                                <input
                                    type={showSecret ? 'text' : 'password'}
                                    placeholder="Your Razorpay secret"
                                    className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 pr-10 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors font-mono"
                                    value={rzpForm.key_secret}
                                    onChange={e => setRzpForm({ ...rzpForm, key_secret: e.target.value })}
                                />
                                <button type="button" onClick={() => setShowSecret(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-all">
                                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 pt-2">
                            <button type="submit" disabled={isSavingRzp || !rzpForm.key_id || !rzpForm.key_secret} className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95 disabled:opacity-60">
                                {isSavingRzp ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                Save Keys
                            </button>
                            {rzpSaved && (
                                <span className="flex items-center gap-1.5 text-emerald-600 text-sm font-semibold">
                                    <CheckCircle2 className="w-4 h-4" /> Saved
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-400">Keys are stored securely and never exposed to the client after saving.</p>
                    </form>
                </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
                <div className="space-y-5">
                {/* Profile Photo */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-9 h-9 rounded-xl bg-[var(--brand)]/10 flex items-center justify-center">
                            <User className="w-5 h-5 text-[var(--brand)]" />
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-900 dark:text-white">Profile Photo</h2>
                            <p className="text-xs text-slate-400">Optional profile picture for your account</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-5">
                        <div className="relative shrink-0">
                            {photoUrl ? (
                                <img src={photoUrl} alt="Profile" className="w-20 h-20 rounded-2xl object-cover border-2 border-slate-200 dark:border-slate-600" />
                            ) : (
                                <div className="w-20 h-20 rounded-2xl bg-[var(--brand)]/10 flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-600">
                                    <User className="w-8 h-8 text-slate-400" />
                                </div>
                            )}
                            <button
                                onClick={() => photoInputRef.current?.click()}
                                disabled={photoUploading}
                                className="absolute -bottom-1 -right-1 w-7 h-7 bg-[var(--brand)] rounded-xl flex items-center justify-center border-2 border-white dark:border-slate-800 shadow disabled:opacity-50"
                            >
                                {photoUploading ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Camera className="w-3.5 h-3.5 text-white" />}
                            </button>
                            <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f); e.target.value = ''; }} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Upload a photo</p>
                            <p className="text-xs text-slate-400 mt-0.5">JPG, PNG or WEBP. Max 5MB.</p>
                            <button onClick={() => photoInputRef.current?.click()} disabled={photoUploading} className="mt-3 flex items-center gap-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50">
                                <Camera className="w-3.5 h-3.5" /> {photoUploading ? 'Uploading...' : 'Choose Photo'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                            <Shield className="w-5 h-5 text-[var(--brand)]" />
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-900 dark:text-white">Change Password</h2>
                            <p className="text-xs text-slate-400">Update your account password</p>
                        </div>
                    </div>

                    <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Current Password</label>
                            <input
                                type="password"
                                placeholder="Enter current password"
                                required
                                className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors"
                                value={cpForm.current}
                                onChange={e => setCpForm({ ...cpForm, current: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">New Password</label>
                            <input
                                type="password"
                                placeholder="At least 8 characters"
                                required
                                className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors"
                                value={cpForm.new}
                                onChange={e => setCpForm({ ...cpForm, new: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Confirm Password</label>
                            <input
                                type="password"
                                placeholder="Repeat new password"
                                required
                                className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors"
                                value={cpForm.confirm}
                                onChange={e => setCpForm({ ...cpForm, confirm: e.target.value })}
                            />
                        </div>

                        {cpError && (
                            <p className="text-red-600 text-sm bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-700/30 rounded-xl px-4 py-2.5">
                                {cpError}
                            </p>
                        )}

                        {cpSuccess && (
                            <p className="text-emerald-600 text-sm bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-700/30 rounded-xl px-4 py-2.5 flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4" />
                                Password updated successfully.
                            </p>
                        )}

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={cpLoading}
                                className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95 disabled:opacity-60"
                            >
                                {cpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                                Update Password
                            </button>
                        </div>
                    </form>
                </div>
                </div>
            )}
        </div>
    );
}
