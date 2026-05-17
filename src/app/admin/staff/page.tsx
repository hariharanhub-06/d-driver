'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash, UserCheck, Shield, Mail, Key, X, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function StaffPage() {
    const { user } = useAuth();
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({ name: '', email: '', password: 'admin123', role: 'admin', school_id: '' });

    useEffect(() => {
        fetchStaff();
    }, []);

    const fetchStaff = async () => {
        try {
            const { data } = await api.get('/users?role=admin');
            setStaff(data);
        } catch {
            console.error('Failed to fetch staff');
        } finally {
            setLoading(false);
        }
    };

    const handleAddStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload = {
                ...formData,
                school_id: user?.role === 'super_admin' ? formData.school_id : user?.school_id
            };
            await api.post('/users', payload);
            setIsModalOpen(false);
            setFormData({ name: '', email: '', password: 'admin123', role: 'admin', school_id: '' });
            fetchStaff();
        } catch {
            alert('Failed to create staff account.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 animate-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="display-title text-2xl md:text-3xl font-bold tracking-tight">Staff & Permissions</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage administrative access and regional school monitors.</p>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="btn-primary w-full sm:w-auto shadow-indigo-100">
                    <Plus className="w-5 h-5 mr-2" />
                    Add Staff Admin
                </button>
            </div>

            <div className="card p-0 overflow-hidden border-none shadow-2xl">
                <div className="p-4 border-b border-border bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
                    <div className="relative w-full max-w-md">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Filter by name or privilege..."
                            className="input-field pl-10 h-10 text-sm"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-bold border-b border-border">
                            <tr>
                                <th className="px-6 py-4">Administrator</th>
                                <th className="px-6 py-4">Auth Channel</th>
                                <th className="px-6 py-4">Privilege Level</th>
                                <th className="px-6 py-4 text-right">Operations</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center">
                                            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                                            Loading staff records...
                                        </div>
                                    </td>
                                </tr>
                            ) : staff.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">
                                        No staff administrators found.
                                    </td>
                                </tr>
                            ) : (
                                staff.map((admin: any) => (
                                    <tr key={admin.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mr-3 text-orange-600">
                                                    <UserCheck className="w-5 h-5" />
                                                </div>
                                                <p className="font-bold text-slate-800 dark:text-white capitalize leading-none">{admin.name}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center text-slate-500 dark:text-slate-400">
                                                <Mail className="w-3.5 h-3.5 mr-2" />
                                                {admin.email}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 text-xs font-bold ring-1 ring-inset ring-indigo-700/10">
                                                <Shield className="w-3 h-3 mr-1.5" />
                                                {admin.role === 'super_admin' ? 'Super Admin' : 'School Admin'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-primary-600 shadow-sm transition-all"><Edit className="w-4 h-4" /></button>
                                                <button className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-red-600 shadow-sm transition-all"><Trash className="w-4 h-4" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="modal-container-compact max-h-[90vh] overflow-y-auto">
                        <div className="px-6 pt-6 pb-0 flex items-center justify-between mb-4 shrink-0">
                            <div>
                                <h2 className="text-lg font-black text-slate-900 dark:text-white leading-none">Provision Account</h2>
                                <p className="text-[10px] text-slate-400 mt-1">Create a new administrative user with specific school access.</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400"><X size={16} /></button>
                        </div>
                        <form onSubmit={handleAddStaff} className="flex-1 overflow-y-auto px-6 py-5 space-y-3.5">
                            <div>
                                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Full Legal Name</label>
                                <input required type="text" className="input-field" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Official Email</label>
                                <input required type="email" className="input-field" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 flex items-center"><Key size={10} className="mr-1.5" /> System Password</label>
                                <input readOnly type="text" className="input-field bg-slate-50 dark:bg-slate-800/50 border-dashed" value={formData.password} />
                            </div>
                            {user?.role === 'super_admin' && (
                                <div>
                                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Assigned School ID</label>
                                    <input required type="text" className="input-field" value={formData.school_id} onChange={e => setFormData({ ...formData, school_id: e.target.value })} />
                                </div>
                            )}
                            <div>
                                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Administrative Role</label>
                                <select className="input-field" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                                    <option value="admin">School Administrator</option>
                                    {user?.role === 'super_admin' && <option value="super_admin">Regional Super Admin</option>}
                                </select>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 border border-border rounded-xl font-bold hover:bg-slate-50 transition-colors text-xs">Abort</button>
                                <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 text-xs py-2.5 shadow-primary-100">
                                    {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : 'Provision Account'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
