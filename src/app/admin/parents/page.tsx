'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash, UserCircle, Mail, ShieldCheck, X, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function ParentsPage() {
    const { user } = useAuth();
    const [parents, setParents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({ name: '', email: '', password: 'parent123', role: 'parent', school_id: '' });

    useEffect(() => {
        fetchParents();
    }, []);

    const fetchParents = async () => {
        try {
            const { data } = await api.get('/users?role=parent');
            if (data && data.length > 0) {
                setParents(data);
            } else {
                throw new Error('No parents found');
            }
        } catch {
            console.error('Failed to fetch parents');
            setParents([]);
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
            await api.post('/users', payload);
            setIsModalOpen(false);
            setFormData({ name: '', email: '', password: 'parent123', role: 'parent', school_id: '' });
            fetchParents();
        } catch {
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
                                                <p className="font-bold text-slate-800 dark:text-white leading-none">{parent.name}</p>
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
                                            <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
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

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="modal-container-compact">
                        <div className="px-6 pt-6 pb-0 flex items-center justify-between mb-4 shrink-0">
                            <div>
                                <h2 className="text-lg font-black text-slate-900 dark:text-white leading-none">Register New Parent</h2>
                                <p className="text-[10px] text-slate-400 mt-1">Create a parent profile to link with student data.</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400">
                                <X size={16} />
                            </button>
                        </div>
                        <form onSubmit={handleAddParent} className="flex-1 overflow-y-auto px-6 py-5 space-y-3.5">
                            <div>
                                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Legal Name</label>
                                <input required type="text" className="input-field" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Email Address</label>
                                <input required type="email" className="input-field" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Default Password</label>
                                <input readOnly type="text" className="input-field bg-slate-50 dark:bg-slate-800/50 border-dashed" value={formData.password} />
                            </div>
                            {user?.role === 'super_admin' && (
                                <div>
                                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">School ID</label>
                                    <input required type="text" className="input-field" value={formData.school_id} onChange={e => setFormData({ ...formData, school_id: e.target.value })} />
                                </div>
                            )}
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 border border-border rounded-xl font-bold hover:bg-slate-50 transition-colors text-xs">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 text-xs py-2.5 shadow-primary-100">
                                    {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : 'Confirm Registration'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
