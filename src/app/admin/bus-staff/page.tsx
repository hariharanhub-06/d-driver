'use client';

import { useState, useEffect, useRef } from 'react';
import { HardHat, Plus, Trash2, X, ToggleLeft, ToggleRight, Copy, CheckCircle2, Loader2, Bus, Download, FileUp } from 'lucide-react';
import api from '@/lib/api';
import { useT } from '@/lib/i18n';

interface BusOption {
    id: string;
    bus_number: string;
}

interface StaffUser {
    id: string;
    name: string;
    email: string;
    phone?: string;
    is_active: boolean;
    assigned_bus_id?: string | null;
    assignedBus?: { id: string; bus_number: string } | null;
    created_at: string;
}

const emptyForm = { name: '', email: '', phone: '', password: '', assigned_bus_id: '' };

export default function AdminBusStaffPage() {
    const t = useT();
    const [staff, setStaff] = useState<StaffUser[]>([]);
    const [buses, setBuses] = useState<BusOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');
    const [createdPassword, setCreatedPassword] = useState('');
    const [copied, setCopied] = useState(false);
    const [togglingId, setTogglingId] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [deleteSubmitting, setDeleteSubmitting] = useState(false);
    const [reassignStaff, setReassignStaff] = useState<StaffUser | null>(null);
    const [reassignBusId, setReassignBusId] = useState('');
    const [reassigning, setReassigning] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importCount, setImportCount] = useState(0);
    const importRef = useRef<HTMLInputElement>(null);

    const inputCls = "w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors";

    useEffect(() => {
        fetchStaff();
        api.get('/buses').then(r => setBuses(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    }, []);

    const fetchStaff = async () => {
        setLoading(true);
        setError('');
        try {
            const { data } = await api.get('/users?role=bus_staff');
            setStaff(Array.isArray(data) ? data : []);
        } catch (e: any) {
            setError(e.response?.data?.message || t('Failed to load bus staff.', 'பேருந்து ஊழியர்களை ஏற்ற முடியவில்லை.'));
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');
        if (!form.name.trim()) { setFormError(t('Name is required.', 'பெயர் அவசியம்.')); return; }
        if (!form.email.trim()) { setFormError(t('Email is required — bus staff use it to log in.', 'மின்னஞ்சல் அவசியம் — உள்நுழைய பயன்படுகிறது.')); return; }
        if (!form.password || form.password.length < 6) { setFormError(t('Password must be at least 6 characters.', 'கடவுச்சொல் குறைந்தது 6 எழுத்துகள் இருக்க வேண்டும்.')); return; }
        setSaving(true);
        try {
            await api.post('/users', {
                name: form.name.trim(),
                email: form.email.trim(),
                phone: form.phone.trim() || undefined,
                password: form.password,
                role: 'bus_staff',
                assigned_bus_id: form.assigned_bus_id || undefined,
            });
            setCreatedPassword(form.password);
            setForm(emptyForm);
            fetchStaff();
        } catch (e: any) {
            setFormError(e.response?.data?.error || e.response?.data?.message || t('Failed to create staff user.', 'ஊழியரை உருவாக்க முடியவில்லை.'));
        } finally {
            setSaving(false);
        }
    };

    const handleToggle = async (user: StaffUser) => {
        setTogglingId(user.id);
        try {
            await api.patch(`/users/${user.id}/active`, {});
            setStaff(prev => prev.map(s => s.id === user.id ? { ...s, is_active: !s.is_active } : s));
        } catch { /* ignore */ }
        setTogglingId(null);
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        setDeleteSubmitting(true);
        try {
            await api.delete(`/users/${deleteId}`);
            setStaff(prev => prev.filter(s => s.id !== deleteId));
            setDeleteId(null);
        } catch (e: any) {
            alert(e.response?.data?.error || t('Failed to delete.', 'நீக்க முடியவில்லை.'));
        } finally {
            setDeleteSubmitting(false);
        }
    };

    const handleReassign = async () => {
        if (!reassignStaff) return;
        setReassigning(true);
        try {
            await api.patch(`/users/${reassignStaff.id}`, { assigned_bus_id: reassignBusId || null });
            const bus = buses.find(b => b.id === reassignBusId) || null;
            setStaff(prev => prev.map(s => s.id === reassignStaff.id
                ? { ...s, assigned_bus_id: reassignBusId || null, assignedBus: bus ? { id: bus.id, bus_number: bus.bus_number } : null }
                : s
            ));
            setReassignStaff(null);
        } catch (e: any) {
            alert(e.response?.data?.error || t('Failed to update bus assignment.', 'பேருந்து ஒதுக்கீட்டை மாற்ற முடியவில்லை.'));
        } finally {
            setReassigning(false);
        }
    };

    const copyPassword = () => {
        navigator.clipboard.writeText(createdPassword);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const downloadTemplate = () => {
        const csv = 'name,email,phone,temp_password,bus_number\nRavi Kumar,ravi@school.com,9876543210,Pass@123,TN-01-AB-1234\nMeena Devi,meena@school.com,,Pass@456,';
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'bus_staff_import_template.csv'; a.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (importRef.current) importRef.current.value = '';

        const text = await file.text();
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length < 2) { alert(t('CSV appears empty or has no data rows.', 'CSV காலியாக உள்ளது அல்லது தரவு வரிகள் இல்லை.')); return; }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
        const rows = lines.slice(1).map(line => {
            const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            const row: Record<string, string> = {};
            headers.forEach((h, i) => { if (vals[i]) row[h] = vals[i]; });
            return row;
        }).filter(r => r.name && r.email);

        if (rows.length === 0) { alert(t('No valid rows found. Ensure name and email columns are filled.', 'செல்லுபடியான வரிகள் இல்லை. பெயர் மற்றும் மின்னஞ்சல் நிரப்பவும்.')); return; }

        setImportCount(rows.length);
        setImporting(true);

        let created = 0;
        let errors = 0;

        for (const row of rows) {
            // Resolve bus_number to bus_id if provided
            let assigned_bus_id: string | undefined;
            if (row.bus_number) {
                const match = buses.find(b => b.bus_number.toLowerCase() === row.bus_number.toLowerCase());
                if (match) assigned_bus_id = match.id;
            }
            try {
                await api.post('/users', {
                    name: row.name,
                    email: row.email,
                    phone: row.phone || undefined,
                    password: row.temp_password || Math.random().toString(36).slice(-8),
                    role: 'bus_staff',
                    assigned_bus_id,
                });
                created++;
            } catch {
                errors++;
            }
        }

        setImporting(false);
        alert(`${created} ${t('staff created', 'ஊழியர்கள் உருவாக்கப்பட்டனர்')}${errors ? `, ${errors} ${t('failed', 'தோல்வியடைந்தது')}` : ''}.`);
        fetchStaff();
    };

    return (
        <div className="space-y-6 animate-in">

            {/* CSV Import loading overlay */}
            {importing && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl px-10 py-8 flex flex-col items-center gap-5 min-w-[260px]">
                        <div className="w-14 h-14 rounded-full bg-[var(--brand)]/10 flex items-center justify-center">
                            <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
                        </div>
                        <div className="text-center">
                            <p className="font-bold text-slate-800 dark:text-white text-base">{t('Importing CSV…', 'CSV இறக்குமதி…')}</p>
                            <p className="text-sm text-slate-400 mt-1">{t(`Processing ${importCount} record(s)`, `${importCount} பதிவுகள் செயலாக்கப்படுகின்றன`)}</p>
                            <p className="text-xs text-slate-400 mt-2">{t('Please wait, do not close this page.', 'காத்திருங்கள், இந்தப் பக்கத்தை மூட வேண்டாம்.')}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('Bus Staff', 'பேருந்து ஊழியர்கள்')}</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('Manage staff members who assist on school buses.', 'பள்ளி பேருந்துகளில் உதவும் ஊழியர்களை நிர்வகிக்கவும்.')}</p>
                </div>
                <div className="flex gap-2">
                    <input ref={importRef} type="file" className="hidden" accept=".csv" onChange={handleImport} />
                    <button
                        onClick={downloadTemplate}
                        className="flex items-center gap-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all"
                        title={t('Download CSV template', 'CSV வார்ப்புரு பதிவிறக்கம்')}
                    >
                        <Download className="w-4 h-4" /> {t('Template', 'வார்ப்புரு')}
                    </button>
                    <button
                        onClick={() => importRef.current?.click()}
                        className="flex items-center gap-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all"
                    >
                        <FileUp className="w-4 h-4" /> {t('Import CSV', 'CSV இறக்குமதி')}
                    </button>
                    <button
                        onClick={() => { setModalOpen(true); setForm(emptyForm); setFormError(''); setCreatedPassword(''); setCopied(false); }}
                        className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95"
                    >
                        <Plus className="w-4 h-4" /> {t('Add Bus Staff', 'ஊழியர் சேர்')}
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-300">
                    {error}
                </div>
            )}

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                {loading ? (
                    <div className="flex justify-center py-16">
                        <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : staff.length === 0 ? (
                    <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">
                        <HardHat className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="font-medium">{t('No bus staff added', 'ஊழியர்கள் யாரும் சேர்க்கப்படவில்லை')}</p>
                        <p className="text-xs mt-1">{t('Add staff members who assist on buses', 'பேருந்துகளில் உதவும் ஊழியர்களை சேர்க்கவும்')}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                                <tr>
                                    {[
                                        t('Name', 'பெயர்'),
                                        t('Email', 'மின்னஞ்சல்'),
                                        t('Phone', 'தொலைபேசி'),
                                        t('Assigned Bus', 'ஒதுக்கப்பட்ட பேருந்து'),
                                        t('Active', 'செயலில்'),
                                        t('Added', 'சேர்க்கப்பட்டது'),
                                        t('Actions', 'செயல்கள்'),
                                    ].map(col => (
                                        <th key={col} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{col}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                {staff.map(s => (
                                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-[var(--brand)]/10 flex items-center justify-center font-bold text-[var(--brand)] text-sm shrink-0">
                                                    {s.name.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="font-semibold text-slate-900 dark:text-white">{s.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s.email || '—'}</td>
                                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{s.phone || '—'}</td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => { setReassignStaff(s); setReassignBusId(s.assigned_bus_id || ''); }}
                                                className="flex items-center gap-1.5 group"
                                            >
                                                {s.assignedBus ? (
                                                    <span className="flex items-center gap-1.5 bg-[var(--brand)]/10 text-[var(--brand)] rounded-lg px-2.5 py-1 text-xs font-semibold group-hover:opacity-80 transition-opacity">
                                                        <Bus className="w-3.5 h-3.5" />
                                                        {t('Bus', 'பேருந்து')} {s.assignedBus.bus_number}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-slate-400 dark:text-slate-500 group-hover:text-[var(--brand)] transition-colors">
                                                        + {t('Assign bus', 'பேருந்து ஒதுக்கவும்')}
                                                    </span>
                                                )}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3">
                                            <button onClick={() => handleToggle(s)} disabled={togglingId === s.id} className="transition-all">
                                                {togglingId === s.id
                                                    ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                                                    : s.is_active
                                                        ? <ToggleRight className="w-7 h-7 text-emerald-500" />
                                                        : <ToggleLeft className="w-7 h-7 text-slate-400" />
                                                }
                                            </button>
                                        </td>
                                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                                            {new Date(s.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => setDeleteId(s.id)}
                                                title={t('Delete', 'நீக்கு')}
                                                className="w-8 h-8 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all flex items-center justify-center"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {modalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-[var(--brand)]/10 flex items-center justify-center">
                                    <HardHat className="w-5 h-5 text-[var(--brand)]" />
                                </div>
                                <h3 className="font-bold text-slate-900 dark:text-white text-base">{t('Add Bus Staff', 'ஊழியர் சேர்')}</h3>
                            </div>
                            <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {createdPassword ? (
                            <div className="p-6 space-y-4">
                                <div className="flex flex-col items-center text-center gap-3 py-4">
                                    <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                                        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                                    </div>
                                    <h4 className="font-bold text-slate-900 dark:text-white">{t('Staff Created!', 'ஊழியர் உருவாக்கப்பட்டார்!')}</h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{t('Share this temporary password with the staff member.', 'இந்த தற்காலிக கடவுச்சொல்லை ஊழியரிடம் பகிரவும்.')}</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 flex items-center justify-between gap-3 border border-slate-200 dark:border-slate-600">
                                    <span className="font-mono text-sm text-slate-900 dark:text-white font-semibold">{createdPassword}</span>
                                    <button onClick={copyPassword} className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-[var(--brand)] hover:opacity-80">
                                        {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                        {copied ? t('Copied', 'நகலெடுக்கப்பட்டது') : t('Copy', 'நகலெடு')}
                                    </button>
                                </div>
                                <button onClick={() => { setCreatedPassword(''); setModalOpen(false); }} className="w-full py-2.5 bg-[var(--brand)] text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-all">{t('Done', 'முடிந்தது')}</button>
                            </div>
                        ) : (
                            <form onSubmit={handleCreate} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('Full Name', 'முழு பெயர்')} *</label>
                                    <input type="text" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Ravi Kumar" className={inputCls} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                        {t('Email', 'மின்னஞ்சல்')} <span className="text-red-500">*</span> <span className="text-slate-400 font-normal text-xs">({t('used to log in', 'உள்நுழைய பயன்படுகிறது')})</span>
                                    </label>
                                    <input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="ravi@school.com" className={inputCls} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('Phone', 'தொலைபேசி')} <span className="text-slate-400 font-normal">({t('optional', 'விருப்பமானது')})</span></label>
                                    <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 98765 43210" className={inputCls} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('Assign Bus', 'பேருந்து ஒதுக்கவும்')} <span className="text-slate-400 font-normal">({t('optional', 'விருப்பமானது')})</span></label>
                                    <select value={form.assigned_bus_id} onChange={e => setForm(f => ({ ...f, assigned_bus_id: e.target.value }))} className={inputCls}>
                                        <option value="">— {t('No bus assigned', 'பேருந்து ஒதுக்கப்படவில்லை')} —</option>
                                        {buses.map(b => (
                                            <option key={b.id} value={b.id}>{t('Bus', 'பேருந்து')} {b.bus_number}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('Temporary Password', 'தற்காலிக கடவுச்சொல்')} *</label>
                                    <input type="text" required value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder={t('Min. 6 characters', 'குறைந்தது 6 எழுத்துகள்')} className={inputCls} />
                                </div>
                                {formError && (
                                    <p className="text-red-600 dark:text-red-400 text-xs font-medium bg-red-50 dark:bg-red-900/30 rounded-xl px-4 py-3 border border-red-200 dark:border-red-800">{formError}</p>
                                )}
                                <div className="flex gap-3 pt-1">
                                    <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">{t('Cancel', 'ரத்து')}</button>
                                    <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-[var(--brand)] text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t('Create Staff', 'ஊழியர் உருவாக்கு')}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* Reassign Bus Modal */}
            {reassignStaff && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm">
                        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-700">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-[var(--brand)]/10 flex items-center justify-center">
                                    <Bus className="w-5 h-5 text-[var(--brand)]" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white text-base">{t('Assign Bus', 'பேருந்து ஒதுக்கவும்')}</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{reassignStaff.name}</p>
                                </div>
                            </div>
                            <button onClick={() => setReassignStaff(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <select value={reassignBusId} onChange={e => setReassignBusId(e.target.value)} className={inputCls}>
                                <option value="">— {t('No bus assigned', 'பேருந்து ஒதுக்கப்படவில்லை')} —</option>
                                {buses.map(b => (
                                    <option key={b.id} value={b.id}>{t('Bus', 'பேருந்து')} {b.bus_number}</option>
                                ))}
                            </select>
                            <div className="flex gap-3">
                                <button onClick={() => setReassignStaff(null)} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl font-semibold text-sm">{t('Cancel', 'ரத்து')}</button>
                                <button onClick={handleReassign} disabled={reassigning} className="flex-1 py-2.5 bg-[var(--brand)] text-white rounded-xl font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                                    {reassigning ? <Loader2 className="w-4 h-4 animate-spin" /> : t('Save', 'சேமி')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirm */}
            {deleteId && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm">
                        <div className="p-6 text-center">
                            <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="w-6 h-6 text-red-500" />
                            </div>
                            <h3 className="font-bold text-slate-900 dark:text-white mb-1">{t('Delete this staff member?', 'இந்த ஊழியரை நீக்கவா?')}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{t('This cannot be undone.', 'இதை மீண்டும் செய்ய முடியாது.')}</p>
                            <div className="flex gap-3">
                                <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl font-semibold text-sm">{t('Cancel', 'ரத்து')}</button>
                                <button onClick={handleDelete} disabled={deleteSubmitting} className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                                    {deleteSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('Delete', 'நீக்கு')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
