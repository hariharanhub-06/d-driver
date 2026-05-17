'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Users, Plus, Trash2, X, Copy, CheckCircle2, Edit } from 'lucide-react';
import api from '@/lib/api';

interface Bus {
    id: string;
    bus_number: string;
}

interface Driver {
    id: string;
    user: { id: string; name: string; email: string; phone?: string };
    bus?: { id: string; bus_number: string } | null;
    license_no?: string;
    is_active?: boolean;
}

const emptyForm = { name: '', email: '', phone: '', license_no: '', password: '' };
const inputCls = "w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors";

export default function SchoolDriversPage() {
    const { id } = useParams<{ id: string }>();
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [buses, setBuses] = useState<Bus[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');
    const [createdPassword, setCreatedPassword] = useState('');
    const [copied, setCopied] = useState(false);

    // Edit modal state
    const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
    const [editBusId, setEditBusId] = useState('');
    const [editLicense, setEditLicense] = useState('');
    const [editSaving, setEditSaving] = useState(false);
    const [editError, setEditError] = useState('');

    useEffect(() => { fetchAll(); }, [id]);

    const fetchAll = async () => {
        setLoading(true);
        setError('');
        try {
            const [driverRes, busRes] = await Promise.allSettled([
                api.get(`/drivers?school_id=${id}`),
                api.get(`/buses?school_id=${id}`),
            ]);
            if (driverRes.status === 'fulfilled') setDrivers(Array.isArray(driverRes.value.data) ? driverRes.value.data : []);
            if (busRes.status === 'fulfilled') setBuses(Array.isArray(busRes.value.data) ? busRes.value.data : []);
        } catch (e: any) {
            setError(e.response?.data?.message || 'Failed to load drivers.');
        } finally {
            setLoading(false);
        }
    };

    const openCreate = () => {
        setForm(emptyForm);
        setFormError('');
        setCreatedPassword('');
        setCopied(false);
        setModalOpen(true);
    };

    const handleSubmit = async () => {
        if (!form.name.trim()) { setFormError('Name is required.'); return; }
        if (!form.email.trim()) { setFormError('Email is required.'); return; }
        if (form.password.length < 8) { setFormError('Password must be at least 8 characters.'); return; }
        setSaving(true);
        setFormError('');
        try {
            const userRes = await api.post('/users', {
                name: form.name.trim(),
                email: form.email.trim(),
                phone: form.phone || undefined,
                role: 'driver',
                school_id: id,
                password: form.password,
            });
            const userId = userRes.data?.id;
            await api.post('/drivers', {
                user_id: userId,
                license_no: form.license_no || undefined,
                school_id: id,
            });
            setCreatedPassword(form.password);
            fetchAll();
        } catch (e: any) {
            setFormError(e.response?.data?.error || e.response?.data?.message || 'Failed to create driver.');
        } finally {
            setSaving(false);
        }
    };

    const openEdit = (driver: Driver) => {
        setEditingDriver(driver);
        setEditBusId(driver.bus?.id || '');
        setEditLicense(driver.license_no || '');
        setEditError('');
    };

    const handleEditSave = async () => {
        if (!editingDriver) return;
        setEditSaving(true);
        setEditError('');
        try {
            await api.put(`/drivers/${editingDriver.id}`, {
                assigned_bus_id: editBusId || null,
                license_no: editLicense || null,
            });
            setEditingDriver(null);
            fetchAll();
        } catch (e: any) {
            setEditError(e.response?.data?.error || e.response?.data?.message || 'Failed to save changes.');
        } finally {
            setEditSaving(false);
        }
    };

    const handleDelete = async (driver: Driver) => {
        if (!window.confirm(`Delete driver "${driver.user.name}"? This cannot be undone.`)) return;
        try {
            await api.delete(`/drivers/${driver.id}`);
            fetchAll();
        } catch (e: any) {
            alert(e.response?.data?.message || 'Failed to delete driver.');
        }
    };

    const copyPassword = () => {
        navigator.clipboard.writeText(createdPassword).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const f = (key: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm(prev => ({ ...prev, [key]: e.target.value }));

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <Users className="w-5 h-5 text-[var(--brand)]" />
                    <h2 className="text-slate-900 dark:text-white font-bold text-lg">Drivers</h2>
                    <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full px-2.5 py-0.5 font-medium">{drivers.length}</span>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95"
                >
                    <Plus className="w-4 h-4" /> Add Driver
                </button>
            </div>

            {error && (
                <p className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/30 rounded-xl px-4 py-3 border border-red-200 dark:border-red-800">{error}</p>
            )}

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex justify-center py-16">
                            <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : drivers.length === 0 ? (
                        <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">No drivers found. Add one to get started.</div>
                    ) : (
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-700">
                                    {['Name', 'Email', 'Phone', 'License No.', 'Bus Assigned', 'Actions'].map(col => (
                                        <th key={col} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-700/50">{col}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {drivers.map(driver => (
                                    <tr key={driver.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                        <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">{driver.user.name}</td>
                                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{driver.user.email}</td>
                                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{driver.user.phone || '—'}</td>
                                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{driver.license_no || '—'}</td>
                                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                                            {driver.bus?.bus_number
                                                ? <span className="bg-[var(--brand)]/10 text-[var(--brand)] rounded-lg px-2 py-0.5 text-xs font-semibold">{driver.bus.bus_number}</span>
                                                : <span className="text-slate-400">—</span>}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => openEdit(driver)} className="flex items-center gap-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-3 py-1.5 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                                                    <Edit className="w-3 h-3" /> Edit
                                                </button>
                                                <button onClick={() => handleDelete(driver)} className="flex items-center gap-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl px-3 py-1.5 font-semibold text-xs hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
                                                    <Trash2 className="w-3 h-3" /> Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Edit Driver Modal */}
            {editingDriver && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700">
                            <div>
                                <h2 className="text-slate-900 dark:text-white font-bold text-base">Edit Driver</h2>
                                <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">{editingDriver.user.name}</p>
                            </div>
                            <button onClick={() => setEditingDriver(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Assign Bus</label>
                                <select
                                    value={editBusId}
                                    onChange={e => setEditBusId(e.target.value)}
                                    className={inputCls}
                                >
                                    <option value="">No Bus Assigned</option>
                                    {buses.map(b => (
                                        <option key={b.id} value={b.id}>{b.bus_number}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">License No.</label>
                                <input
                                    className={inputCls}
                                    placeholder="DL-XXXXXXXX"
                                    value={editLicense}
                                    onChange={e => setEditLicense(e.target.value)}
                                />
                            </div>
                            {editError && (
                                <p className="text-red-600 dark:text-red-400 text-xs font-medium bg-red-50 dark:bg-red-900/30 rounded-xl px-4 py-3 border border-red-200 dark:border-red-800">{editError}</p>
                            )}
                        </div>
                        <div className="flex gap-3 px-6 pb-6">
                            <button onClick={() => setEditingDriver(null)} className="flex-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-4 py-2.5 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleEditSave} disabled={editSaving} className="flex-1 flex items-center justify-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95 disabled:opacity-50">
                                {editSaving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Driver Modal */}
            {modalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
                            <h2 className="text-slate-900 dark:text-white font-bold text-base">Add Driver</h2>
                            <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {createdPassword ? (
                            <div className="p-6 space-y-4">
                                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                    <CheckCircle2 className="w-5 h-5" />
                                    <span className="font-semibold text-sm">Driver created successfully!</span>
                                </div>
                                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 space-y-2">
                                    <p className="text-amber-800 dark:text-amber-300 text-xs font-semibold">Temporary Password — Save this now</p>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm font-mono text-slate-900 dark:text-white">{createdPassword}</code>
                                        <button onClick={copyPassword} className="flex items-center gap-1.5 bg-[var(--brand)] hover:opacity-90 text-white rounded-lg px-3 py-2 text-xs font-semibold transition-all">
                                            {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                            {copied ? 'Copied' : 'Copy'}
                                        </button>
                                    </div>
                                    <p className="text-amber-700 dark:text-amber-400 text-xs">User will be prompted to change this on first login.</p>
                                </div>
                                <button onClick={() => { setModalOpen(false); setCreatedPassword(''); }} className="w-full bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all">
                                    Done
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="p-6 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Name <span className="text-red-500">*</span></label>
                                        <input className={inputCls} placeholder="Full name" value={form.name} onChange={f('name')} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email <span className="text-red-500">*</span></label>
                                        <input type="email" className={inputCls} placeholder="driver@school.com" value={form.email} onChange={f('email')} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Phone</label>
                                            <input className={inputCls} placeholder="+91 98765 43210" value={form.phone} onChange={f('phone')} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">License No.</label>
                                            <input className={inputCls} placeholder="DL-XXXXXXXX" value={form.license_no} onChange={f('license_no')} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Password <span className="text-red-500">*</span></label>
                                        <input type="password" className={inputCls} placeholder="Min 8 characters" value={form.password} onChange={f('password')} />
                                        <p className="text-slate-400 text-xs mt-1">User will be prompted to change this on first login.</p>
                                    </div>
                                    {formError && (
                                        <p className="text-red-600 dark:text-red-400 text-xs font-medium bg-red-50 dark:bg-red-900/30 rounded-xl px-4 py-3 border border-red-200 dark:border-red-800">{formError}</p>
                                    )}
                                </div>
                                <div className="flex gap-3 px-6 pb-6">
                                    <button onClick={() => setModalOpen(false)} className="flex-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-4 py-2.5 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                                        Cancel
                                    </button>
                                    <button onClick={handleSubmit} disabled={saving} className="flex-1 flex items-center justify-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95 disabled:opacity-50">
                                        {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                                        Create Driver
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
