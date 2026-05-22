'use client';

import { useState, useEffect } from 'react';
import { HardHat, Plus, Trash2, X, ToggleLeft, ToggleRight, Copy, CheckCircle2, Loader2, Bus } from 'lucide-react';
import api from '@/lib/api';

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
const inputCls = "w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors";

export default function AdminBusStaffPage() {
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
    // Reassign bus modal
    const [reassignStaff, setReassignStaff] = useState<StaffUser | null>(null);
    const [reassignBusId, setReassignBusId] = useState('');
    const [reassigning, setReassigning] = useState(false);

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
            setError(e.response?.data?.message || 'Failed to load bus staff.');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');
        if (!form.name.trim()) { setFormError('Name is required.'); return; }
        if (!form.email.trim()) { setFormError('Email is required — bus staff use it to log in.'); return; }
        if (!form.password || form.password.length < 6) { setFormError('Password must be at least 6 characters.'); return; }
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
            setFormError(e.response?.data?.error || e.response?.data?.message || 'Failed to create staff user.');
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
            alert(e.response?.data?.error || 'Failed to delete.');
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
            alert(e.response?.data?.error || 'Failed to update bus assignment.');
        } finally {
            setReassigning(false);
        }
    };

    const copyPassword = () => {
        navigator.clipboard.writeText(createdPassword);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-6 animate-in">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Bus Staff</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage staff members who assist on school buses.</p>
                </div>
                <button
                    onClick={() => { setModalOpen(true); setForm(emptyForm); setFormError(''); setCreatedPassword(''); setCopied(false); }}
                    className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95"
                >
                    <Plus className="w-4 h-4" /> Add Bus Staff
                </button>
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
                        <p className="font-medium">No bus staff added</p>
                        <p className="text-xs mt-1">Add staff members who assist on buses</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                                <tr>
                                    {['Name', 'Email', 'Phone', 'Assigned Bus', 'Active', 'Added', 'Actions'].map(col => (
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
                                                        Bus {s.assignedBus.bus_number}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-slate-400 dark:text-slate-500 group-hover:text-[var(--brand)] transition-colors">
                                                        + Assign bus
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
                                                title="Delete"
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
                                <h3 className="font-bold text-slate-900 dark:text-white text-base">Add Bus Staff</h3>
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
                                    <h4 className="font-bold text-slate-900 dark:text-white">Staff Created!</h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Share this temporary password with the staff member.</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 flex items-center justify-between gap-3 border border-slate-200 dark:border-slate-600">
                                    <span className="font-mono text-sm text-slate-900 dark:text-white font-semibold">{createdPassword}</span>
                                    <button onClick={copyPassword} className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-[var(--brand)] hover:opacity-80">
                                        {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                        {copied ? 'Copied' : 'Copy'}
                                    </button>
                                </div>
                                <button onClick={() => { setCreatedPassword(''); setModalOpen(false); }} className="w-full py-2.5 bg-[var(--brand)] text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-all">Done</button>
                            </div>
                        ) : (
                            <form onSubmit={handleCreate} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Full Name *</label>
                                    <input type="text" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Ravi Kumar" className={inputCls} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email <span className="text-red-500">*</span> <span className="text-slate-400 font-normal text-xs">(used to log in)</span></label>
                                    <input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="ravi@school.com" className={inputCls} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Phone <span className="text-slate-400 font-normal">(optional)</span></label>
                                    <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 98765 43210" className={inputCls} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Assign Bus <span className="text-slate-400 font-normal">(optional)</span></label>
                                    <select value={form.assigned_bus_id} onChange={e => setForm(f => ({ ...f, assigned_bus_id: e.target.value }))} className={inputCls}>
                                        <option value="">— No bus assigned —</option>
                                        {buses.map(b => (
                                            <option key={b.id} value={b.id}>Bus {b.bus_number}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Temporary Password *</label>
                                    <input type="text" required value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min. 6 characters" className={inputCls} />
                                </div>
                                {formError && (
                                    <p className="text-red-600 dark:text-red-400 text-xs font-medium bg-red-50 dark:bg-red-900/30 rounded-xl px-4 py-3 border border-red-200 dark:border-red-800">{formError}</p>
                                )}
                                <div className="flex gap-3 pt-1">
                                    <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Cancel</button>
                                    <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-[var(--brand)] text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Staff'}
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
                                    <h3 className="font-bold text-slate-900 dark:text-white text-base">Assign Bus</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{reassignStaff.name}</p>
                                </div>
                            </div>
                            <button onClick={() => setReassignStaff(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <select
                                value={reassignBusId}
                                onChange={e => setReassignBusId(e.target.value)}
                                className={inputCls}
                            >
                                <option value="">— No bus assigned —</option>
                                {buses.map(b => (
                                    <option key={b.id} value={b.id}>Bus {b.bus_number}</option>
                                ))}
                            </select>
                            <div className="flex gap-3">
                                <button onClick={() => setReassignStaff(null)} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl font-semibold text-sm">Cancel</button>
                                <button
                                    onClick={handleReassign}
                                    disabled={reassigning}
                                    className="flex-1 py-2.5 bg-[var(--brand)] text-white rounded-xl font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {reassigning ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
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
                            <h3 className="font-bold text-slate-900 dark:text-white mb-1">Delete this staff member?</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">This cannot be undone.</p>
                            <div className="flex gap-3">
                                <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl font-semibold text-sm">Cancel</button>
                                <button onClick={handleDelete} disabled={deleteSubmitting} className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                                    {deleteSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
