'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Building2, Loader2, Save, ChevronLeft } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface School {
    id: string;
    name: string;
    slug: string;
    address?: string;
    phone?: string;
    email?: string;
    logo_url?: string;
    primary_color?: string;
    status: string;
    subscription_plan?: string;
    buses?: any[];
    students?: any[];
    drivers?: any[];
    routes?: any[];
    permissions?: Record<string, boolean>;
}

interface Plan {
    id: string;
    name: string;
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

type Tab = 'overview' | 'permissions' | 'billing';

const inputCls = "w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors";

export default function SchoolDetailPage() {
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
                    email: s.email || '',
                    logo_url: s.logo_url || '',
                    primary_color: s.primary_color || '#2dbc75',
                });
                const perms: Record<string, boolean> = {};
                PERMISSIONS.forEach(p => { perms[p.key] = s.permissions?.[p.key] ?? false; });
                setPermissions(perms);
                setSelectedPlan(s.subscription_plan || '');
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
            await api.put(`/schools/${id}`, { ...school, ...editForm, subscription_plan: selectedPlan });
            fetchAll();
            alert('School updated.');
        } catch (e: any) {
            alert(e.response?.data?.message || 'Failed to update');
        } finally {
            setSaving(false);
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
                School not found.
            </div>
        );
    }

    const tabs: { key: Tab; label: string }[] = [
        { key: 'overview', label: 'Overview' },
        { key: 'permissions', label: 'Permissions' },
        { key: 'billing', label: 'Billing' },
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
                        <img src={school.logo_url} alt={school.name} className="w-10 h-10 rounded-xl object-contain bg-white dark:bg-slate-700 p-1 border border-slate-100 dark:border-slate-600" />
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
                    {school.status}
                </span>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-4 gap-3">
                {[
                    { label: 'Buses', value: school.buses?.length || 0 },
                    { label: 'Students', value: school.students?.length || 0 },
                    { label: 'Drivers', value: school.drivers?.length || 0 },
                    { label: 'Routes', value: school.routes?.length || 0 },
                ].map(s => (
                    <div key={s.label} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-4 text-center">
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{s.value}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mt-1">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-700/50 rounded-xl p-1">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
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
                    <h3 className="font-semibold text-slate-900 dark:text-white text-sm">School Information</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                            { label: 'School Name', key: 'name' as const },
                            { label: 'Portal Slug', key: 'slug' as const },
                            { label: 'Address', key: 'address' as const },
                            { label: 'Phone', key: 'phone' as const },
                            { label: 'Email', key: 'email' as const },
                            { label: 'Logo URL', key: 'logo_url' as const },
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
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Primary Color</label>
                            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5">
                                <input
                                    type="color"
                                    value={editForm.primary_color || '#2dbc75'}
                                    onChange={e => setEditForm({ ...editForm, primary_color: e.target.value })}
                                    className="h-7 w-7 rounded-lg bg-transparent cursor-pointer"
                                />
                                <span className="text-slate-700 dark:text-slate-300 font-mono text-sm">{editForm.primary_color}</span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Subscription Plan</label>
                            <select
                                value={selectedPlan}
                                onChange={e => setSelectedPlan(e.target.value)}
                                className={inputCls}
                            >
                                <option value="">No plan</option>
                                {plans.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                                <option value="Basic">Basic</option>
                                <option value="Standard">Standard</option>
                                <option value="Enterprise">Enterprise</option>
                            </select>
                        </div>
                    </div>
                    <button
                        onClick={handleSaveOverview}
                        disabled={saving}
                        className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95 disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Changes
                    </button>
                </div>
            )}

            {activeTab === 'permissions' && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 space-y-5">
                    <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Feature Permissions</h3>
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
                        Save Permissions
                    </button>
                </div>
            )}

            {activeTab === 'billing' && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700">
                        <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Invoices for {school.name}</h3>
                    </div>
                    {invoices.length === 0 ? (
                        <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">No invoices for this school</div>
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
        </div>
    );
}
