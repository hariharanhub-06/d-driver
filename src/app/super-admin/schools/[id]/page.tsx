'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Building2, Loader2, Save, ChevronLeft, ExternalLink, Copy, Upload, UserPlus, X, Check, AlertCircle, Mail, Phone, User } from 'lucide-react';
import dynamic from 'next/dynamic';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n';

const LogoCropModal = dynamic(() => import('@/components/ui/LogoCropModal'), { ssr: false });

interface School {
    id: string;
    name: string;
    slug: string;
    address?: string;
    phone?: string;
    email?: string;
    email_contact?: string;
    logo_url?: string;
    primary_color?: string;
    status: string;
    subscription_plan?: string;
    plan_id?: string | null;
    permissions?: Record<string, boolean>;
    _count?: { buses: number; students: number; drivers: number; routes: number };
}

interface Plan {
    id: string;
    name: string;
    plan_type?: string;
}

interface Invoice {
    id: string;
    billing_month: string;
    total_amount: number;
    status: string;
}

const PERMISSIONS: { key: string; label: string }[] = [
    { key: 'gps_tracking', label: 'GPS Tracking' },
    { key: 'fee_management', label: 'Fee Management' },
    { key: 'fuel_management', label: 'Fuel Management' },
    { key: 'shift_tracking', label: 'Shift Tracking' },
    { key: 'attendance', label: 'Attendance' },
    { key: 'parent_portal', label: 'Parent Portal' },
    { key: 'route_management', label: 'Route Management' },
    { key: 'student_photos', label: 'Student Photos' },
    { key: 'stop_change_requests', label: 'Stop Change Requests' },
    { key: 'absence_reporting', label: 'Absence Reporting' },
    { key: 'razorpay_payments', label: 'Razorpay Payments' },
];

type Tab = 'overview' | 'permissions' | 'billing' | 'admins';

interface AdminUser {
    id: string;
    name: string;
    email: string;
    phone?: string;
    is_first_login?: boolean;
    created_at?: string;
}

const inputCls = "w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors";

export default function SchoolDetailPage() {
    const t = useT();
    const { id } = useParams<{ id: string }>();
    const router = useRouter();

    const [school, setSchool] = useState<School | null>(null);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('overview');

    const [editForm, setEditForm] = useState<Partial<School>>({});
    const [permissions, setPermissions] = useState<Record<string, boolean>>({});
    const [selectedPlan, setSelectedPlan] = useState('');
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [cropSrc, setCropSrc] = useState<string | null>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);

    const [admins, setAdmins] = useState<AdminUser[]>([]);
    const [adminsLoading, setAdminsLoading] = useState(false);
    const [showAddAdmin, setShowAddAdmin] = useState(false);
    const [addAdminForm, setAddAdminForm] = useState({ name: '', email: '', phone: '', temp_password: '' });
    const [addAdminSaving, setAddAdminSaving] = useState(false);
    const [addAdminMsg, setAddAdminMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        fetchAll();
    }, [id]);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [schoolRes, plansRes, invoicesRes] = await Promise.allSettled([
                api.get(`/schools/${id}`),
                api.get('/billing/plans'),
                api.get(`/billing/invoices?school_id=${id}`),
            ]);
            if (schoolRes.status === 'fulfilled') {
                const s = schoolRes.value.data;
                setSchool(s);
                setEditForm({
                    name: s.name,
                    slug: s.slug,
                    address: s.address || '',
                    phone: s.phone || '',
                    email: s.email_contact || s.email || '',
                    logo_url: s.logo_url || '',
                    primary_color: s.primary_color || '#3B82F6',
                });
                const perms: Record<string, boolean> = {};
                PERMISSIONS.forEach(p => { perms[p.key] = s.permissions?.[p.key] ?? false; });
                setPermissions(perms);
                setSelectedPlan(s.plan_id || '');
            }
            if (plansRes.status === 'fulfilled') setPlans(Array.isArray(plansRes.value.data) ? plansRes.value.data : []);
            if (invoicesRes.status === 'fulfilled') setInvoices(Array.isArray(invoicesRes.value.data) ? invoicesRes.value.data : []);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveOverview = async () => {
        setSaving(true);
        try {
            await api.put(`/schools/${id}`, {
                name: editForm.name,
                address: editForm.address || '',
                phone: editForm.phone || '',
                email_contact: editForm.email || '',
                logo_url: editForm.logo_url || '',
                primary_color: editForm.primary_color || '#3B82F6',
                plan_id: selectedPlan || null,
            });
            fetchAll();
            alert('School updated.');
        } catch (e: any) {
            alert(e.response?.data?.error || e.response?.data?.message || 'Failed to update');
        } finally {
            setSaving(false);
        }
    };

    const handleLogoUpload = async (file: File) => {
        setUploadingLogo(true);
        try {
            const formData = new FormData();
            formData.append('logo', file);
            formData.append('schoolId', id);
            const res = await api.post('/upload/school-logo', formData, { headers: { 'Content-Type': undefined } });
            setEditForm(f => ({ ...f, logo_url: res.data.url }));
        } catch (e: any) {
            alert(e.response?.data?.error || 'Logo upload failed');
        } finally {
            setUploadingLogo(false);
        }
    };

    const handleSavePermissions = async () => {
        setSaving(true);
        try {
            await api.put(`/schools/${id}/permissions`, { permissions });
            alert('Permissions updated.');
        } catch (e: any) {
            alert(e.response?.data?.message || 'Failed to update permissions');
        } finally {
            setSaving(false);
        }
    };

    const fetchAdmins = async () => {
        setAdminsLoading(true);
        try {
            const res = await api.get(`/schools/${id}/admins`);
            setAdmins(Array.isArray(res.data) ? res.data : []);
        } catch {
            setAdmins([]);
        } finally {
            setAdminsLoading(false);
        }
    };

    const handleAddAdmin = async () => {
        if (!addAdminForm.name.trim() || !addAdminForm.email.trim() || !addAdminForm.temp_password.trim()) {
            setAddAdminMsg({ type: 'error', text: 'Name, email, and password are required.' });
            return;
        }
        setAddAdminSaving(true);
        setAddAdminMsg(null);
        try {
            await api.post('/users', {
                name: addAdminForm.name.trim(),
                email: addAdminForm.email.trim(),
                phone: addAdminForm.phone.trim() || undefined,
                password: addAdminForm.temp_password,
                role: 'admin',
                school_id: id,
                is_first_login: true,
            });
            setAddAdminMsg({ type: 'success', text: 'Admin added successfully. They will be prompted to change their password on first login.' });
            setAddAdminForm({ name: '', email: '', phone: '', temp_password: '' });
            fetchAdmins();
        } catch (e: any) {
            setAddAdminMsg({ type: 'error', text: e.response?.data?.error || e.response?.data?.message || 'Failed to add admin.' });
        } finally {
            setAddAdminSaving(false);
        }
    };

    const getInvoiceStatusStyle = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'paid': return 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full px-2.5 py-0.5 text-xs font-medium';
            case 'overdue': return 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full px-2.5 py-0.5 text-xs font-medium';
            default: return 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full px-2.5 py-0.5 text-xs font-medium';
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!school) {
        return (
            <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">
                {t('No data', 'தரவு இல்லை')}
            </div>
        );
    }

    const tabs: { key: Tab; label: string }[] = [
        { key: 'overview', label: t('Overview', 'மேலோட்டம்') },
        { key: 'permissions', label: t('Permissions', 'அனுமதிகள்') },
        { key: 'billing', label: t('Billing', 'கட்டண விவரம்') },
        { key: 'admins', label: t('Admins', 'நிர்வாகிகள்') },
    ];

    return (
        <div className="space-y-6 animate-in max-w-4xl">
            {/* Back + header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => router.push('/super-admin/schools')}
                    className="flex items-center gap-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-3 py-2 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-3">
                    {school.logo_url ? (
                        <img src={school.logo_url} alt={school.name} className="w-10 h-10 rounded-xl object-cover border border-slate-100 dark:border-slate-600 overflow-hidden" />
                    ) : (
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-slate-400" />
                        </div>
                    )}
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white">{school.name}</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-xs">{school.slug}</p>
                    </div>
                </div>
                <span className={cn(
                    'ml-auto rounded-full px-2.5 py-0.5 text-xs font-medium',
                    school.status === 'Active'
                        ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                        : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                )}>
                    {school.status === 'Active' ? t('Active', 'செயல்பாட்டில்') : school.status === 'Suspended' ? t('Suspended', 'இடைநிறுத்தப்பட்டது') : school.status}
                </span>
            </div>

            {/* Login links */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-4">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('School Login Link', 'பள்ளி உள்நுழைவு இணைப்பு')}</p>
                    <span className="text-xs text-slate-400 dark:text-slate-500">Admins, Drivers &amp; Parents all use the same page</span>
                </div>
                {(() => {
                    const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN;
                    const url = baseDomain
                        ? `https://${school.slug}.${baseDomain}/login`
                        : (typeof window !== 'undefined' ? window.location.origin : '') + '/login?school=' + school.slug;
                    return (
                        <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-700/50 rounded-xl px-4 py-2.5">
                            <p className="text-xs font-mono text-blue-600 dark:text-blue-400 truncate min-w-0 flex-1">{url}</p>
                            <div className="flex items-center gap-1 ml-3 shrink-0">
                                <button
                                    onClick={() => navigator.clipboard.writeText(url)}
                                    className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-400 transition-colors"
                                    title="Copy link"
                                >
                                    <Copy className="w-3.5 h-3.5" />
                                </button>
                                <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-400 transition-colors"
                                    title="Open"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                            </div>
                        </div>
                    );
                })()}
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: t('Buses', 'பேருந்துகள்'), value: school._count?.buses ?? 0 },
                    { label: t('Students', 'மாணவர்கள்'), value: school._count?.students ?? 0 },
                    { label: t('Drivers', 'ஓட்டுநர்கள்'), value: school._count?.drivers ?? 0 },
                    { label: t('Routes', 'வழிகள்'), value: school._count?.routes ?? 0 },
                ].map(s => (
                    <div key={s.label} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-4 text-center min-w-0">
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{s.value}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mt-1 truncate">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-700/50 rounded-xl p-1">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => { setActiveTab(tab.key); if (tab.key === 'admins') fetchAdmins(); }}
                        className={cn(
                            'flex-1 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all',
                            activeTab === tab.key
                                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            {activeTab === 'overview' && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 space-y-5">
                    <h3 className="font-semibold text-slate-900 dark:text-white text-sm">{t('School Details', 'பள்ளி விவரங்கள்')}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                            { label: t('School Name', 'பள்ளி பெயர்'), key: 'name' as const },
                            { label: t('Portal Slug', 'போர்டல் சுருக்கம்'), key: 'slug' as const },
                            { label: t('Address', 'முகவரி'), key: 'address' as const },
                            { label: t('Phone', 'தொலைபேசி'), key: 'phone' as const },
                            { label: t('Email', 'மின்னஞ்சல்'), key: 'email' as const },
                        ].map(field => (
                            <div key={field.key}>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{field.label}</label>
                                <input
                                    type="text"
                                    value={(editForm[field.key] as string) || ''}
                                    onChange={e => setEditForm({ ...editForm, [field.key]: e.target.value })}
                                    className={inputCls}
                                />
                            </div>
                        ))}
                        {/* Logo upload */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('School Logo', 'பள்ளி சின்னம்')}</label>
                            <div className="flex items-center gap-3">
                                {editForm.logo_url ? (
                                    <img src={editForm.logo_url} alt="Logo" className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-600 overflow-hidden shrink-0" />
                                ) : (
                                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center shrink-0">
                                        <Building2 className="w-5 h-5 text-slate-400" />
                                    </div>
                                )}
                                <button
                                    type="button"
                                    onClick={() => logoInputRef.current?.click()}
                                    disabled={uploadingLogo}
                                    className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl px-3 py-2 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                                >
                                    {uploadingLogo
                                        ? <><div className="w-4 h-4 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin" /> {t('Loading...', 'ஏற்றுகிறது...')}</>
                                        : <><Upload className="w-4 h-4" /> {t('Upload Logo', 'சின்னம் பதிவேற்று')}</>}
                                </button>
                                <input
                                    ref={logoInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={e => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        const reader = new FileReader();
                                        reader.onload = ev => setCropSrc(ev.target?.result as string);
                                        reader.readAsDataURL(file);
                                        e.target.value = '';
                                    }}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('Primary Color', 'முதன்மை நிறம்')}</label>
                            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5">
                                <input
                                    type="color"
                                    value={editForm.primary_color || '#3B82F6'}
                                    onChange={e => setEditForm({ ...editForm, primary_color: e.target.value })}
                                    className="h-7 w-7 rounded-lg bg-transparent cursor-pointer"
                                />
                                <span className="text-slate-700 dark:text-slate-300 font-mono text-sm">{editForm.primary_color}</span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('Subscription Plan', 'சந்தா திட்டம்')}</label>
                            <select
                                value={selectedPlan}
                                onChange={e => setSelectedPlan(e.target.value)}
                                className={inputCls}
                            >
                                <option value="">No plan</option>
                                {plans.filter(p => (p.plan_type || 'school') === 'school').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <button
                        onClick={handleSaveOverview}
                        disabled={saving}
                        className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95 disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {t('Save Changes', 'மாற்றங்களை சேமி')}
                    </button>
                </div>
            )}

            {activeTab === 'permissions' && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 space-y-5">
                    <h3 className="font-semibold text-slate-900 dark:text-white text-sm">{t('Feature Permissions', 'அம்சங்கள் அனுமதி')}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {PERMISSIONS.map(perm => (
                            <label
                                key={perm.key}
                                className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl border border-slate-100 dark:border-slate-600 cursor-pointer transition-colors"
                            >
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{perm.label}</span>
                                <div
                                    onClick={() => setPermissions(prev => ({ ...prev, [perm.key]: !prev[perm.key] }))}
                                    className={cn(
                                        'w-11 h-6 rounded-full relative transition-all cursor-pointer shrink-0',
                                        permissions[perm.key] ? 'bg-[var(--brand)]' : 'bg-slate-200 dark:bg-slate-600'
                                    )}
                                >
                                    <span className={cn(
                                        'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-all',
                                        permissions[perm.key] && 'translate-x-5'
                                    )} />
                                </div>
                            </label>
                        ))}
                    </div>
                    <button
                        onClick={handleSavePermissions}
                        disabled={saving}
                        className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95 disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {t('Save Permissions', 'அனுமதிகளை சேமி')}
                    </button>
                </div>
            )}

            {activeTab === 'billing' && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700">
                        <h3 className="font-semibold text-slate-900 dark:text-white text-sm">{t('Invoices', 'விலைப்பட்டியல்கள்')} — {school.name}</h3>
                    </div>
                    {invoices.length === 0 ? (
                        <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">{t('No invoices yet', 'விலைப்பட்டியல்கள் இல்லை')}</div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                            {invoices.map(inv => (
                                <div key={inv.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                    <div>
                                        <p className="text-slate-900 dark:text-white font-semibold text-sm">{inv.billing_month}</p>
                                        <p className="text-slate-500 dark:text-slate-400 text-xs">₹{(inv.total_amount || 0).toLocaleString('en-IN')}</p>
                                    </div>
                                    <span className={getInvoiceStatusStyle(inv.status)}>
                                        {inv.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
            {activeTab === 'admins' && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">{t('School Admins', 'பள்ளி நிர்வாகிகள்')}</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t('Users with admin access to this school', 'இந்த பள்ளியில் நிர்வாக அணுகல் உள்ள பயனர்கள்')}</p>
                        </div>
                        <button
                            onClick={() => { setShowAddAdmin(true); setAddAdminMsg(null); setAddAdminForm({ name: '', email: '', phone: '', temp_password: '' }); }}
                            className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all"
                        >
                            <UserPlus className="w-4 h-4" />
                            {t('Add Admin', 'நிர்வாகி சேர்')}
                        </button>
                    </div>
                    {adminsLoading ? (
                        <div className="flex justify-center py-10"><div className="w-6 h-6 border-3 border-[var(--brand)] border-t-transparent rounded-full animate-spin" /></div>
                    ) : admins.length === 0 ? (
                        <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">{t('No data', 'தரவு இல்லை')}</div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                            {admins.map(admin => (
                                <div key={admin.id} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                    <div className="w-9 h-9 rounded-xl bg-[var(--brand)]/10 flex items-center justify-center shrink-0">
                                        <User className="w-4 h-4 text-[var(--brand)]" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-slate-900 dark:text-white text-sm">{admin.name}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                                            <Mail className="w-3 h-3" /> {admin.email}
                                            {admin.phone && <><Phone className="w-3 h-3 ml-2" /> {admin.phone}</>}
                                        </p>
                                    </div>
                                    {admin.is_first_login && (
                                        <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">{t('Pending login', 'உள்நுழைவு நிலுவையில்')}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Add Admin Modal */}
            {showAddAdmin && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-700">
                            <div className="flex items-center gap-3">
                                <UserPlus className="w-5 h-5 text-[var(--brand)]" />
                                <h2 className="font-bold text-slate-900 dark:text-white text-base">{t('Add Admin', 'நிர்வாகி சேர்')}</h2>
                            </div>
                            <button onClick={() => setShowAddAdmin(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-xs text-slate-500 dark:text-slate-400">The admin will be required to change their password on first login.</p>
                            {[
                                { label: 'Full Name *', key: 'name', type: 'text', placeholder: 'Admin name' },
                                { label: 'Email Address *', key: 'email', type: 'email', placeholder: 'admin@school.com' },
                                { label: 'Phone', key: 'phone', type: 'tel', placeholder: '+91 9876543210' },
                                { label: 'Temporary Password *', key: 'temp_password', type: 'password', placeholder: 'Min 8 characters' },
                            ].map(f => (
                                <div key={f.key}>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{f.label}</label>
                                    <input
                                        type={f.type}
                                        value={addAdminForm[f.key as keyof typeof addAdminForm]}
                                        onChange={e => setAddAdminForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                                        placeholder={f.placeholder}
                                        className={inputCls}
                                    />
                                </div>
                            ))}
                            {addAdminMsg && (
                                <div className={`flex items-start gap-2 text-sm rounded-xl px-4 py-3 ${addAdminMsg.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'}`}>
                                    {addAdminMsg.type === 'success' ? <Check className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
                                    {addAdminMsg.text}
                                </div>
                            )}
                            <div className="flex gap-3 pt-1">
                                <button onClick={() => setShowAddAdmin(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                    {t('Cancel', 'ரத்து செய்')}
                                </button>
                                <button onClick={handleAddAdmin} disabled={addAdminSaving} className="flex-1 flex items-center justify-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl py-2.5 font-semibold text-sm transition-all disabled:opacity-50">
                                    {addAdminSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                                    {t('Add Admin', 'நிர்வாகி சேர்')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Crop modal */}
            {cropSrc && (
                <LogoCropModal
                    src={cropSrc}
                    onConfirm={file => { setCropSrc(null); handleLogoUpload(file); }}
                    onCancel={() => { setCropSrc(null); if (logoInputRef.current) logoInputRef.current.value = ''; }}
                />
            )}
        </div>
    );
}
