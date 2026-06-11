'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Search, Edit, Trash2, Bus as BusIcon, Users as UsersIcon, X, Loader2, Droplets, FileUp, Download } from 'lucide-react';
import api from '@/lib/api';
import { useT } from '@/lib/i18n';

type Bus = {
    id: string;
    bus_number: string;
    capacity: number;
    registration_no?: string;
    mileage?: number;
    fuel_liters?: number;
    current_status?: string;
    drivers?: { id: string; user: { id: string; name: string } }[];
};

type DriverOption = { id: string; user: { id: string; name: string }; assigned_bus_id?: string | null; bus?: { id: string; bus_number: string } };

const EMPTY_FORM = { bus_number: '', capacity: '', registration_no: '', mileage: '', initial_fuel_liters: '' };

function fuelColor(liters?: number) {
    if (!liters && liters !== 0) return 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400';
    if (liters > 20) return 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400';
    if (liters >= 10) return 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
    return 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400';
}

function fuelDot(liters?: number) {
    if (!liters && liters !== 0) return 'bg-slate-400';
    if (liters > 20) return 'bg-emerald-500';
    if (liters >= 10) return 'bg-amber-500';
    return 'bg-red-500';
}

export default function BusesPage() {
    const t = useT();
    const [buses, setBuses] = useState<Bus[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editBus, setEditBus] = useState<Bus | null>(null);
    const [formData, setFormData] = useState({ ...EMPTY_FORM });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [fetchError, setFetchError] = useState('');
    const [formError, setFormError] = useState('');
    const [importing, setImporting] = useState(false);
    const [allDrivers, setAllDrivers] = useState<DriverOption[]>([]);
    const importRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchBuses();
        api.get('/drivers').then(r => setAllDrivers(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    }, []);

    const fetchBuses = async () => {
        setLoading(true);
        setFetchError('');
        try {
            const { data } = await api.get('/buses');
            setBuses(Array.isArray(data) ? data : []);
        } catch {
            setBuses([]);
            setFetchError('Failed to load buses. Please refresh.');
        } finally {
            setLoading(false);
        }
    };

    const openCreate = () => {
        setEditBus(null);
        setFormData({ ...EMPTY_FORM });
        setFormError('');
        setIsModalOpen(true);
    };

    const openEdit = (bus: Bus) => {
        setEditBus(bus);
        setFormData({
            bus_number: bus.bus_number,
            capacity: String(bus.capacity),
            registration_no: bus.registration_no || '',
            mileage: bus.mileage ? String(bus.mileage) : '',
            initial_fuel_liters: bus.fuel_liters ? String(bus.fuel_liters) : '',
        });
        setFormError('');
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        try { await api.delete(`/buses/${id}`); } catch { /* ignore */ }
        setBuses(prev => prev.filter(b => b.id !== id));
        setDeleteId(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload: any = {
                bus_number: formData.bus_number,
                capacity: parseInt(formData.capacity),
                ...(formData.registration_no && { registration_no: formData.registration_no }),
                ...(formData.mileage && { mileage: parseFloat(formData.mileage) }),
                ...(formData.initial_fuel_liters && { initial_fuel_liters: parseFloat(formData.initial_fuel_liters) }),
            };
            if (editBus) {
                const { data } = await api.put(`/buses/${editBus.id}`, payload);
                setBuses(prev => prev.map(b => b.id === editBus.id ? { ...b, ...payload, ...(data || {}) } : b));
            } else {
                const { data } = await api.post('/buses', payload);
                setBuses(prev => [...prev, data || { id: Date.now().toString(), ...payload, current_status: 'active', drivers: [] }]);
            }
            setIsModalOpen(false);
        } catch (err: any) {
            setFormError(err.response?.data?.error || 'Failed to save. Try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const downloadTemplate = () => {
        const csv = 'bus_number,capacity,registration_no,mileage\nTN-01-AB-1234,40,TN01AB1234,12.5\nTN-02-CD-5678,52,,';
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'buses_import_template.csv'; a.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (importRef.current) importRef.current.value = '';
        const fd = new FormData();
        fd.append('file', file);
        setImporting(true);
        try {
            await api.post('/buses/bulk', fd);
            fetchBuses();
        } catch { /* ignore */ }
        finally { setImporting(false); }
    };

    const handleAssignDriver = async (busId: string, newDriverId: string | null) => {
        const prevDriver = allDrivers.find(d => d.bus?.id === busId || d.assigned_bus_id === busId);
        try {
            if (prevDriver && prevDriver.id !== newDriverId) {
                await api.put(`/drivers/${prevDriver.id}`, { assigned_bus_id: null });
            }
            if (newDriverId) {
                await api.put(`/drivers/${newDriverId}`, { assigned_bus_id: busId });
            }
            setAllDrivers(prev => prev.map(d => {
                if (d.id === prevDriver?.id) return { ...d, assigned_bus_id: null };
                if (d.id === newDriverId) return { ...d, assigned_bus_id: busId };
                return d;
            }));
            setBuses(prev => prev.map(b => {
                if (b.id !== busId) return b;
                const driver = allDrivers.find(d => d.id === newDriverId);
                return { ...b, drivers: driver ? [{ id: driver.id, user: driver.user }] : [] };
            }));
        } catch {
            alert(t('Failed to assign driver.', 'ஓட்டுநரை ஒதுக்க முடியவில்லை.'));
        }
    };

    const filtered = buses.filter(b =>
        b.bus_number.toLowerCase().includes(search.toLowerCase())
    );

    const activeBuses = buses.filter(b => b.current_status === 'active').length;

    const inputCls = "w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors";
    const labelCls = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5";

    return (
        <div className="space-y-6 animate-in">
            {importing && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl px-10 py-8 flex flex-col items-center gap-5 min-w-[260px]">
                        <div className="w-14 h-14 rounded-full bg-[var(--brand)]/10 flex items-center justify-center">
                            <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
                        </div>
                        <div className="text-center">
                            <p className="font-bold text-slate-800 dark:text-white text-base">{t('Importing CSV…', 'CSV இறக்குமதி…')}</p>
                            <p className="text-xs text-slate-400 mt-2">{t('Please wait, do not close this page.', 'காத்திருங்கள், இந்தப் பக்கத்தை மூட வேண்டாம்.')}</p>
                        </div>
                    </div>
                </div>
            )}
            {fetchError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-300 flex items-center justify-between">
                    <span>{fetchError}</span>
                    <button onClick={fetchBuses} className="font-medium underline ml-3">{t('Retry', 'மீண்டும் முயற்சி')}</button>
                </div>
            )}
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('Buses', 'பேருந்துகள்')}</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('Manage vehicles, capacity, fuel levels and assigned drivers.', 'வாகனங்கள், இடக்கொள்ளல், எரிபொருள் மட்டங்கள் மற்றும் ஒதுக்கப்பட்ட ஓட்டுநர்களை நிர்வகிக்கவும்.')}</p>
                </div>
                <div className="flex gap-2">
                    <input ref={importRef} type="file" className="hidden" accept=".csv,.xlsx,.xls" onChange={handleImport} />
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
                        onClick={openCreate}
                        className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95"
                    >
                        <Plus className="w-4 h-4" /> {t('Add Bus', 'பேருந்து சேர்')}
                    </button>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-[var(--brand)] text-white rounded-2xl p-6 shadow-lg">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-4">
                        <BusIcon className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-3xl font-bold">{loading ? '—' : buses.length}</p>
                    <p className="text-sm text-white/80 mt-1">{t('Total Buses', 'மொத்த பேருந்துகள்')}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
                        <BusIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{loading ? '—' : activeBuses}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('Active Buses', 'செயல்பாட்டில் பேருந்துகள்')}</p>
                </div>
            </div>

            {/* Table Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
                    <div className="relative flex-1 max-w-xs">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder={t('Search by bus number...', 'பேருந்து எண்ணால் தேடு...')}
                            className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 pl-9 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <span className="text-xs text-slate-400 font-medium ml-auto">{filtered.length} {t('buses', 'பேருந்துகள்')}</span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('Bus', 'பேருந்து')}</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('Registration', 'பதிவு எண்')}</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('Capacity', 'இடக்கொள்ளல்')}</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('Mileage', 'மைலேஜ்')}</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('Fuel', 'எரிபொருள்')}</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('Driver', 'ஓட்டுநர்')}</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('Actions', 'செயல்கள்')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-3">
                                        <div className="flex justify-center py-16">
                                            <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">
                                        <BusIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                        <p className="font-medium">{t('No buses found', 'பேருந்துகள் இல்லை')}</p>
                                        <p className="text-xs mt-1">{t('Add your first bus to get started', 'தொடங்க உங்கள் முதல் பேருந்தை சேர்க்கவும்')}</p>
                                    </td>
                                </tr>
                            ) : filtered.map(bus => (
                                <tr key={bus.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-[var(--brand)]/10 flex items-center justify-center">
                                                <BusIcon className="w-4 h-4 text-[var(--brand)]" />
                                            </div>
                                            <span className="font-semibold text-slate-800 dark:text-white">{bus.bus_number}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{bus.registration_no || '—'}</td>
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                        <span className="flex items-center gap-1">
                                            <UsersIcon className="w-3.5 h-3.5 text-slate-400" />
                                            {bus.capacity}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                        {bus.mileage ? `${bus.mileage} km/L` : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                        <div className="space-y-1.5">
                                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${fuelColor(bus.fuel_liters)}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${fuelDot(bus.fuel_liters)}`} />
                                                <Droplets className="w-3 h-3" />
                                                {bus.fuel_liters != null ? `${bus.fuel_liters}L` : 'N/A'}
                                            </span>
                                            {bus.fuel_liters != null && (
                                                <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-[var(--brand)] rounded-full"
                                                        style={{ width: `${Math.min(100, (bus.fuel_liters / 60) * 100)}%` }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                        <select
                                            value={bus.drivers?.[0]?.id || ''}
                                            onChange={e => handleAssignDriver(bus.id, e.target.value || null)}
                                            className="text-xs font-semibold text-[var(--brand)] bg-[var(--brand)]/10 px-2.5 py-1.5 rounded-lg border-none outline-none cursor-pointer hover:bg-[var(--brand)]/20 transition-colors"
                                        >
                                            <option value="">{t('Assign Driver', 'ஓட்டுநர் ஒதுக்கு')}</option>
                                            {allDrivers.map(d => (
                                                <option key={d.id} value={d.id}>{d.user?.name}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 text-right">
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => openEdit(bus)}
                                                className="p-2 text-slate-400 hover:text-[var(--brand)] hover:bg-[var(--brand)]/10 rounded-lg transition-all"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setDeleteId(bus.id)}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{editBus ? t('Edit Bus', 'பேருந்து திருத்து') : t('Add New Bus', 'புதிய பேருந்து சேர்')}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-400 transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className={labelCls}>{t('Bus Number', 'பேருந்து எண்')} *</label>
                                <input
                                    required
                                    type="text"
                                    placeholder={t('e.g. BUS-001', 'எ.கா. BUS-001')}
                                    className={inputCls}
                                    value={formData.bus_number}
                                    onChange={e => setFormData({ ...formData, bus_number: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelCls}>{t('Capacity', 'இடக்கொள்ளல்')} *</label>
                                    <input
                                        required
                                        type="number"
                                        placeholder="40"
                                        min="1"
                                        className={inputCls}
                                        value={formData.capacity}
                                        onChange={e => setFormData({ ...formData, capacity: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>{t('Registration No.', 'பதிவு எண்.')}</label>
                                    <input
                                        type="text"
                                        placeholder={t('e.g. TN-01-AB-1234', 'எ.கா. TN-01-AB-1234')}
                                        className={inputCls}
                                        value={formData.registration_no}
                                        onChange={e => setFormData({ ...formData, registration_no: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelCls}>{t('Mileage (km/L)', 'மைலேஜ் (km/L)')}</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        placeholder="12.5"
                                        className={inputCls}
                                        value={formData.mileage}
                                        onChange={e => setFormData({ ...formData, mileage: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>{t('Initial Fuel (L)', 'ஆரம்ப எரிபொருள் (L)')}</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        placeholder="50"
                                        className={inputCls}
                                        value={formData.initial_fuel_liters}
                                        onChange={e => setFormData({ ...formData, initial_fuel_liters: e.target.value })}
                                    />
                                </div>
                            </div>
                            {formError && (
                                <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-2.5">{formError}</div>
                            )}
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all"
                                >
                                    {t('Cancel', 'ரத்து செய்')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 flex items-center justify-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95 disabled:opacity-60"
                                >
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : editBus ? t('Save Changes', 'மாற்றங்களை சேமி') : t('Add Bus', 'பேருந்து சேர்')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {deleteId && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('Remove this bus?', 'இந்த பேருந்தை நீக்கவா?')}</h3>
                            <button onClick={() => setDeleteId(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 text-center">
                            <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="w-6 h-6 text-red-500" />
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{t('This action cannot be undone.', 'இந்த செயலை திரும்பப் பெற முடியாது.')}</p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeleteId(null)}
                                    className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all"
                                >
                                    {t('Cancel', 'ரத்து செய்')}
                                </button>
                                <button
                                    onClick={() => handleDelete(deleteId)}
                                    className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95"
                                >
                                    {t('Delete', 'நீக்கு')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
