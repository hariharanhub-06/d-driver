'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash, Building, MapPin, CreditCard, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';
import Modal from '@/components/ui/Modal';

export default function SchoolsPage() {
    const [schools, setSchools] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({ name: '', address: '', subscription_plan: 'Basic', status: 'Active' });

    useEffect(() => {
        fetchSchools();
    }, []);

    const fetchSchools = async () => {
        try {
            const { data } = await api.get('/schools');
            setSchools(data);
        } catch {
            console.error('Failed to fetch schools');
        } finally {
            setLoading(false);
        }
    };

    const handleOnboardSchool = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await api.post('/schools', formData);
            setIsModalOpen(false);
            setFormData({ name: '', address: '', subscription_plan: 'Basic', status: 'Active' });
            fetchSchools();
        } catch (error) {
            alert('Failed to onboard school. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 animate-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="display-title text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Schools Management</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage tenant schools and their subscription plans.</p>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="btn-primary w-full sm:w-auto">
                    <Plus className="w-5 h-5 mr-2" />
                    Onboard School
                </button>
            </div>

            <div className="card p-0 overflow-hidden border-none shadow-xl">
                <div className="p-4 border-b border-border bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="relative w-full max-w-md">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search schools..."
                            className="input-field pl-10 py-2 text-sm"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-medium border-b border-border">
                            <tr>
                                <th className="px-6 py-4">School Details</th>
                                <th className="px-6 py-4">Subscription</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center">
                                            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                            Loading schools...
                                        </div>
                                    </td>
                                </tr>
                            ) : schools.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                        <Building className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                                        No schools found. Register the first tenant to start.
                                    </td>
                                </tr>
                            ) : (
                                schools.map((school: { id: string, name: string, address?: string, subscription_plan?: string, status?: string }) => (
                                    <tr key={school.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mr-4">
                                                    <Building className="w-6 h-6 text-indigo-600" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 dark:text-white text-base leading-tight">{school.name}</p>
                                                    <div className="flex items-center text-xs text-slate-500 mt-1">
                                                        <MapPin className="w-3 h-3 mr-1" />
                                                        {school.address || 'No address provided'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <CreditCard className="w-4 h-4 mr-2 text-slate-400" />
                                                <span className="font-bold text-slate-700 dark:text-slate-300 capitalize">{school.subscription_plan}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${school.status === 'Active' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400'}`}>
                                                <CheckCircle2 className={`w-3 h-3 mr-1.5 ${school.status === 'Active' ? 'text-emerald-500' : 'text-slate-400'}`} />
                                                {school.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-all">
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all">
                                                    <Trash className="w-4 h-4" />
                                                </button>
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
                title="Onboard New School"
            >
                <form onSubmit={handleOnboardSchool} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 text-black">School Name</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Greenwood International"
                            className="input-field"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 text-black">Full Address</label>
                        <textarea
                            required
                            rows={3}
                            placeholder="123 Education St, Knowledge City..."
                            className="input-field resize-none py-3"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 text-black">Subscription Plan</label>
                        <select
                            className="input-field"
                            value={formData.subscription_plan}
                            onChange={(e) => setFormData({ ...formData, subscription_plan: e.target.value })}
                        >
                            <option value="Basic">Basic Plan</option>
                            <option value="Premium">Premium Plan</option>
                            <option value="Enterprise">Enterprise Plan</option>
                        </select>
                    </div>
                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="flex-1 py-3 px-4 border border-border rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="btn-primary flex-1 bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200"
                        >
                            {isSubmitting ? 'Onboarding...' : 'Onboard School'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
