'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ShieldCheck, Loader2, Save, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';

const FEATURES: { key: string; label: string; description: string }[] = [
    { key: 'gps_tracking',          label: 'GPS Tracking',          description: 'Live bus location for parents and admin' },
    { key: 'fee_management',        label: 'Fee Management',         description: 'Fee collection, invoices, and payments' },
    { key: 'fuel_management',       label: 'Fuel Management',        description: 'Fuel requests, fills, and cost tracking' },
    { key: 'shift_tracking',        label: 'Shift & KM Tracking',   description: 'Driver shift logs and odometer entries' },
    { key: 'attendance',            label: 'Attendance',             description: 'Driver marks student boarding/drop' },
    { key: 'parent_portal',         label: 'Parent Portal',          description: 'Parent app with tracking and notifications' },
    { key: 'route_management',      label: 'Route Management',       description: 'Create and edit routes and stops' },
    { key: 'student_photos',        label: 'Student Photos',         description: 'Upload and display student profile photos' },
    { key: 'stop_change_requests',  label: 'Stop Change Requests',   description: 'Parents can request stop changes' },
    { key: 'absence_reporting',     label: 'Absence Reporting',      description: 'Parents pre-report student absence' },
    { key: 'razorpay_payments',     label: 'Online Payments',        description: 'Razorpay integration for fee payments' },
];

export default function SchoolPermissionsPage() {
    const { id } = useParams<{ id: string }>();
    const [permissions, setPermissions] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        api.get(`/schools/${id}`)
            .then(r => {
                const perms: Record<string, boolean> = {};
                FEATURES.forEach(f => { perms[f.key] = r.data?.permissions?.[f.key] ?? true; });
                setPermissions(perms);
            })
            .catch(() => setError('Failed to load permissions.'))
            .finally(() => setLoading(false));
    }, [id]);

    const handleSave = async () => {
        setSaving(true);
        setError('');
        setSaved(false);
        try {
            await api.put(`/schools/${id}/permissions`, { permissions });
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
                Disabled features are hidden from the school's sidebar and blocked at the API level.
            </p>

            {error && (
                <p className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/30 rounded-xl px-4 py-3 border border-red-200 dark:border-red-800">{error}</p>
            )}
            {saved && (
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-sm bg-emerald-50 dark:bg-emerald-900/30 rounded-xl px-4 py-3 border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="w-4 h-4 shrink-0" /> Permissions saved successfully.
                </div>
            )}

            <div className="space-y-2">
                {FEATURES.map(f => (
                    <label
                        key={f.key}
                        className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                            permissions[f.key]
                                ? 'bg-[var(--brand)]/5 border-[var(--brand)]/20'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                        }`}
                    >
                        <div className="flex-1 mr-4">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{f.label}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{f.description}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setPermissions(p => ({ ...p, [f.key]: !p[f.key] }))}
                            className={`w-11 h-6 rounded-full transition-all shrink-0 relative ${
                                permissions[f.key] ? 'bg-[var(--brand)]' : 'bg-slate-200 dark:bg-slate-600'
                            }`}
                        >
                            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${
                                permissions[f.key] ? 'left-6' : 'left-1'
                            }`} />
                        </button>
                    </label>
                ))}
            </div>
        </div>
    );
}
