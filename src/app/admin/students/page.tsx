'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Search, Edit, Trash2, GraduationCap, Phone, MapPin, X, Loader2, FileUp, ChevronRight, ChevronLeft, Image } from 'lucide-react';
import api from '@/lib/api';

type Student = {
    id: string;
    name: string;
    grade?: string;
    section?: string;
    gr_no?: string;
    photo_url?: string;
    parent?: { id: string; name: string; email: string; phone: string };
    route?: { id: string; name: string };
    stop?: { id: string; name: string };
    fees?: { due_amount: number }[];
};

const STEPS = ['Student Info', 'Parent / Guardian', 'Route & Stop', 'Fee Setup'] as const;

const EMPTY_FORM = {
    name: '', grade: '', section: '', gr_no: '',
    parent_mode: 'new' as 'new' | 'existing',
    parent_id: '',
    parent_name: '', parent_email: '', parent_phone: '', parent_password: 'parent123',
    route_id: '', stop_id: '',
    fee_amount: '', fee_frequency: 'monthly', fee_due_day: '5', academic_year: new Date().getFullYear().toString(),
};

export default function StudentsPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterRoute, setFilterRoute] = useState('');
    const [routes, setRoutes] = useState<any[]>([]);
    const [stops, setStops] = useState<any[]>([]);
    const [parents, setParents] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [step, setStep] = useState(0);
    const [formData, setFormData] = useState({ ...EMPTY_FORM });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [parentSearch, setParentSearch] = useState('');
    const importRef = useRef<HTMLInputElement>(null);
    const photoRef = useRef<HTMLInputElement>(null);

    useEffect(() => { fetchStudents(); fetchRoutes(); }, []);

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/students');
            setStudents(Array.isArray(data) ? data : []);
        } catch {
            setStudents([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchRoutes = async () => {
        try {
            const { data } = await api.get('/routes');
            setRoutes(Array.isArray(data) ? data : []);
        } catch { setRoutes([]); }
    };

    const fetchStops = async (routeId: string) => {
        if (!routeId) { setStops([]); return; }
        try {
            const { data } = await api.get('/stops', { params: { route_id: routeId } });
            setStops(Array.isArray(data) ? data : []);
        } catch { setStops([]); }
    };

    const searchParents = async (q: string) => {
        setParentSearch(q);
        if (q.length < 2) { setParents([]); return; }
        try {
            const { data } = await api.get('/users', { params: { role: 'parent', search: q } });
            setParents(Array.isArray(data) ? data : []);
        } catch { setParents([]); }
    };

    const openCreate = () => {
        setEditingId(null);
        setFormData({ ...EMPTY_FORM });
        setStep(0);
        setPhotoFile(null);
        setParents([]);
        setParentSearch('');
        setIsModalOpen(true);
    };

    const openEdit = (s: Student) => {
        setEditingId(s.id);
        setFormData({
            name: s.name || '', grade: s.grade || '', section: s.section || '', gr_no: s.gr_no || '',
            parent_mode: s.parent ? 'existing' : 'new',
            parent_id: s.parent?.id || '',
            parent_name: s.parent?.name || '', parent_email: s.parent?.email || '',
            parent_phone: s.parent?.phone || '', parent_password: 'parent123',
            route_id: s.route?.id || '', stop_id: s.stop?.id || '',
            fee_amount: '', fee_frequency: 'monthly', fee_due_day: '5', academic_year: new Date().getFullYear().toString(),
        });
        setStep(0);
        setPhotoFile(null);
        setParents([]);
        setParentSearch('');
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            let parent_id = formData.parent_id || undefined;
            if (formData.parent_mode === 'new' && formData.parent_email) {
                try {
                    const res = await api.post('/users', {
                        name: formData.parent_name, email: formData.parent_email,
                        phone: formData.parent_phone, password: formData.parent_password, role: 'parent',
                    });
                    parent_id = res.data?.id;
                } catch { /* parent may already exist */ }
            }

            const payload: any = {
                name: formData.name, grade: formData.grade, section: formData.section, gr_no: formData.gr_no,
                ...(parent_id && { parent_id }),
                ...(formData.route_id && { route_id: formData.route_id }),
                ...(formData.stop_id && { stop_id: formData.stop_id }),
                ...(formData.fee_amount && {
                    fee_amount: parseFloat(formData.fee_amount),
                    fee_frequency: formData.fee_frequency,
                    fee_due_day: parseInt(formData.fee_due_day),
                    academic_year: formData.academic_year,
                }),
            };

            let studentId = editingId;
            if (editingId) {
                await api.put(`/students/${editingId}`, payload);
            } else {
                const { data } = await api.post('/students', payload);
                studentId = data?.id;
            }

            if (photoFile && studentId) {
                const fd = new FormData();
                fd.append('photo', photoFile);
                try { await api.post(`/students/upload-photo`, fd, { params: { student_id: studentId } }); } catch { /* ignore */ }
            }

            setIsModalOpen(false);
            fetchStudents();
        } catch {
            setIsModalOpen(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        try { await api.delete(`/students/${id}`); } catch { /* ignore */ }
        setStudents(prev => prev.filter(s => s.id !== id));
        setDeleteId(null);
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const fd = new FormData();
        fd.append('file', file);
        try { await api.post('/students/bulk', fd); fetchStudents(); } catch { /* ignore */ }
        if (importRef.current) importRef.current.value = '';
    };

    const filtered = students.filter(s => {
        const matchSearch = !search ||
            s.name?.toLowerCase().includes(search.toLowerCase()) ||
            s.gr_no?.toLowerCase().includes(search.toLowerCase());
        const matchRoute = !filterRoute || s.route?.id === filterRoute;
        return matchSearch && matchRoute;
    });

    const canProceed = () => {
        if (step === 0) return !!formData.name;
        return true;
    };

    return (
        <div className="space-y-6 animate-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Students</h1>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Manage student profiles, parents and bus assignments.</p>
                </div>
                <div className="flex gap-2">
                    <input ref={importRef} type="file" className="hidden" accept=".csv,.xlsx,.xls" onChange={handleImport} />
                    <button
                        onClick={() => importRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-xl font-semibold text-sm transition-all"
                    >
                        <FileUp className="w-4 h-4" /> Import
                    </button>
                    <button
                        onClick={openCreate}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-all"
                    >
                        <Plus className="w-4 h-4" /> Add Student
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-3 flex-wrap">
                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search name or GR no..."
                        className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <select
                    className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={filterRoute}
                    onChange={e => setFilterRoute(e.target.value)}
                >
                    <option value="">All Routes</option>
                    {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-slate-800">
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">Student</th>
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">Grade</th>
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">Parent</th>
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">Route / Stop</th>
                                <th className="px-6 py-3 text-right text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                            {loading ? (
                                <tr><td colSpan={5} className="px-6 py-12 text-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" /></td></tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-16 text-center text-gray-400">
                                        <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p className="font-bold">No students found</p>
                                    </td>
                                </tr>
                            ) : filtered.map(s => (
                                <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            {s.photo_url ? (
                                                <img src={s.photo_url} alt={s.name} className="w-9 h-9 rounded-full object-cover" />
                                            ) : (
                                                <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 font-black text-sm">
                                                    {s.name?.charAt(0)}
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-bold text-gray-800 dark:text-white">{s.name}</p>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{s.gr_no || '—'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2.5 py-1 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 rounded-lg text-xs font-bold">
                                            {s.grade || '—'}{s.section ? `-${s.section}` : ''}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="font-medium text-gray-700 dark:text-slate-200">{s.parent?.name || '—'}</p>
                                        {s.parent?.phone && (
                                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                                <Phone className="w-3 h-3" /> {s.parent.phone}
                                            </p>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {s.stop?.name ? (
                                            <span className="flex items-center gap-1.5 text-gray-500 dark:text-slate-400">
                                                <MapPin className="w-3.5 h-3.5 text-orange-400" />
                                                {s.stop.name}
                                            </span>
                                        ) : <span className="text-gray-400 text-xs italic">Unassigned</span>}
                                        {s.route?.name && (
                                            <p className="text-[10px] text-blue-500 font-bold uppercase mt-0.5">{s.route.name}</p>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => openEdit(s)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"><Edit className="w-4 h-4" /></button>
                                            <button onClick={() => setDeleteId(s.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Multi-step Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-lg w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-lg font-black text-gray-900 dark:text-white">{editingId ? 'Edit Student' : 'Enroll Student'}</h2>
                                <p className="text-xs text-gray-400 mt-0.5">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl text-gray-400 transition-all"><X className="w-5 h-5" /></button>
                        </div>

                        {/* Step indicator */}
                        <div className="flex gap-1.5 mb-6">
                            {STEPS.map((s, i) => (
                                <div key={s} className={`flex-1 h-1.5 rounded-full transition-all ${i <= step ? 'bg-blue-600' : 'bg-gray-200 dark:bg-slate-700'}`} />
                            ))}
                        </div>

                        <form onSubmit={handleSubmit}>
                            {/* Step 0: Student Info */}
                            {step === 0 && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Full Name *</label>
                                        <input required type="text" placeholder="e.g. Arjun Kumar" className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">GR No.</label>
                                            <input type="text" placeholder="GR-001" className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500" value={formData.gr_no} onChange={e => setFormData({ ...formData, gr_no: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Grade</label>
                                            <input type="text" placeholder="5" className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500" value={formData.grade} onChange={e => setFormData({ ...formData, grade: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Section</label>
                                            <input type="text" placeholder="A" className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500" value={formData.section} onChange={e => setFormData({ ...formData, section: e.target.value })} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 1: Parent */}
                            {step === 1 && (
                                <div className="space-y-4">
                                    <div className="flex gap-2 p-1 bg-gray-100 dark:bg-slate-800 rounded-xl">
                                        {(['new', 'existing'] as const).map(mode => (
                                            <button key={mode} type="button" onClick={() => setFormData({ ...formData, parent_mode: mode })}
                                                className={`flex-1 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${formData.parent_mode === mode ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-gray-400'}`}>
                                                {mode === 'new' ? 'Create New' : 'Existing Parent'}
                                            </button>
                                        ))}
                                    </div>
                                    {formData.parent_mode === 'existing' ? (
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Search Parent</label>
                                            <input type="text" placeholder="Type name or email..." className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2" value={parentSearch} onChange={e => searchParents(e.target.value)} />
                                            {parents.length > 0 && (
                                                <div className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
                                                    {parents.map(p => (
                                                        <button key={p.id} type="button" onClick={() => { setFormData({ ...formData, parent_id: p.id }); setParentSearch(p.name); setParents([]); }}
                                                            className={`w-full px-4 py-2.5 text-left text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all ${formData.parent_id === p.id ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : ''}`}>
                                                            <p className="font-bold">{p.name}</p>
                                                            <p className="text-xs text-gray-400">{p.email}</p>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                            {formData.parent_id && <p className="text-xs text-emerald-600 font-bold mt-1">Selected parent ID: {formData.parent_id}</p>}
                                        </div>
                                    ) : (
                                        <>
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Parent Name</label>
                                                <input type="text" placeholder="e.g. Suresh Kumar" className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500" value={formData.parent_name} onChange={e => setFormData({ ...formData, parent_name: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Email (Login ID)</label>
                                                <input type="email" placeholder="parent@email.com" className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500" value={formData.parent_email} onChange={e => setFormData({ ...formData, parent_email: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Phone</label>
                                                <input type="tel" placeholder="+91 98765 43210" className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500" value={formData.parent_phone} onChange={e => setFormData({ ...formData, parent_phone: e.target.value })} />
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Step 2: Route & Stop + Photo */}
                            {step === 2 && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Route</label>
                                        <select className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500" value={formData.route_id} onChange={e => { setFormData({ ...formData, route_id: e.target.value, stop_id: '' }); fetchStops(e.target.value); }}>
                                            <option value="">Select route...</option>
                                            {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Stop</label>
                                        <select className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500" value={formData.stop_id} onChange={e => setFormData({ ...formData, stop_id: e.target.value })} disabled={!formData.route_id}>
                                            <option value="">Select stop...</option>
                                            {stops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Photo (optional)</label>
                                        <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={e => setPhotoFile(e.target.files?.[0] || null)} />
                                        <button type="button" onClick={() => photoRef.current?.click()} className="w-full py-6 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl flex flex-col items-center gap-2 text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-all">
                                            <Image className="w-6 h-6" />
                                            <span className="text-xs font-bold">{photoFile ? photoFile.name : 'Click to upload photo'}</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Fee Setup */}
                            {step === 3 && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Fee Amount (₹)</label>
                                            <input type="number" placeholder="2500" className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500" value={formData.fee_amount} onChange={e => setFormData({ ...formData, fee_amount: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Frequency</label>
                                            <select className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500" value={formData.fee_frequency} onChange={e => setFormData({ ...formData, fee_frequency: e.target.value })}>
                                                <option value="monthly">Monthly</option>
                                                <option value="weekly">Weekly</option>
                                                <option value="quarterly">Quarterly</option>
                                                <option value="half-yearly">Half-Yearly</option>
                                                <option value="yearly">Yearly</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Due Day</label>
                                            <input type="number" min="1" max="31" placeholder="5" className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500" value={formData.fee_due_day} onChange={e => setFormData({ ...formData, fee_due_day: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Academic Year</label>
                                            <input type="text" placeholder="2024" className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500" value={formData.academic_year} onChange={e => setFormData({ ...formData, academic_year: e.target.value })} />
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-400">Leave fee amount blank to skip fee setup now.</p>
                                </div>
                            )}

                            {/* Navigation */}
                            <div className="flex gap-3 mt-6">
                                {step > 0 && (
                                    <button type="button" onClick={() => setStep(s => s - 1)} className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl font-semibold text-sm hover:bg-gray-50 dark:hover:bg-slate-800 transition-all">
                                        <ChevronLeft className="w-4 h-4" /> Back
                                    </button>
                                )}
                                {step < STEPS.length - 1 ? (
                                    <button type="button" disabled={!canProceed()} onClick={() => setStep(s => s + 1)} className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50">
                                        Next <ChevronRight className="w-4 h-4" />
                                    </button>
                                ) : (
                                    <button type="submit" disabled={isSubmitting} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-60">
                                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : editingId ? 'Save Changes' : 'Enroll Student'}
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {deleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center">
                        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                            <Trash2 className="w-6 h-6 text-red-500" />
                        </div>
                        <h3 className="font-black text-gray-900 dark:text-white mb-2">Remove this student?</h3>
                        <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">This will permanently remove the student record.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl font-semibold text-sm hover:bg-gray-50 dark:hover:bg-slate-800 transition-all">Cancel</button>
                            <button onClick={() => handleDelete(deleteId)} className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-all">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
