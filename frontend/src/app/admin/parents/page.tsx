'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash, UserCircle, Mail, ShieldCheck } from 'lucide-react';
import api from '@/lib/api';
import Modal from '@/components/ui/Modal';
import { useAuth } from '@/context/AuthContext';

export default function ParentsPage() {
    const { user } = useAuth();
    const [parents, setParents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({ name: '', email: '', password: 'parent123', role: 'parent', school_id: '' });

    useEffect(() => {
        fetchParents();
    }, []);

    const fetchParents = async () => {
        try {
            const { data } = await api.get('/api/users?role=parent');
            setParents(data);
        } catch (_err) {
            console.error('Failed to fetch parents');
        } finally {
            setLoading(false);
        }
    };

    const handleAddParent = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload = {
                ...formData,
                school_id: user?.role === 'super_admin' ? formData.school_id : user?.school_id
            };
            await api.post('/api/users', payload);
            setIsModalOpen(false);
            setFormData({ name: '', email: '', password: 'parent123', role: 'parent', school_id: '' });
            fetchParents();
        } catch (_err) {
            alert('Failed to register parent.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 animate-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="display-title text-2xl md:text-3xl font-bold tracking-tight">Parent Network</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage parent accounts and linked student profiles.</p>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="btn-primary w-full sm:w-auto">
                    <Plus className="w-5 h-5 mr-2" />
                    Register Parent
                </button>
            </div>

            <div className="card p-0 overflow-hidden border-none shadow-xl">
                <div className="p-4 border-b border-border bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="relative w-full max-w-md">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search parents..."
                            className="input-field pl-10 py-2 text-sm"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-medium border-b border-border">
                            <tr>
                                <th className="px-6 py-4">Parent Details</th>
                                <th className="px-6 py-4">Contact</th>
                                <th className="px-6 py-4">Account Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center">
                                            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                            Searching registry...
                                        </div>
                                    </td>
                                </tr>
                            ) : parents.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                        <UserCircle className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                                        No parents registered yet.
                                    </td>
                                </tr>
                            ) : (
                                parents.map((parent: { id: string, name: string, email: string }) => (
                                    <tr key={parent.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mr-3">
                                                    <UserCircle className="w-5 h-5 text-purple-600" />
                                                </div>
                                                <p className="font-bold text-slate-800 dark:text-white">{parent.name}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                                            <div className="flex items-center">
                                                <Mail className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                                                {parent.email}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-lg">
                                                <ShieldCheck className="w-3 h-3 mr-1" /> Verified
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end space-x-2">
                                                <button className="p-2 text-slate-400 hover:text-primary-600 rounded-lg"><Edit className="w-4 h-4" /></button>
                                                <button className="p-2 text-slate-400 hover:text-red-600 rounded-lg"><Trash className="w-4 h-4" /></button>
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
                title="Register New Parent"
            >
                <form onSubmit={handleAddParent} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold mb-1.5">Legal Name</label>
                        <input
                            type="text"
                            required
                            className="input-field"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1.5">Email Address</label>
                        <input
                            type="email"
                            required
                            className="input-field"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1.5 uppercase text-xs tracking-wider text-slate-400">Default Password</label>
                        <input
                            type="text"
                            readOnly
                            className="input-field bg-slate-50 dark:bg-slate-900"
                            value={formData.password}
                        />
                    </div>
                    {user?.role === 'super_admin' && (
                        <div>
                            <label className="block text-sm font-bold mb-1.5">School ID</label>
                            <input
                                type="text"
                                required
                                className="input-field"
                                value={formData.school_id}
                                onChange={(e) => setFormData({ ...formData, school_id: e.target.value })}
                            />
                        </div>
                    )}
                    <div className="pt-4 flex gap-3">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 border border-border rounded-xl font-bold">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
                            {isSubmitting ? 'Registering...' : 'Confirm Registration'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
