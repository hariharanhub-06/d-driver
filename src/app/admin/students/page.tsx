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

    const inputCls = "w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors";
    const labelCls = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5";

    return (
        <div className="space-y-6 animate-in">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Students</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage student profiles, parents and bus assignments.</p>
                </div>
                <div className="flex gap-2">
                    <input ref={importRef} type="file" className="hidden" accept=".csv,.xlsx,.xls" onChange={handleImport} />
                    <button
                        onClick={() => importRef.current?.click()}
                        className="flex items-center gap-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all"
                    >
                        <FileUp className="w-4 h-4" /> Import
                    </button>
                    <button
                        onClick={openCreate}
                        className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95"
                    >
                        <Plus className="w-4 h-4" /> Add Student
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-4">
                <div className="flex gap-3 flex-wrap">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search name or GR no..."
                            className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 pl-9 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <select
                        className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[var(--brand)] transition-colors"
                        value={filterRoute}
                        onChange={e => setFilterRoute(e.target.value)}
                    >
                        <option value="">All Routes</option>
                        {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Student</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Grade</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Parent</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Route / Stop</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-3">
                                        <div className="flex justify-center py-16">
                                            <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">
                                        <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                        <p className="font-medium">No students found</p>
                                    </td>
                                </tr>
                            ) : filtered.map(s => (
                                <tr key={s.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                        <div className="flex items-center gap-3">
                                            {s.photo_url ? (
                                                <img src={s.photo_url} alt={s.name} className="w-9 h-9 rounded-full object-cover" />
                                            ) : (
                                                <div className="w-9 h-9 rounded-full bg-[var(--brand)]/10 flex items-center justify-center text-[var(--brand)] font-bold text-sm">
                                                    {s.name?.charAt(0)}
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-semibold text-slate-800 dark:text-white">{s.name}</p>
                                                <p className="text-xs text-slate-400 uppercase tracking-wider">{s.gr_no || '—'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                        <span className="inline-flex items-center bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full px-2.5 py-0.5 text-xs font-medium">
                                            {s.grade || '—'}{s.section ? `-${s.section}` : ''}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                        <p className="font-medium">{s.parent?.name || '—'}</p>
                                        {s.parent?.phone && (
                                            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                                <Phone className="w-3 h-3" /> {s.parent.phone}
                                            </p>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                        {s.stop?.name ? (
                                            <span className="flex items-center gap-1.5">
                                                <MapPin className="w-3.5 h-3.5 text-orange-400" />
                                                {s.stop.name}
                                            </span>
                                        ) : <span className="text-slate-400 text-xs italic">Unassigned</span>}
                                        {s.route?.name && (
                                            <p className="text-xs text-[var(--brand)] font-medium uppercase mt-0.5">{s.route.name}</p>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 text-right">
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => openEdit(s)} className="p-2 text-slate-400 hover:text-[var(--brand)] hover:bg-[var(--brand)]/10 rounded-lg transition-all"><Edit className="w-4 h-4" /></button>
                                            <button onClick={() => setDeleteId(s.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
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
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{editingId ? 'Edit Student' : 'Enroll Student'}</h2>
                                <p className="text-xs text-slate-400 mt-0.5">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-400 transition-all"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="p-6">
                            {/* Step indicator */}
                            <div className="flex gap-1.5 mb-6">
                                {STEPS.map((s, i) => (
                                    <div key={s} className={`flex-1 h-1.5 rounded-full transition-all ${i <= step ? 'bg-[var(--brand)]' : 'bg-slate-200 dark:bg-slate-700'}`} />
                                ))}
                            </div>

                            <form onSubmit={handleSubmit}>
                                {/* Step 0: Student Info */}
                                {step === 0 && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className={labelCls}>Full Name *</label>
                                            <input required type="text" placeholder="e.g. Arjun Kumar" className={inputCls} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                        </div>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div>
                                                <label className={labelCls}>GR No.</label>
                                                <input type="text" placeholder="GR-001" className={inputCls} value={formData.gr_no} onChange={e => setFormData({ ...formData, gr_no: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className={labelCls}>Grade</label>
                                                <input type="text" placeholder="5" className={inputCls} value={formData.grade} onChange={e => setFormData({ ...formData, grade: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className={labelCls}>Section</label>
                                                <input type="text" placeholder="A" className={inputCls} value={formData.section} onChange={e => setFormData({ ...formData, section: e.target.value })} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Step 1: Parent */}
                                {step === 1 && (
                                    <div className="space-y-4">
                                        <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-700 rounded-xl">
                                            {(['new', 'existing'] as const).map(mode => (
                                                <button key={mode} type="button" onClick={() => setFormData({ ...formData, parent_mode: mode })}
                                                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${formData.parent_mode === mode ? 'bg-white dark:bg-slate-600 text-[var(--brand)] shadow-sm' : 'text-slate-400'}`}>
                                                    {mode === 'new' ? 'Create New' : 'Existing Parent'}
                                                </button>
                                            ))}
                                        </div>
                                        {formData.parent_mode === 'existing' ? (
                                            <div>
                                                <label className={labelCls}>Search Parent</label>
                                                <input type="text" placeholder="Type name or email..." className={`${inputCls} mb-2`} value={parentSearch} onChange={e => searchParents(e.target.value)} />
                                                {parents.length > 0 && (
                                                    <div className="border border-slate-200 dark:border-slate-600 rounded-xl overflow-hidden">
                                                        {parents.map(p => (
                                                            <button key={p.id} type="button" onClick={() => { setFormData({ ...formData, parent_id: p.id }); setParentSearch(p.name); setParents([]); }}
                                                                className={`w-full px-4 py-2.5 text-left text-sm hover:bg-[var(--brand)]/5 transition-all ${formData.parent_id === p.id ? 'bg-[var(--brand)]/10 text-[var(--brand)]' : ''}`}>
                                                                <p className="font-semibold">{p.name}</p>
                                                                <p className="text-xs text-slate-400">{p.email}</p>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                                {formData.parent_id && <p className="text-xs text-emerald-600 font-medium mt-1">Selected parent ID: {formData.parent_id}</p>}
                                            </div>
                                        ) : (
                                            <>
                                                <div>
                                                    <label className={labelCls}>Parent Name</label>
                                                    <input type="text" placeholder="e.g. Suresh Kumar" className={inputCls} value={formData.parent_name} onChange={e => setFormData({ ...formData, parent_name: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label className={labelCls}>Email (Login ID)</label>
                                                    <input type="email" placeholder="parent@email.com" className={inputCls} value={formData.parent_email} onChange={e => setFormData({ ...formData, parent_email: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label className={labelCls}>Phone</label>
                                                    <input type="tel" placeholder="+91 98765 43210" className={inputCls} value={formData.parent_phone} onChange={e => setFormData({ ...formData, parent_phone: e.target.value })} />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}

                                {/* Step 2: Route & Stop + Photo */}
                                {step === 2 && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className={labelCls}>Route</label>
                                            <select className={inputCls} value={formData.route_id} onChange={e => { setFormData({ ...formData, route_id: e.target.value, stop_id: '' }); fetchStops(e.target.value); }}>
                                                <option value="">Select route...</option>
                                                {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className={labelCls}>Stop</label>
                                            <select className={inputCls} value={formData.stop_id} onChange={e => setFormData({ ...formData, stop_id: e.target.value })} disabled={!formData.route_id}>
                                                <option value="">Select stop...</option>
                                                {stops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className={labelCls}>Photo (optional)</label>
                                            <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={e => setPhotoFile(e.target.files?.[0] || null)} />
                                            <button type="button" onClick={() => photoRef.current?.click()} className="w-full py-6 border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl flex flex-col items-center gap-2 text-slate-400 hover:border-[var(--brand)] hover:text-[var(--brand)] transition-all">
                                                <Image className="w-6 h-6" />
                                                <span className="text-xs font-medium">{photoFile ? photoFile.name : 'Click to upload photo'}</span>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Step 3: Fee Setup */}
                                {step === 3 && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className={labelCls}>Fee Amount (₹)</label>
                                                <input type="number" placeholder="2500" className={inputCls} value={formData.fee_amount} onChange={e => setFormData({ ...formData, fee_amount: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className={labelCls}>Frequency</label>
                                                <select className={inputCls} value={formData.fee_frequency} onChange={e => setFormData({ ...formData, fee_frequency: e.target.value })}>
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
                                                <label className={labelCls}>Due Day</label>
                                                <input type="number" min="1" max="31" placeholder="5" className={inputCls} value={formData.fee_due_day} onChange={e => setFormData({ ...formData, fee_due_day: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className={labelCls}>Academic Year</label>
                                                <input type="text" placeholder="2024" className={inputCls} value={formData.academic_year} onChange={e => setFormData({ ...formData, academic_year: e.target.value })} />
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-400">Leave fee amount blank to skip fee setup now.</p>
                                    </div>
                                )}

                                {/* Navigation */}
                                <div className="flex gap-3 mt-6">
                                    {step > 0 && (
                                        <button type="button" onClick={() => setStep(s => s - 1)} className="flex items-center gap-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all">
                                            <ChevronLeft className="w-4 h-4" /> Back
                                        </button>
                                    )}
                                    {step < STEPS.length - 1 ? (
                                        <button type="button" disabled={!canProceed()} onClick={() => setStep(s => s + 1)} className="flex-1 flex items-center justify-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95 disabled:opacity-50">
                                            Next <ChevronRight className="w-4 h-4" />
                                        </button>
                                    ) : (
                                        <button type="submit" disabled={isSubmitting} className="flex-1 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95 disabled:opacity-60">
                                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : editingId ? 'Save Changes' : 'Enroll Student'}
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {deleteId && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
                        <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                            <Trash2 className="w-6 h-6 text-red-500" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Remove this student?</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">This will permanently remove the student record.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteId(null)} className="flex-1 flex items-center gap-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all justify-center">Cancel</button>
                            <button onClick={() => handleDelete(deleteId)} className="flex-1 flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95 justify-center">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
