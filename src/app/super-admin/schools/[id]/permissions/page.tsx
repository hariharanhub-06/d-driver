'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ShieldCheck, Loader2, Save, CheckCircle2, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';

type PermState = Record<string, boolean>;

const GROUPS: {
    masterKey: string;
    label: string;
    description: string;
    subs: { key: string; label: string; description: string }[];
}[] = [
    {
        masterKey: 'gps_tracking',
        label: 'GPS Tracking',
        description: 'Live bus location for parents and admin',
        subs: [
            { key: 'gps_driver', label: 'Driver GPS Updates', description: 'Driver can broadcast GPS heading and position' },
        ],
    },
    {
        masterKey: 'fuel_management',
        label: 'Fuel Management',
        description: 'Fuel requests, fills, and cost tracking',
        subs: [
            { key: 'fuel_requests', label: 'Fuel Requests', description: 'Drivers can submit fuel requests' },
            { key: 'fuel_fill_entries', label: 'Fuel Fill Entries', description: 'Record actual fuel fills and quantities' },
        ],
    },
    {
        masterKey: 'fee_management',
        label: 'Fee Management',
        description: 'Fee collection, invoices, and payments',
        subs: [
            { key: 'razorpay_payments', label: 'Online Payments', description: 'Razorpay integration for online fee collection' },
        ],
    },
    {
        masterKey: 'attendance',
        label: 'Attendance',
        description: 'Driver marks student boarding and drop-off',
        subs: [
            { key: 'absence_reporting', label: 'Absence Reporting', description: 'Parents can pre-report student absence' },
        ],
    },
    {
        masterKey: 'notifications',
        label: 'Notification Centre',
        description: 'Push and in-app notifications',
        subs: [
            { key: 'parent_notifications', label: 'Parent Notifications', description: 'Send notifications to parents' },
            { key: 'admin_notifications', label: 'Admin Notifications', description: 'Internal admin alerts and updates' },
        ],
    },
    { masterKey: 'stop_change_requests', label: 'Change Stop Request', description: 'Parents can request stop changes', subs: [] },
    { masterKey: 'parent_multi_account', label: 'Parent Multi-Account', description: 'One phone number linked to multiple parent accounts', subs: [] },
    { masterKey: 'bus_switch', label: 'Bus Switch Facility', description: 'Allow students to switch buses temporarily', subs: [] },
    { masterKey: 'bulk_import', label: 'Bulk Import', description: 'Import students, drivers, and routes via CSV', subs: [] },
    { masterKey: 'reports', label: 'Reports Management', description: 'Generate and download operational reports', subs: [] },
    { masterKey: 'tutorials', label: 'Tutorials', description: 'In-app guided tours and help articles', subs: [] },
    { masterKey: 'route_management', label: 'Route Management', description: 'Create and edit routes and stops', subs: [] },
    { masterKey: 'student_photos', label: 'Students & Branding', description: 'Upload and display student profile photos', subs: [] },
    {
        masterKey: 'password_reset',
        label: 'Password Reset',
        description: 'Allow users to reset forgotten passwords',
        subs: [
            { key: 'password_reset_admin', label: 'Admin', description: 'Admin users can request password reset' },
            { key: 'password_reset_parent', label: 'Parent', description: 'Parent users can request password reset' },
            { key: 'password_reset_driver', label: 'Driver', description: 'Driver users can request password reset' },
            { key: 'password_reset_bus_staff', label: 'Bus Staff', description: 'Bus staff users can request password reset' },
        ],
    },
];

const PORTAL_SUBS = [
    { key: 'parent_portal', label: 'Parent Portal', description: 'Parent web and mobile app login' },
    { key: 'driver_portal', label: 'Driver Portal', description: 'Driver mobile app login' },
    { key: 'bus_staff_portal', label: 'Bus Staff Portal', description: 'Bus staff mobile app login' },
];

const ALL_KEYS = [
    ...GROUPS.flatMap(g => [g.masterKey, ...g.subs.map(s => s.key)]),
    ...PORTAL_SUBS.map(p => p.key),
];

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
    return (
        <button
            type="button"
            onClick={onChange}
            className={`w-11 h-6 rounded-full transition-all shrink-0 relative ${on ? 'bg-[var(--brand)]' : 'bg-slate-200 dark:bg-slate-600'}`}
        >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${on ? 'left-6' : 'left-1'}`} />
        </button>
    );
}

export default function SchoolPermissionsPage() {
    const { id } = useParams<{ id: string }>();
    const [perms, setPerms] = useState<PermState>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        api.get(`/schools/${id}`)
            .then(r => {
                const raw = r.data?.permissions || {};
                const state: PermState = {};
                ALL_KEYS.forEach(k => { state[k] = raw[k] ?? true; });
                setPerms(state);
            })
            .catch(() => setError('Failed to load permissions.'))
            .finally(() => setLoading(false));
    }, [id]);

    const setKey = (key: string, val: boolean) => setPerms(p => ({ ...p, [key]: val }));

    const toggleMaster = (g: typeof GROUPS[number]) => {
        const newVal = !perms[g.masterKey];
        setPerms(p => {
            const next = { ...p, [g.masterKey]: newVal };
            g.subs.forEach(s => { next[s.key] = newVal; });
            return next;
        });
    };

    const handleSave = async () => {
        setSaving(true);
        setError('');
        setSaved(false);
        try {
            await api.put(`/schools/${id}/permissions`, { permissions: perms });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (e: any) {
            setError(e.response?.data?.error || 'Failed to save permissions.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-5 max-w-2xl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-5 h-5 text-[var(--brand)]" />
                    <h2 className="text-slate-900 dark:text-white font-bold text-lg">Feature Permissions</h2>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95 disabled:opacity-50"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save
                </button>
            </div>

            <p className="text-sm text-slate-500 dark:text-slate-400">
                Disabled features are greyed out and non-clickable in the respective portals. Portal toggles block login entirely when disabled.
            </p>

            {error && (
                <p className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/30 rounded-xl px-4 py-3 border border-red-200 dark:border-red-800">{error}</p>
            )}
            {saved && (
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-sm bg-emerald-50 dark:bg-emerald-900/30 rounded-xl px-4 py-3 border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="w-4 h-4 shrink-0" /> Permissions saved successfully.
                </div>
            )}

            {/* Feature Groups */}
            <div className="space-y-3">
                {GROUPS.map(g => {
                    const masterOn = perms[g.masterKey] ?? true;
                    return (
                        <div
                            key={g.masterKey}
                            className={`rounded-2xl border transition-all ${masterOn ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-75'}`}
                        >
                            {/* Master row */}
                            <div className="flex items-center justify-between px-4 py-3.5">
                                <div className="flex-1 mr-4">
                                    <p className={`text-sm font-semibold ${masterOn ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>{g.label}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{g.description}</p>
                                </div>
                                <Toggle on={masterOn} onChange={() => toggleMaster(g)} />
                            </div>

                            {/* Sub-items — only when master is ON */}
                            {masterOn && g.subs.length > 0 && (
                                <div className="border-t border-slate-100 dark:border-slate-700">
                                    {g.subs.map((sub, idx) => (
                                        <div
                                            key={sub.key}
                                            className={`flex items-center justify-between px-4 py-3 ${idx < g.subs.length - 1 ? 'border-b border-slate-100 dark:border-slate-700/50' : ''}`}
                                        >
                                            <div className="flex items-center gap-2.5 flex-1 mr-4">
                                                <div className="w-0.5 h-8 bg-slate-200 dark:bg-slate-600 rounded-full shrink-0" />
                                                <div>
                                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{sub.label}</p>
                                                    <p className="text-xs text-slate-400 mt-0.5">{sub.description}</p>
                                                </div>
                                            </div>
                                            <Toggle on={perms[sub.key] ?? true} onChange={() => setKey(sub.key, !(perms[sub.key] ?? true))} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* Portal Access — special group, no master toggle */}
                <div className="rounded-2xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <div className="px-4 py-3.5 border-b border-slate-100 dark:border-slate-700">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">Portal Access</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Control which portals are enabled — disabling a portal blocks login entirely</p>
                    </div>
                    {PORTAL_SUBS.map((sub, idx) => {
                        const on = perms[sub.key] ?? true;
                        return (
                            <div
                                key={sub.key}
                                className={`flex items-center justify-between px-4 py-3 ${idx < PORTAL_SUBS.length - 1 ? 'border-b border-slate-100 dark:border-slate-700/50' : ''}`}
                            >
                                <div className="flex items-center gap-2.5 flex-1 mr-4">
                                    <div className="w-0.5 h-8 bg-slate-200 dark:bg-slate-600 rounded-full shrink-0" />
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{sub.label}</p>
                                            {!on && (
                                                <span className="flex items-center gap-1 text-[10px] font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 px-1.5 py-0.5 rounded-full">
                                                    <AlertTriangle className="w-2.5 h-2.5" /> Blocks login
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-400 mt-0.5">{sub.description}</p>
                                    </div>
                                </div>
                                <Toggle on={on} onChange={() => setKey(sub.key, !on)} />
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
