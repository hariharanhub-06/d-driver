'use client';

import { useState, useEffect } from 'react';
import { Shield, Check, Globe, Users, Truck, CreditCard, Save, Loader2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

const featureGroups = [
    {
        name: 'School Management',
        icon: Globe,
        features: [
            { id: 'f1', name: 'Create Schools', description: 'Allow creating new school profiles' },
            { id: 'f2', name: 'Manage Subscriptions', description: 'Control school subscription plans' },
            { id: 'f3', name: 'Global Reports', description: 'Access reports across all schools' }
        ]
    },
    {
        name: 'Transport Operations',
        icon: Truck,
        features: [
            { id: 'f4', name: 'Route Planning', description: 'Create and optimize bus routes' },
            { id: 'f5', name: 'Live Tracking', description: 'Real-time GPS tracking for parents' },
            { id: 'f6', name: 'Stop Management', description: 'Manage pickup and drop-off points' }
        ]
    },
    {
        name: 'Student & Attendance',
        icon: Users,
        features: [
            { id: 'f7', name: 'Attendance Marking', description: 'Driver-side attendance marking' },
            { id: 'f8', name: 'Face Pop-ups', description: 'Show student photos during stops' },
            { id: 'f9', name: 'Parent Notifications', description: 'Automatic pickup/drop alerts' }
        ]
    },
    {
        name: 'Finance & Payments',
        icon: CreditCard,
        features: [
            { id: 'f10', name: 'Fee Collection', description: 'Allow parents to pay via app' },
            { id: 'f11', name: 'Invoice Generation', description: 'Auto-generate monthly fee receipts' }
        ]
    }
];

export default function PermissionsPage() {
    const [schools, setSchools] = useState<any[]>([]);
    const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [permissions, setPermissions] = useState<Record<string, boolean>>({});

    useEffect(() => {
        fetchSchools();
    }, []);

    const fetchSchools = async () => {
        try {
            const { data } = await api.get('/schools');
            setSchools(data);
            if (data.length > 0) {
                setSelectedSchoolId(data[0].id);
                setPermissions(data[0].permissions || {});
            }
        } catch (error) {
            console.error('Failed to fetch schools', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSchoolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const schoolId = e.target.value;
        setSelectedSchoolId(schoolId);
        const school = schools.find(s => s.id === schoolId);
        setPermissions(school?.permissions || {});
    };

    const togglePermission = (id: string) => {
        setPermissions(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.put(`/schools/${selectedSchoolId}`, { permissions });
            setSchools(prev => prev.map(s => s.id === selectedSchoolId ? { ...s, permissions } : s));
            alert('Permissions saved successfully!');
        } catch (error) {
            console.error('Failed to save permissions', error);
            alert('Error saving permissions');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="space-y-6 animate-in">
            {/* Header */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-[var(--brand)]/10 rounded-2xl">
                            <Shield className="w-8 h-8 text-[var(--brand)]" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">ERP Permissions</h1>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Control feature availability for multi-tenant schools</p>
                        </div>
                    </div>
                    <div className="w-full md:w-auto">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Select School</label>
                        <div className="relative">
                            <select
                                value={selectedSchoolId}
                                onChange={handleSchoolChange}
                                className="appearance-none w-full md:w-72 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[var(--brand)] transition-colors cursor-pointer pr-10"
                            >
                                {schools.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none w-4 h-4" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Permissions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                {/* Info Card */}
                <div className="md:col-span-4 bg-slate-900 dark:bg-slate-900 rounded-2xl p-6 text-white space-y-4 shadow-lg border border-slate-800">
                    <h3 className="text-base font-semibold">Permission Logic</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">
                        These settings override default role behaviors for the selected school.
                        Disabling a feature here will remove it from the dashboard for all roles in that school (Admin, Driver, Parent).
                    </p>
                    <div className="space-y-3 pt-2">
                        <div className="flex items-center gap-3 text-sm font-medium text-[var(--brand)]">
                            <div className="w-1.5 h-1.5 bg-[var(--brand)] rounded-full animate-pulse"></div>
                            Multi-tenant Safe
                        </div>
                        <div className="flex items-center gap-3 text-sm font-medium text-emerald-400">
                            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
                            Real-time Sync
                        </div>
                    </div>
                </div>

                <div className="md:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {featureGroups.map((group) => (
                        <div key={group.name} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col">
                            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3 bg-slate-50 dark:bg-slate-700/50">
                                <group.icon className="w-4 h-4 text-[var(--brand)]" />
                                <h3 className="font-semibold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider">{group.name}</h3>
                            </div>
                            <div className="p-5 space-y-4 flex-1">
                                {group.features.map(feature => (
                                    <div
                                        key={feature.id}
                                        onClick={() => togglePermission(feature.id)}
                                        className="flex items-start gap-3 group cursor-pointer"
                                    >
                                        <div className={cn(
                                            "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all mt-0.5 shrink-0",
                                            permissions[feature.id]
                                                ? "bg-[var(--brand)] border-[var(--brand)] text-white"
                                                : "border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 group-hover:border-[var(--brand)]"
                                        )}>
                                            {permissions[feature.id] && <Check size={12} strokeWidth={3} />}
                                        </div>
                                        <div className="flex-1">
                                            <p className={cn(
                                                "font-medium transition-colors text-sm",
                                                permissions[feature.id] ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"
                                            )}>{feature.name}</p>
                                            <p className="text-xs text-slate-400 dark:text-slate-500 leading-normal mt-0.5">{feature.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Save Button */}
            <div className="fixed bottom-8 right-8 z-50">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-6 py-3 font-semibold text-sm shadow-lg shadow-[var(--brand)]/20 transition-all active:scale-95 disabled:opacity-50"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? 'Saving...' : 'Publish Permissions'}
                </button>
            </div>
        </div>
    );
}
