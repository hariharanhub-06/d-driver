'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, UserCheck, ShieldCheck, X, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

type Driver = { id: string; license_no?: string; user?: { name: string; email: string }; bus?: { bus_number: string } };

const EMPTY = { name: '', email: '', password: '', license_no: '', school_id: '' };

export default function DriversPage() {
    const { user } = useAuth();
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editDriver, setEditDriver] = useState<Driver | null>(null);
    const [formData, setFormData] = useState(EMPTY);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => { fetchDrivers(); }, []);

    const fetchDrivers = async () => {
        try {
            const { data } = await api.get('/drivers');
            if (data && data.length > 0) setDrivers(data);
            else throw new Error();
        } catch {
            setDrivers([]);
        } finally {
            setLoading(false);
        }
    };

    const openCreate = () => {
        setEditDriver(null);
        setFormData(EMPTY);
        setIsModalOpen(true);
    };

    const openEdit = (driver: Driver) => {
        setEditDriver(driver);
        setFormData({ name: driver.user?.name || '', email: driver.user?.email || '', password: '', license_no: driver.license_no || '', school_id: '' });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Remove this driver?')) return;
        try { await api.delete(`/drivers/${id}`); } catch { /* mock */ }
        setDrivers(prev => prev.filter(d => d.id !== id));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload = { ...formData, school_id: user?.school_id || formData.school_id };
            if (editDriver) {
                await api.put(`/drivers/${editDriver.id}`, payload);
                setDrivers(prev => prev.map(d => d.id === editDriver.id ? { ...d, license_no: formData.license_no, user: { name: formData.name, email: formData.email } } : d));
            } else {
                await api.post('/drivers', payload);
                setDrivers(prev => [...prev, { id: Date.now().toString(), license_no: formData.license_no, user: { name: formData.name, email: formData.email } }]);
            }
        } catch {
            if (editDriver) {
                setDrivers(prev => prev.map(d => d.id === editDriver.id ? { ...d, license_no: formData.license_no, user: { name: formData.name, email: formData.email } } : d));
            } else {
                setDrivers(prev => [...prev, { id: Date.now().toString(), license_no: formData.license_no, user: { name: formData.name, email: formData.email } }]);
            }
        } finally {
            setIsSubmitting(false);
            setIsModalOpen(false);
        }
    };

    const filtered = drivers.filter(d => d.user?.name?.toLowerCase().includes(search.toLowerCase()) || d.license_no?.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="space-y-6 animate-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="display-title text-2xl md:text-3xl">Drivers Management</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage driver assignments, licenses, and availability.</p>
                </div>
                <button onClick={openCreate} className="btn-primary w-full sm:w-auto">
                    <Plus className="w-5 h-5 mr-2" /> Add Driver
                </button>
            </div>

            <div className="card p-0 overflow-hidden border-none shadow-xl">
                <div className="p-4 border-b border-border bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
                    <div className="relative w-full max-w-md">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                        <input type="text" placeholder="Search drivers..." className="input-field pl-10 py-2 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-medium border-b border-border">
                            <tr>
                                <th className="px-6 py-4">Driver Details</th>
                                <th className="px-6 py-4">License No.</th>
                                <th className="px-6 py-4">Assigned Bus</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? (
                                <tr><td colSpan={5} className="px-6 py-12 text-center"><Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto" /></td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500"><UserCheck className="w-12 h-12 mx-auto text-slate-300 mb-4" />No drivers found.</td></tr>
                            ) : filtered.map(driver => (
                                <tr key={driver.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mr-3">
                                                <UserCheck className="w-5 h-5 text-primary-600" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 dark:text-white leading-none">{driver.user?.name || 'Unknown'}</p>
                                                <p className="text-xs text-slate-500 mt-1">{driver.user?.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-mono text-xs">{driver.license_no || 'N/A'}</td>
                                    <td className="px-6 py-4">
                                        {driver.bus?.bus_number
                                            ? <span className="flex items-center text-primary-600 font-medium"><ShieldCheck className="w-4 h-4 mr-1.5" />{driver.bus.bus_number}</span>
                                            : <span className="text-slate-400 italic">Unassigned</span>}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">Active</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => openEdit(driver)} className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-all" title="Edit driver">
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(driver.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all" title="Remove driver">
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

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] shadow-2xl p-8">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-black">{editDriver ? 'Edit Driver' : 'Add New Driver'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-bold mb-1">Full Name</label>
                                    <input required type="text" className="input-field" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1">Email</label>
                                    <input type="email" className="input-field" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                </div>
                            </div>
                            {!editDriver && (
                                <div>
                                    <label className="block text-sm font-bold mb-1">Password</label>
                                    <input type="password" required className="input-field" placeholder="Initial password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-bold mb-1">License Number</label>
                                <input required type="text" className="input-field" value={formData.license_no} onChange={e => setFormData({ ...formData, license_no: e.target.value })} />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 border border-border rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : editDriver ? 'Save Changes' : 'Add Driver'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
