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
            case 'paid': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'overdue': return 'bg-red-500/10 text-red-400 border-red-500/20';
            default: return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
            </div>
        );
    }

    if (!school) {
        return (
            <div className="text-center py-20 text-white/30 font-bold">
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
                    className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-xl text-white/50 hover:text-white transition-all"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3">
                    {school.logo_url ? (
                        <img src={school.logo_url} alt={school.name} className="w-10 h-10 rounded-xl object-contain bg-white p-1" />
                    ) : (
                        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-white/30" />
                        </div>
                    )}
                    <div>
                        <h1 className="text-xl font-black text-white tracking-tight">{school.name}</h1>
                        <p className="text-white/30 text-xs font-bold">{school.slug}</p>
                    </div>
                </div>
                <span className={cn(
                    'ml-auto px-3 py-1 rounded-full text-[10px] font-black uppercase border',
                    school.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
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
                    <div key={s.label} className="bg-[#111827] rounded-2xl border border-white/5 p-4 text-center">
                        <p className="text-2xl font-black text-white">{s.value}</p>
                        <p className="text-[10px] text-white/30 font-black uppercase tracking-widest mt-1">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-white/5 rounded-xl p-1">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={cn(
                            'flex-1 py-2.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all',
                            activeTab === tab.key
                                ? 'bg-primary-600 text-white'
                                : 'text-white/30 hover:text-white'
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            {activeTab === 'overview' && (
                <div className="bg-[#111827] rounded-2xl border border-white/5 p-6 space-y-5">
                    <h3 className="font-black text-white text-sm">School Information</h3>
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
                                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest block mb-2">{field.label}</label>
                                <input
                                    type="text"
                                    value={(editForm[field.key] as string) || ''}
                                    onChange={e => setEditForm({ ...editForm, [field.key]: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold outline-none focus:border-primary-500 transition-all"
                                />
                            </div>
                        ))}
                        <div>
                            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest block mb-2">Primary Color</label>
                            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-2">
                                <input
                                    type="color"
                                    value={editForm.primary_color || '#2dbc75'}
                                    onChange={e => setEditForm({ ...editForm, primary_color: e.target.value })}
                                    className="h-8 w-8 rounded-lg bg-transparent cursor-pointer"
                                />
                                <span className="text-white font-mono text-sm">{editForm.primary_color}</span>
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest block mb-2">Subscription Plan</label>
                            <select
                                value={selectedPlan}
                                onChange={e => setSelectedPlan(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold outline-none focus:border-primary-500"
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
                        className="flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-black text-sm disabled:opacity-50 active:scale-95 transition-all"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Changes
                    </button>
                </div>
            )}

            {activeTab === 'permissions' && (
                <div className="bg-[#111827] rounded-2xl border border-white/5 p-6 space-y-5">
                    <h3 className="font-black text-white text-sm">Feature Permissions</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {PERMISSIONS.map(perm => (
                            <label
                                key={perm.key}
                                className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 cursor-pointer transition-all"
                            >
                                <span className="text-sm font-bold text-white/70">{perm.label}</span>
                                <div
                                    onClick={() => setPermissions(prev => ({ ...prev, [perm.key]: !prev[perm.key] }))}
                                    className={cn(
                                        'w-11 h-6 rounded-full relative transition-all cursor-pointer shrink-0',
                                        permissions[perm.key] ? 'bg-primary-600' : 'bg-white/10'
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
                        className="flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-black text-sm disabled:opacity-50 active:scale-95 transition-all"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Permissions
                    </button>
                </div>
            )}

            {activeTab === 'billing' && (
                <div className="bg-[#111827] rounded-2xl border border-white/5 overflow-hidden">
                    <div className="px-6 py-5 border-b border-white/5">
                        <h3 className="font-black text-white text-sm">Invoices for {school.name}</h3>
                    </div>
                    {invoices.length === 0 ? (
                        <div className="p-10 text-center text-white/20 font-bold text-sm">No invoices for this school</div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {invoices.map(inv => (
                                <div key={inv.id} className="px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-all">
                                    <div>
                                        <p className="text-white font-bold text-sm">{inv.billing_month}</p>
                                        <p className="text-white/30 text-xs font-bold">₹{(inv.total_amount || 0).toLocaleString('en-IN')}</p>
                                    </div>
                                    <span className={cn('px-2 py-0.5 rounded-full text-[9px] font-black uppercase border', getInvoiceStatusStyle(inv.status))}>
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
