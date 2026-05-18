'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, UserCheck, X, Loader2, Upload, ChevronDown } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface Driver {
    id: string;
    license_no?: string;
    phone?: string;
    is_active?: boolean;
    assigned_bus_id?: string | null;
    user?: { id?: string; name: string; email: string; phone?: string; is_active?: boolean };
    bus?: { id: string; bus_number: string };
}

interface Bus {
    id: string;
    bus_number: string;
}

const EMPTY_FORM = {
    name: '',
    email: '',
    phone: '',
    license_no: '',
};

function Avatar({ name }: { name: string }) {
    const colors = [
        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    ];
    const initials = name
        .split(' ')
        .map(p => p[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    const colorIdx = name.charCodeAt(0) % colors.length;
    return (
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${colors[colorIdx]}`}>
            {initials}
        </div>
    );
}

export default function DriversPage() {
    const { user } = useAuth();
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [buses, setBuses] = useState<Bus[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editDriver, setEditDriver] = useState<Driver | null>(null);
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState('');

    // Assign bus dropdown state
    const [assigningBusFor, setAssigningBusFor] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [driversRes, busesRes] = await Promise.allSettled([
                api.get('/drivers'),
                api.get('/buses'),
            ]);
            if (driversRes.status === 'fulfilled') setDrivers(driversRes.value.data || []);
            if (busesRes.status === 'fulfilled') setBuses(busesRes.value.data || []);
            setError('');
        } catch {
            setError('Failed to load drivers. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const openCreate = () => {
        setEditDriver(null);
        setFormData(EMPTY_FORM);
        setFormError('');
        setIsModalOpen(true);
    };

    const openEdit = (driver: Driver) => {
        setEditDriver(driver);
        setFormData({
            name: driver.user?.name || '',
            email: driver.user?.email || '',
            phone: driver.user?.phone || driver.phone || '',
            license_no: driver.license_no || '',
        });
        setFormError('');
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to remove this driver?')) return;
        try {
            await api.delete(`/drivers/${id}`);
            setDrivers(prev => prev.filter(d => d.id !== id));
        } catch {
            alert('Failed to delete driver.');
        }
    };

    const handleToggleActive = async (driver: Driver) => {
        const userId = driver.user?.id;
        if (!userId) return;
        const newState = !driver.user?.is_active;
        try {
            await api.patch(`/users/${userId}/active`, { is_active: newState });
            setDrivers(prev =>
                prev.map(d =>
                    d.id === driver.id
                        ? { ...d, user: { ...d.user!, is_active: newState } }
                        : d
                )
            );
        } catch {
            alert('Failed to update driver status.');
        }
    };

    const handleAssignBus = async (driverId: string, busId: string | null) => {
        try {
            await api.put(`/drivers/${driverId}`, { assigned_bus_id: busId });
            const assignedBus = buses.find(b => b.id === busId) || undefined;
            setDrivers(prev =>
                prev.map(d =>
                    d.id === driverId
                        ? { ...d, assigned_bus_id: busId, bus: assignedBus }
                        : d
                )
            );
        } catch {
            alert('Failed to assign bus.');
        } finally {
            setAssigningBusFor(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');
        setIsSubmitting(true);
        try {
            const payload = {
                ...formData,
                school_id: user?.school_id,
            };
            if (editDriver) {
                await api.put(`/drivers/${editDriver.id}`, payload);
                setDrivers(prev =>
                    prev.map(d =>
                        d.id === editDriver.id
                            ? {
                                  ...d,
                                  license_no: formData.license_no,
                                  phone: formData.phone,
                                  user: {
                                      ...d.user,
                                      name: formData.name,
                                      email: formData.email,
                                      phone: formData.phone,
                                  },
                              }
                            : d
                    )
                );
            } else {
                const { data } = await api.post('/drivers', payload);
                setDrivers(prev => [...prev, data]);
            }
            setIsModalOpen(false);
        } catch (err: any) {
            const msg =
                err?.response?.data?.message ||
                'Failed to save driver. Please check inputs.';
            setFormError(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBulkImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const formDataObj = new FormData();
        formDataObj.append('file', file);
        try {
            await api.post('/drivers/bulk', formDataObj, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            fetchData();
            alert('Drivers imported successfully!');
        } catch {
            alert('Bulk import failed. Ensure the file is valid CSV/Excel.');
        }
        e.target.value = '';
    };

    const filtered = drivers.filter(d => {
        const q = search.toLowerCase();
        return (
            d.user?.name?.toLowerCase().includes(q) ||
            d.user?.phone?.toLowerCase().includes(q) ||
            d.phone?.toLowerCase().includes(q) ||
            d.license_no?.toLowerCase().includes(q)
        );
    });

    const inputCls = "w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors";
    const labelCls = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5";

    return (
        <div className="space-y-6 animate-in">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Drivers</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Manage driver assignments, licenses, and status.
                    </p>
                </div>
                <div className="flex gap-2">
                    <label className="flex items-center gap-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-600">
                        <Upload className="w-4 h-4" />
                        Import
                        <input
                            type="file"
                            accept=".csv,.xlsx,.xls"
                            className="hidden"
                            onChange={handleBulkImport}
                        />
                    </label>
                    <button
                        onClick={openCreate}
                        className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                        Add Driver
                    </button>
                </div>
            </div>

            {error && (
                <div className="inline-flex items-center bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full px-2.5 py-0.5 text-xs font-medium border border-red-200 dark:border-red-800 p-3 rounded-xl w-full">
                    {error}
                </div>
            )}

            {/* Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                    <div className="relative w-full max-w-md">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by name or phone..."
                            className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 pl-10 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <span className="text-xs text-slate-400 font-medium shrink-0 ml-auto">
                        {filtered.length} driver{filtered.length !== 1 ? 's' : ''}
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Driver</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Phone</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">License No.</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Assigned Bus</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-3">
                                        <div className="flex justify-center py-16">
                                            <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">
                                        <UserCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                        <p className="font-medium">No drivers found.</p>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(driver => {
                                    const isActive = driver.user?.is_active !== false;
                                    return (
                                        <tr
                                            key={driver.id}
                                            className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group"
                                        >
                                            {/* Driver */}
                                            <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                                <div className="flex items-center gap-3">
                                                    <Avatar name={driver.user?.name || '?'} />
                                                    <div>
                                                        <p className="font-semibold text-slate-800 dark:text-white">
                                                            {driver.user?.name || 'Unknown'}
                                                        </p>
                                                        <p className="text-xs text-slate-400">
                                                            {driver.user?.email}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Phone */}
                                            <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                                {driver.user?.phone || driver.phone || '—'}
                                            </td>

                                            {/* License */}
                                            <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-300">
                                                {driver.license_no || '—'}
                                            </td>

                                            {/* Assigned Bus */}
                                            <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                                <div className="relative">
                                                    <button
                                                        onClick={() =>
                                                            setAssigningBusFor(
                                                                assigningBusFor === driver.id
                                                                    ? null
                                                                    : driver.id
                                                            )
                                                        }
                                                        className="flex items-center gap-1.5 text-xs font-semibold text-[var(--brand)] bg-[var(--brand)]/10 px-2.5 py-1.5 rounded-lg transition-colors hover:bg-[var(--brand)]/20"
                                                    >
                                                        {driver.bus?.bus_number || 'Assign Bus'}
                                                        <ChevronDown className="w-3 h-3" />
                                                    </button>

                                                    {assigningBusFor === driver.id && (
                                                        <div className="absolute left-0 top-9 z-50 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-xl py-1 min-w-36">
                                                            <button
                                                                onClick={() => handleAssignBus(driver.id, null)}
                                                                className="w-full text-left px-4 py-2 text-xs text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700"
                                                            >
                                                                Unassign
                                                            </button>
                                                            {buses.map(bus => (
                                                                <button
                                                                    key={bus.id}
                                                                    onClick={() => handleAssignBus(driver.id, bus.id)}
                                                                    className={`w-full text-left px-4 py-2 text-xs hover:bg-[var(--brand)]/5 dark:hover:bg-[var(--brand)]/10 ${
                                                                        driver.bus?.id === bus.id
                                                                            ? 'text-[var(--brand)] font-bold'
                                                                            : 'text-slate-700 dark:text-slate-300'
                                                                    }`}
                                                                >
                                                                    {bus.bus_number}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Status */}
                                            <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                                <button
                                                    onClick={() => handleToggleActive(driver)}
                                                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                                                        isActive
                                                            ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100'
                                                            : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200'
                                                    }`}
                                                >
                                                    {isActive ? 'Active' : 'Inactive'}
                                                </button>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => openEdit(driver)}
                                                        className="p-2 text-slate-400 hover:text-[var(--brand)] hover:bg-[var(--brand)]/10 rounded-lg transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(driver.id)}
                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                    {editDriver ? 'Edit Driver' : 'Add New Driver'}
                                </h2>
                                {!editDriver && (
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        Login credentials will be sent to the driver's email
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-400 transition-all"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {formError && (
                                <div className="inline-flex items-center bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-xl p-3 text-sm w-full border border-red-200 dark:border-red-800">
                                    {formError}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelCls}>Full Name *</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Driver name"
                                        className={inputCls}
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>Phone *</label>
                                    <input
                                        required
                                        type="tel"
                                        placeholder="Phone number"
                                        className={inputCls}
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className={labelCls}>Email *</label>
                                <input
                                    required
                                    type="email"
                                    placeholder="driver@example.com"
                                    className={inputCls}
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className={labelCls}>License Number</label>
                                <input
                                    type="text"
                                    placeholder="e.g. MH-01-20200012345"
                                    className={`${inputCls} font-mono`}
                                    value={formData.license_no}
                                    onChange={e => setFormData({ ...formData, license_no: e.target.value })}
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 flex items-center justify-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95 disabled:opacity-60"
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : editDriver ? (
                                        'Save Changes'
                                    ) : (
                                        'Add Driver'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Click-outside to close assign bus dropdown */}
            {assigningBusFor && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setAssigningBusFor(null)}
                />
            )}
        </div>
    );
}
