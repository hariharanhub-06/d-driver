'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, MapPin, Search, User, Phone, Mail, GraduationCap, Bus, X, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';


const EMPTY_FORM = {
    // Student fields
    name: '', gr_no: '', grade: '', section: '',
    // Parent/Guardian fields
    parent_name: '', parent_email: '', parent_phone: '', parent_password: 'parent123',
    // Assignment
    route_id: '', stop_id: '', bus_id: '',
};

export default function StudentsPage() {
    const { user } = useAuth();
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({ ...EMPTY_FORM });
    const [activeSection, setActiveSection] = useState<'student' | 'parent' | 'assignment'>('student');

    useEffect(() => { fetchStudents(); }, []);

    const fetchStudents = async () => {
        try {
            const { data } = await api.get('/students');
            if (data && data.length > 0) {
                setStudents(data.map((s: any) => ({
                    ...s,
                    balance: s.fees?.[0]?.due_amount || 0,
                    status: s.status || 'Active',
                })));
            } else {
                throw new Error('No students');
            }
        } catch {
            setStudents([]);
        } finally {
            setLoading(false);
        }
    };

    const openCreate = () => {
        setEditingId(null);
        setFormData({ ...EMPTY_FORM });
        setActiveSection('student');
        setIsModalOpen(true);
    };

    const openEdit = (student: any) => {
        setEditingId(student.id);
        setFormData({
            name: student.name || '',
            gr_no: student.gr_no || '',
            grade: student.grade || '',
            section: student.section || '',
            parent_name: student.parent?.name || '',
            parent_email: student.parent?.email || '',
            parent_phone: student.parent?.phone || '',
            parent_password: 'parent123',
            route_id: student.route?.id || '',
            stop_id: student.stop?.id || '',
            bus_id: student.bus_id || '',
        });
        setActiveSection('student');
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            // 1. Create or update parent user account
            let parent_id: string | undefined;
            if (formData.parent_email) {
                try {
                    const parentRes = await api.post('/users', {
                        name: formData.parent_name,
                        email: formData.parent_email,
                        password: formData.parent_password,
                        phone: formData.parent_phone,
                        role: 'parent',
                        school_id: user?.school_id,
                    });
                    parent_id = parentRes.data.id;
                } catch {
                    // parent might already exist — continue
                }
            }

            // 2. Create or update student
            const payload: any = {
                name: formData.name,
                gr_no: formData.gr_no,
                grade: formData.grade,
                section: formData.section,
                school_id: user?.school_id,
                ...(parent_id && { parent_id }),
                ...(formData.route_id && { route_id: formData.route_id }),
                ...(formData.stop_id && { stop_id: formData.stop_id }),
            };

            if (editingId) {
                await api.put(`/students/${editingId}`, payload);
            } else {
                await api.post('/students', payload);
            }

            setIsModalOpen(false);
            fetchStudents();
        } catch {
            // Mock fallback: update locally
            if (editingId) {
                setStudents(prev => prev.map(s => s.id === editingId ? {
                    ...s, name: formData.name, gr_no: formData.gr_no, grade: formData.grade, section: formData.section,
                    parent: { name: formData.parent_name, email: formData.parent_email, phone: formData.parent_phone },
                } : s));
            } else {
                setStudents(prev => [...prev, {
                    id: Date.now().toString(),
                    name: formData.name, gr_no: formData.gr_no, grade: formData.grade, section: formData.section,
                    parent: { name: formData.parent_name, email: formData.parent_email, phone: formData.parent_phone },
                    balance: 0, status: 'Active',
                }]);
            }
            setIsModalOpen(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Remove this student?')) return;
        try {
            await api.delete(`/students/${id}`);
        } catch { /* mock fallback */ }
        setStudents(prev => prev.filter(s => s.id !== id));
    };

    const filtered = students.filter(s =>
        s.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.parent?.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.gr_no?.toLowerCase().includes(search.toLowerCase())
    );

    const sections = [
        { id: 'student', label: 'Student Info' },
        { id: 'parent', label: 'Parent / Guardian' },
        { id: 'assignment', label: 'Bus & Route' },
    ] as const;

    return (
        <div className="space-y-6 animate-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white leading-tight">Students & Parents</h1>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Manage student profiles, parent contacts, bus assignments, and fee balances.</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search by name, parent, GR number..."
                            className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-2xl text-sm border border-gray-100 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 outline-none"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={openCreate}
                        className="flex items-center gap-2 px-5 py-3 bg-primary-500 text-white rounded-2xl font-bold shadow-lg shadow-primary-500/20 hover:bg-primary-600 transition-all whitespace-nowrap"
                    >
                        <Plus size={18} /> Enroll Student
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-medium border-b border-gray-100 dark:border-slate-700">
                            <tr>
                                <th className="px-6 py-4">Student</th>
                                <th className="px-6 py-4">Grade</th>
                                <th className="px-6 py-4">Parent / Guardian</th>
                                <th className="px-6 py-4">Stop & Route</th>
                                <th className="px-6 py-4">Fee Balance</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                            {loading ? (
                                <tr><td colSpan={7} className="px-6 py-12 text-center"><Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto" /></td></tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-16 text-center text-slate-400">
                                        <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p className="font-bold">No students enrolled yet</p>
                                        <p className="text-xs mt-1">Click "Enroll Student" to get started</p>
                                    </td>
                                </tr>
                            ) : filtered.map(student => (
                                <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center text-primary-500 font-black">
                                                {student.name?.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-800 dark:text-white">{student.name}</p>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{student.gr_no || '—'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold uppercase">
                                            {student.grade}{student.section ? `-${student.section}` : ''}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="font-bold text-gray-700 dark:text-slate-200">{student.parent?.name || '—'}</p>
                                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                            <Phone size={10} /> {student.parent?.phone || student.parent_phone || 'No contact'}
                                        </p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1.5 text-sm text-gray-500">
                                            <MapPin size={12} className="text-orange-400" />
                                            <span>{student.stop?.name || 'Unassigned'}</span>
                                        </div>
                                        {student.route?.name && (
                                            <span className="text-[10px] text-blue-500 font-bold uppercase">{student.route.name}</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className={`text-sm font-bold ${student.balance > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                            {student.balance > 0 ? `-₹${student.balance?.toLocaleString()}` : '✓ Cleared'}
                                        </p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${student.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                            {student.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => openEdit(student)} className="p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded-xl transition-all"><Edit size={15} /></button>
                                            <button onClick={() => handleDelete(student.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={15} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="px-8 pt-8 pb-0 flex items-center justify-between shrink-0">
                            <div>
                                <h2 className="text-xl font-black text-slate-900 dark:text-white">{editingId ? 'Edit Student' : 'Enroll Student'}</h2>
                                <p className="text-xs text-slate-400 mt-1">Student details and parent/guardian contact are managed together.</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all text-slate-400">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Section Tabs */}
                        <div className="flex gap-1 mx-8 mt-5 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 shrink-0">
                            {sections.map(s => (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => setActiveSection(s.id)}
                                    className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${activeSection === s.id ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>

                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-8 py-6 space-y-4">

                            {/* Student Info Section */}
                            {activeSection === 'student' && (
                                <div className="space-y-4 animate-in fade-in duration-200">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="col-span-2">
                                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Full Name *</label>
                                            <input required type="text" className="input-field" placeholder="e.g. Alex Johnson" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">GR Number</label>
                                            <input type="text" className="input-field" placeholder="GR-2024-001" value={formData.gr_no} onChange={e => setFormData({ ...formData, gr_no: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Grade</label>
                                            <input type="text" className="input-field" placeholder="e.g. 5" value={formData.grade} onChange={e => setFormData({ ...formData, grade: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Section</label>
                                            <input type="text" className="input-field" placeholder="A" value={formData.section} onChange={e => setFormData({ ...formData, section: e.target.value })} />
                                        </div>
                                    </div>
                                    <button type="button" onClick={() => setActiveSection('parent')} className="w-full py-2.5 bg-primary-50 text-primary-600 rounded-xl font-bold text-sm hover:bg-primary-100 transition-all">
                                        Next: Parent Details →
                                    </button>
                                </div>
                            )}

                            {/* Parent / Guardian Section */}
                            {activeSection === 'parent' && (
                                <div className="space-y-4 animate-in fade-in duration-200">
                                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/30">
                                        <p className="text-xs text-blue-700 dark:text-blue-300 font-bold">A parent login account will be auto-created using these details. They can track the bus and manage fees.</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Parent / Guardian Name</label>
                                        <input type="text" className="input-field" placeholder="e.g. Robert Johnson" value={formData.parent_name} onChange={e => setFormData({ ...formData, parent_name: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Parent Email (Login ID)</label>
                                        <input type="email" className="input-field" placeholder="parent@email.com" value={formData.parent_email} onChange={e => setFormData({ ...formData, parent_email: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Mobile Number</label>
                                        <input type="tel" className="input-field" placeholder="+91 98765 43210" value={formData.parent_phone} onChange={e => setFormData({ ...formData, parent_phone: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Default Password</label>
                                        <input type="text" className="input-field font-mono text-slate-500 bg-slate-50" value={formData.parent_password} onChange={e => setFormData({ ...formData, parent_password: e.target.value })} />
                                    </div>
                                    <button type="button" onClick={() => setActiveSection('assignment')} className="w-full py-2.5 bg-primary-50 text-primary-600 rounded-xl font-bold text-sm hover:bg-primary-100 transition-all">
                                        Next: Bus & Route →
                                    </button>
                                </div>
                            )}

                            {/* Bus & Route Section */}
                            {activeSection === 'assignment' && (
                                <div className="space-y-4 animate-in fade-in duration-200">
                                    <div>
                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Route ID (optional)</label>
                                        <input type="text" className="input-field" placeholder="Paste Route ID" value={formData.route_id} onChange={e => setFormData({ ...formData, route_id: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Stop ID (optional)</label>
                                        <input type="text" className="input-field" placeholder="Paste Stop ID" value={formData.stop_id} onChange={e => setFormData({ ...formData, stop_id: e.target.value })} />
                                    </div>
                                    <div className="pt-4 flex gap-3">
                                        <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 border border-border rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm">
                                            Cancel
                                        </button>
                                        <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
                                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : editingId ? 'Save Changes' : 'Enroll Student'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
