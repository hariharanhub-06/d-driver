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
        'bg-blue-100 text-blue-700',
        'bg-purple-100 text-purple-700',
        'bg-emerald-100 text-emerald-700',
        'bg-orange-100 text-orange-700',
        'bg-red-100 text-red-700',
    ];
    const initials = name
        .split(' ')
        .map(p => p[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    const colorIdx = name.charCodeAt(0) % colors.length;
    return (
        <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${colors[colorIdx]}`}
        >
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

    return (
        <div className="space-y-6 animate-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                        Drivers
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                        Manage driver assignments, licenses, and status.
                    </p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <label className="flex-1 sm:flex-none flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl text-sm font-semibold text-gray-600 dark:text-slate-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                        <Upload className="w-4 h-4" />
                        Bulk Import
                        <input
                            type="file"
                            accept=".csv,.xlsx,.xls"
                            className="hidden"
                            onChange={handleBulkImport}
                        />
                    </label>
                    <button
                        onClick={openCreate}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Add Driver
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 border border-red-200 rounded-xl p-3 text-sm">
                    {error}
                </div>
            )}

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                    <div className="relative w-full max-w-md">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name or phone..."
                            className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <span className="text-xs text-gray-400 font-medium shrink-0">
                        {filtered.length} driver{filtered.length !== 1 ? 's' : ''}
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 dark:bg-slate-800/80 text-gray-500 dark:text-slate-400 font-medium border-b border-gray-100 dark:border-slate-800 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-3">Driver</th>
                                <th className="px-6 py-3">Phone</th>
                                <th className="px-6 py-3">License No.</th>
                                <th className="px-6 py-3">Assigned Bus</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16 text-center">
                                        <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16 text-center">
                                        <UserCheck className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                                        <p className="text-gray-400 text-sm">No drivers found.</p>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(driver => {
                                    const isActive = driver.user?.is_active !== false;
                                    return (
                                        <tr
                                            key={driver.id}
                                            className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group"
                                        >
                                            {/* Driver */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <Avatar name={driver.user?.name || '?'} />
                                                    <div>
                                                        <p className="font-semibold text-gray-800 dark:text-white">
                                                            {driver.user?.name || 'Unknown'}
                                                        </p>
                                                        <p className="text-xs text-gray-400">
                                                            {driver.user?.email}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Phone */}
                                            <td className="px-6 py-4 text-gray-600 dark:text-slate-400 text-sm">
                                                {driver.user?.phone || driver.phone || '—'}
                                            </td>

                                            {/* License */}
                                            <td className="px-6 py-4 font-mono text-xs text-gray-600 dark:text-slate-400">
                                                {driver.license_no || '—'}
                                            </td>

                                            {/* Assigned Bus */}
                                            <td className="px-6 py-4">
                                                <div className="relative">
                                                    <button
                                                        onClick={() =>
                                                            setAssigningBusFor(
                                                                assigningBusFor === driver.id
                                                                    ? null
                                                                    : driver.id
                                                            )
                                                        }
                                                        className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1.5 rounded-lg transition-colors"
                                                    >
                                                        {driver.bus?.bus_number || 'Assign Bus'}
                                                        <ChevronDown className="w-3 h-3" />
                                                    </button>

                                                    {assigningBusFor === driver.id && (
                                                        <div className="absolute left-0 top-9 z-50 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-xl shadow-xl py-1 min-w-36">
                                                            <button
                                                                onClick={() => handleAssignBus(driver.id, null)}
                                                                className="w-full text-left px-4 py-2 text-xs text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800"
                                                            >
                                                                Unassign
                                                            </button>
                                                            {buses.map(bus => (
                                                                <button
                                                                    key={bus.id}
                                                                    onClick={() => handleAssignBus(driver.id, bus.id)}
                                                                    className={`w-full text-left px-4 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900/20 ${
                                                                        driver.bus?.id === bus.id
                                                                            ? 'text-blue-600 font-bold'
                                                                            : 'text-gray-700 dark:text-slate-300'
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
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => handleToggleActive(driver)}
                                                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold transition-colors ${
                                                        isActive
                                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-200'
                                                            : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400 hover:bg-gray-200'
                                                    }`}
                                                >
                                                    {isActive ? 'Active' : 'Inactive'}
                                                </button>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => openEdit(driver)}
                                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(driver.id)}
                                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md">
                        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 dark:border-slate-800">
                            <div>
                                <h2 className="text-lg font-black text-gray-900 dark:text-white">
                                    {editDriver ? 'Edit Driver' : 'Add New Driver'}
                                </h2>
                                {!editDriver && (
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        Login credentials will be sent to the driver's email
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl text-gray-400 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                            {formError && (
                                <div className="bg-red-50 text-red-600 border border-red-200 rounded-xl p-3 text-sm">
                                    {formError}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                                        Full Name *
                                    </label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Driver name"
                                        className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                                        Phone *
                                    </label>
                                    <input
                                        required
                                        type="tel"
                                        placeholder="Phone number"
                                        className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                                    Email *
                                </label>
                                <input
                                    required
                                    type="email"
                                    placeholder="driver@example.com"
                                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                                    License Number
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. MH-01-20200012345"
                                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                                    value={formData.license_no}
                                    onChange={e => setFormData({ ...formData, license_no: e.target.value })}
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl font-semibold text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-60 flex items-center justify-center"
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
