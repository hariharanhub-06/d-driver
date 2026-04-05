'use client';

import { useState, useEffect } from 'react';
import { Shield, Check, Lock, Globe, Users, Truck, MapPin, CreditCard, Bell, Save, Loader2, ChevronDown } from 'lucide-react';
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
            // Update local state for schools list
            setSchools(prev => prev.map(s => s.id === selectedSchoolId ? { ...s, permissions } : s));
            alert('Permissions saved successfully!');
        } catch (error) {
            console.error('Failed to save permissions', error);
            alert('Error saving permissions');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="h-full flex items-center justify-center p-20"><Loader2 className="w-10 h-10 text-primary-500 animate-spin" /></div>;

    return (
        <div className="space-y-8 animate-in p-6 max-w-6xl mx-auto">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-50 rounded-full -mr-16 -mt-16 opacity-50"></div>
                <div className="flex items-center gap-5 z-10">
                    <div className="p-4 bg-primary-100 text-primary-600 rounded-3xl shadow-soft">
                        <Shield size={36} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 leading-tight">ERP Permissions</h1>
                        <p className="text-gray-500 font-medium">Control feature availability for <span className="text-primary-600 font-bold">Multi-tenant Schools</span></p>
                    </div>
                </div>

                <div className="z-10 w-full md:w-auto">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Select School to Configure</label>
                    <div className="relative group">
                        <select
                            value={selectedSchoolId}
                            onChange={handleSchoolChange}
                            className="appearance-none w-full md:w-72 bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-gray-700 focus:ring-2 focus:ring-primary-500 transition-all cursor-pointer shadow-inner"
                        >
                            {schools.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-hover:text-primary-500 transition-colors" size={20} />
                    </div>
                </div>
            </div>

            {/* Permissions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                {/* Info Card */}
                <div className="md:col-span-4 bg-gray-900 rounded-[2.5rem] p-8 text-white space-y-6 shadow-2xl">
                    <h3 className="text-xl font-bold">Permission Logic</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">
                        These settings override default role behaviors for the selected school.
                        Disabling a feature here will remove it from the dashboard for all roles in that school (Admin, Driver, Parent).
                    </p>
                    <div className="space-y-4 pt-4">
                        <div className="flex items-center gap-3 text-sm font-medium text-primary-400">
                            <div className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-pulse"></div>
                            Multi-tenant Safe
                        </div>
                        <div className="flex items-center gap-3 text-sm font-medium text-emerald-400">
                            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
                            Real-time Sync
                        </div>
                    </div>
                </div>

                <div className="md:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                    {featureGroups.map((group) => (
                        <div key={group.name} className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:border-primary-100 transition-colors">
                            <div className="px-8 py-6 border-b border-gray-50 bg-slate-50/50 flex items-center gap-3">
                                <group.icon size={20} className="text-primary-500" />
                                <h3 className="font-bold text-gray-800 uppercase tracking-widest text-[10px]">{group.name}</h3>
                            </div>
                            <div className="p-8 space-y-6 flex-1">
                                {group.features.map(feature => (
                                    <div
                                        key={feature.id}
                                        onClick={() => togglePermission(feature.id)}
                                        className="flex items-start gap-4 group cursor-pointer"
                                    >
                                        <div className={cn(
                                            "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all mt-0.5",
                                            permissions[feature.id]
                                                ? "bg-primary-500 border-primary-500 text-white shadow-lg shadow-primary-500/20"
                                                : "border-gray-200 bg-white group-hover:border-primary-400"
                                        )}>
                                            {permissions[feature.id] && <Check size={14} strokeWidth={4} />}
                                        </div>
                                        <div className="flex-1">
                                            <p className={cn(
                                                "font-bold transition-colors text-sm",
                                                permissions[feature.id] ? "text-gray-900" : "text-gray-400"
                                            )}>{feature.name}</p>
                                            <p className="text-[11px] text-gray-400 leading-normal mt-0.5">{feature.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Save Button Floating */}
            <div className="fixed bottom-10 right-10 z-50">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-3 px-12 py-6 bg-primary-500 text-white rounded-[2rem] font-black shadow-2xl shadow-primary-500/40 hover:scale-105 transition-transform active:scale-95 group disabled:opacity-50 disabled:scale-100"
                >
                    {saving ? <Loader2 size={24} className="animate-spin" /> : <Save size={24} className="group-hover:rotate-12 transition-transform" />}
                    {saving ? 'Saving...' : 'Publish Permissions'}
                </button>
            </div>
        </div>
    );
}
