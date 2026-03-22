'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash, UserCheck, Shield, Mail, Key } from 'lucide-react';
import api from '@/lib/api';
import Modal from '@/components/ui/Modal';
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
            const { data } = await api.get('/api/users?role=admin');
            setStaff(data);
        } catch (error) {
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
            await api.post('/api/users', payload);
            setIsModalOpen(false);
            setFormData({ name: '', email: '', password: 'admin123', role: 'admin', school_id: '' });
            fetchStaff();
        } catch (error) {
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
                                                <p className="font-bold text-slate-800 dark:text-white capitalize">{admin.name}</p>
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

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Create Administrative Account"
            >
                <form onSubmit={handleAddStaff} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="block text-sm font-bold mb-1.5">Full Legal Name</label>
                            <input
                                type="text"
                                required
                                className="input-field"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-1.5">Official Email</label>
                            <input
                                type="email"
                                required
                                className="input-field"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-1.5 flex items-center">
                                <Key className="w-4 h-4 mr-2 text-slate-400" /> System Password
                            </label>
                            <input
                                type="text"
                                readOnly
                                className="input-field bg-slate-50 dark:bg-slate-900 border-dashed"
                                value={formData.password}
                            />
                        </div>
                        {user?.role === 'super_admin' && (
                            <div>
                                <label className="block text-sm font-bold mb-1.5">Assigned School ID</label>
                                <input
                                    type="text"
                                    required
                                    className="input-field"
                                    value={formData.school_id}
                                    onChange={(e) => setFormData({ ...formData, school_id: e.target.value })}
                                />
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-bold mb-1.5">Administrative Role</label>
                            <select
                                className="input-field"
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            >
                                <option value="admin">School Administrator</option>
                                {user?.role === 'super_admin' && <option value="super_admin">Regional Super Admin</option>}
                            </select>
                        </div>
                    </div>
                    <div className="pt-6 flex gap-3">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 px-4 border border-border rounded-xl font-bold hover:bg-slate-50 transition-colors">Abort</button>
                        <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 shadow-primary-100">
                            {isSubmitting ? 'Provisioning...' : 'Provision Account'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
