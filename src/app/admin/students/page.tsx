'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Search, Edit, Trash2, GraduationCap, Phone, MapPin, X, Loader2, FileUp, ChevronRight, ChevronLeft, Image, Download, Camera, UserCircle2, Save } from 'lucide-react';
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
    feeStructure?: { amount: number; frequency: string; due_day: number; academic_year: string };
};

const STEPS = ['Student Info', 'Parent / Guardian', 'Route & Stop', 'Fee Setup'] as const;

const EMPTY_FORM = {
    name: '', grade: '', section: '', gr_no: '',
    parent_mode: 'new' as 'new' | 'existing',
    parent_id: '',
    parent_name: '', parent_email: '', parent_phone: '', parent_password: '',
    route_id: '', stop_id: '',
    fee_amount: '', fee_frequency: 'monthly', fee_due_day: '5', academic_year: new Date().getFullYear().toString(),
};

const EMPTY_EDIT = {
    name: '', grade: '', section: '', gr_no: '',
    parent_id: '',
    parent_name: '', parent_email: '', parent_phone: '',
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

    // Create wizard modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [step, setStep] = useState(0);
    const [formData, setFormData] = useState({ ...EMPTY_FORM });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [parentSearch, setParentSearch] = useState('');

    // Edit simple modal state
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ ...EMPTY_EDIT });
    const [editStops, setEditStops] = useState<any[]>([]);
    const [editSaving, setEditSaving] = useState(false);
    const [parentCreds, setParentCreds] = useState<{ name: string; email: string; password: string } | null>(null);
    const [editError, setEditError] = useState('');
    const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);
    const [editParentSearch, setEditParentSearch] = useState('');
    const [editParents, setEditParents] = useState<any[]>([]);
    const [uploadingEditPhoto, setUploadingEditPhoto] = useState(false);
    const [editPhotoPreview, setEditPhotoPreview] = useState('');

    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [resetEmailLoading, setResetEmailLoading] = useState(false);
    const [resetEmailSent, setResetEmailSent] = useState(false);
    const importRef = useRef<HTMLInputElement>(null);
    const photoRef = useRef<HTMLInputElement>(null);
    const editPhotoRef = useRef<HTMLInputElement>(null);

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
            const { data } = await api.get('/stops', { params: { route_id: routeId, trip_type: 'morning' } });
            setStops(Array.isArray(data) ? data : []);
        } catch { setStops([]); }
    };

    const fetchEditStops = async (routeId: string) => {
        if (!routeId) { setEditStops([]); return; }
        try {
            const { data } = await api.get('/stops', { params: { route_id: routeId, trip_type: 'morning' } });
            setEditStops(Array.isArray(data) ? data : []);
        } catch { setEditStops([]); }
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
        setFormData({ ...EMPTY_FORM });
        setStep(0);
        setPhotoFile(null);
        setParents([]);
        setParentSearch('');
        setSubmitError('');
        setIsModalOpen(true);
    };

    const openEdit = (s: Student) => {
        setEditingId(s.id);
        setEditForm({
            name: s.name || '', grade: s.grade || '', section: s.section || '', gr_no: s.gr_no || '',
            parent_id: s.parent?.id || '',
            parent_name: s.parent?.name || '', parent_email: s.parent?.email || '',
            parent_phone: s.parent?.phone || '',
            route_id: s.route?.id || '', stop_id: s.stop?.id || '',
            fee_amount: s.feeStructure?.amount?.toString() || '',
            fee_frequency: s.feeStructure?.frequency || 'monthly',
            fee_due_day: s.feeStructure?.due_day?.toString() || '5',
            academic_year: s.feeStructure?.academic_year || new Date().getFullYear().toString(),
        });
        if (s.route?.id) fetchEditStops(s.route.id);
        else setEditStops([]);
        setEditPhotoFile(null);
        setEditPhotoPreview(s.photo_url || '');
        setEditError('');
        setResetEmailSent(false);
        // Pre-fill parent search with existing parent name; reset dropdown
        setEditParentSearch(s.parent?.name || '');
        setEditParents([]);
        setEditModalOpen(true);
    };

    const handleSendResetEmail = async () => {
        if (!editForm.parent_id) return;
        setResetEmailLoading(true);
        try {
            await api.post(`/users/${editForm.parent_id}/send-reset-email`);
            setResetEmailSent(true);
        } catch {
            // silent
        } finally {
            setResetEmailLoading(false);
        }
    };

    // Create wizard submit (no editingId path)
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.fee_amount) {
            setSubmitError('Please enter the fee amount before enrolling the student.');
            return;
        }
        setIsSubmitting(true);
        setSubmitError('');
        try {
            const payload: any = {
                name: formData.name, grade: formData.grade, section: formData.section, gr_no: formData.gr_no,
                ...(formData.parent_mode === 'existing' && formData.parent_id && { parent_id: formData.parent_id }),
                ...(formData.parent_mode === 'new' && formData.parent_email && {
                    parent_name: formData.parent_name,
                    parent_email: formData.parent_email,
                    parent_phone: formData.parent_phone || undefined,
                    parent_password: formData.parent_password || undefined,
                }),
                ...(formData.route_id && { route_id: formData.route_id }),
                ...(formData.stop_id && { stop_id: formData.stop_id }),
                fee_amount: parseFloat(formData.fee_amount),
                fee_frequency: formData.fee_frequency,
                fee_due_day: parseInt(formData.fee_due_day),
                academic_year: formData.academic_year,
            };

            const { data } = await api.post('/students', payload);
            const studentId = data?.id;

            if (photoFile && studentId) {
                const fd = new FormData();
                fd.append('photo', photoFile);
                await api.post(`/students/upload-photo`, fd, { params: { student_id: studentId }, headers: { 'Content-Type': undefined } });
            }

            // Show parent login credentials if parent account was created/updated
            const shownPassword = formData.parent_password || data?.temp_password;
            if (shownPassword && formData.parent_mode === 'new' && formData.parent_email) {
                setParentCreds({ name: formData.parent_name || 'Parent', email: formData.parent_email, password: shownPassword });
            }

            setIsModalOpen(false);
            fetchStudents();
        } catch (err: any) {
            const msg = err?.response?.data?.error || err?.message || 'Something went wrong. Please try again.';
            setSubmitError(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Edit simple modal submit
    const handleEditSubmit = async () => {
        if (!editingId) return;
        if (!editForm.name.trim()) { setEditError('Student name is required.'); return; }
        setEditSaving(true);
        setEditError('');
        try {
            await api.put(`/students/${editingId}`, {
                name: editForm.name.trim(),
                grade: editForm.grade || undefined,
                section: editForm.section || undefined,
                gr_no: editForm.gr_no || undefined,
                parent_name: editForm.parent_name || undefined,
                parent_phone: editForm.parent_phone || undefined,
                route_id: editForm.route_id || null,
                stop_id: editForm.stop_id || null,
                ...(editForm.fee_amount && {
                    fee_amount: parseFloat(editForm.fee_amount),
                    fee_frequency: editForm.fee_frequency,
                    fee_due_day: parseInt(editForm.fee_due_day),
                    academic_year: editForm.academic_year,
                }),
            });

            if (editPhotoFile) {
                const fd = new FormData();
                fd.append('photo', editPhotoFile);
                await api.post(`/students/upload-photo`, fd, { params: { student_id: editingId }, headers: { 'Content-Type': undefined } });
            }

            setEditModalOpen(false);
            fetchStudents();
        } catch (err: any) {
            const msg = err?.response?.data?.error || err?.message || 'Something went wrong. Please try again.';
            setEditError(msg);
        } finally {
            setEditSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await api.delete(`/students/${id}`);
            setStudents(prev => prev.filter(s => s.id !== id));
        } catch (err: any) {
            alert(err?.response?.data?.error || 'Failed to delete student. Please try again.');
        }
        setDeleteId(null);
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (importRef.current) importRef.current.value = '';

        const text = await file.text();
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length < 2) { alert('CSV appears empty or has no data rows.'); return; }
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
        const students = lines.slice(1).map(line => {
            const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            const row: Record<string, string> = {};
            headers.forEach((h, i) => { if (vals[i]) row[h] = vals[i]; });
            return row;
        }).filter(r => r.name);

        if (students.length === 0) { alert('No valid student rows found.'); return; }

        try {
            const { data } = await api.post('/students/bulk', { students });
            const errs = data?.errors?.length || 0;
            alert(`Imported ${data?.created?.length || 0} student(s).${errs ? ` ${errs} row(s) failed.` : ''}`);
            fetchStudents();
        } catch (err: any) {
            alert(err?.response?.data?.error || 'Import failed. Check your CSV format.');
        }
    };

    const downloadTemplate = () => {
        const headers = 'name,gr_no,grade,section,parent_name,parent_email,parent_phone';
        const example = 'Arjun Kumar,GR-001,5,A,Suresh Kumar,suresh@example.com,9876543210';
        const csv = `${headers}\n${example}`;
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'students_import_template.csv'; a.click();
        URL.revokeObjectURL(url);
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
        if (step === 1 && formData.parent_mode === 'new' && formData.parent_name && !formData.parent_email) return false;
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
                    <input ref={importRef} type="file" className="hidden" accept=".csv" onChange={handleImport} />
                    <button
                        onClick={downloadTemplate}
                        className="flex items-center gap-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all"
                        title="Download CSV template"
                    >
                        <Download className="w-4 h-4" /> Template
                    </button>
                    <button
                        onClick={() => importRef.current?.click()}
                        className="flex items-center gap-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all"
                    >
                        <FileUp className="w-4 h-4" /> Import CSV
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

            {/* Create — Multi-step Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Enroll Student</h2>
                                <p className="text-xs text-slate-400 mt-0.5">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-400 transition-all"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="p-6">
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
                                                            <button key={p.id} type="button" onClick={() => { setFormData({ ...formData, parent_id: p.id, parent_name: p.name, parent_email: p.email }); setParentSearch(p.name); setParents([]); }}
                                                                className={`w-full px-4 py-2.5 text-left text-sm hover:bg-[var(--brand)]/5 transition-all ${formData.parent_id === p.id ? 'bg-[var(--brand)]/10 text-[var(--brand)]' : ''}`}>
                                                                <p className="font-semibold">{p.name}</p>
                                                                <p className="text-xs text-slate-400">{p.email}</p>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                                {formData.parent_id && <p className="text-xs text-emerald-600 font-medium mt-1">Selected: {formData.parent_name}</p>}
                                            </div>
                                        ) : (
                                            <>
                                                <div>
                                                    <label className={labelCls}>Parent Name</label>
                                                    <input type="text" placeholder="e.g. Suresh Kumar" className={inputCls} value={formData.parent_name} onChange={e => setFormData({ ...formData, parent_name: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label className={labelCls}>
                                                        Email (Login ID){formData.parent_name ? ' *' : ''}
                                                    </label>
                                                    <input type="email" placeholder="parent@email.com" className={`${inputCls} ${formData.parent_name && !formData.parent_email ? 'border-red-400 focus:border-red-400' : ''}`} value={formData.parent_email} onChange={e => setFormData({ ...formData, parent_email: e.target.value })} />
                                                    {formData.parent_name && !formData.parent_email && (
                                                        <p className="text-xs text-red-500 mt-1">Email is required to create the parent account.</p>
                                                    )}
                                                </div>
                                                <div>
                                                    <label className={labelCls}>Phone</label>
                                                    <input type="tel" placeholder="+91 98765 43210" className={inputCls} value={formData.parent_phone} onChange={e => setFormData({ ...formData, parent_phone: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label className={labelCls}>Password <span className="text-slate-400 font-normal">(leave blank to auto-generate)</span></label>
                                                    <input type="text" placeholder="Set a password (min 8 chars)" className={inputCls} value={formData.parent_password} onChange={e => setFormData({ ...formData, parent_password: e.target.value })} autoComplete="off" />
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
                                                <label className={labelCls}>Fee Amount (₹) *</label>
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
                                        <p className="text-xs text-slate-400">Fee amount is required to enroll the student.</p>
                                    </div>
                                )}

                                {submitError && (
                                    <div className="mt-4 px-4 py-2.5 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl text-sm text-red-700 dark:text-red-400">
                                        {submitError}
                                    </div>
                                )}

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
                                        <button type="submit" disabled={isSubmitting || !formData.fee_amount} className="flex-1 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2">
                                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enroll Student'}
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit — Simple single-page modal */}
            {editModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Edit Student</h2>
                            <button onClick={() => setEditModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-400 transition-all"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Photo */}
                            <div className="flex flex-col items-center gap-3 pb-2">
                                <div className="relative">
                                    {editPhotoPreview ? (
                                        <img src={editPhotoPreview} alt={editForm.name} className="w-20 h-20 rounded-full object-cover border-2 border-[var(--brand)]" />
                                    ) : (
                                        <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-600">
                                            <UserCircle2 className="w-10 h-10 text-slate-400" />
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => editPhotoRef.current?.click()}
                                        disabled={uploadingEditPhoto}
                                        className="absolute -bottom-1 -right-1 w-7 h-7 bg-[var(--brand)] text-white rounded-full flex items-center justify-center shadow-md hover:opacity-90 transition-opacity disabled:opacity-50"
                                    >
                                        {uploadingEditPhoto
                                            ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            : <Camera className="w-3.5 h-3.5" />}
                                    </button>
                                    <input
                                        ref={editPhotoRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={e => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                setEditPhotoFile(file);
                                                setEditPhotoPreview(URL.createObjectURL(file));
                                            }
                                            e.target.value = '';
                                        }}
                                    />
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Tap camera to change photo</p>
                            </div>

                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Student Details</p>
                            <div>
                                <label className={labelCls}>Name <span className="text-red-500">*</span></label>
                                <input className={inputCls} placeholder="Full name" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className={labelCls}>GR No.</label>
                                    <input className={inputCls} placeholder="GR-001" value={editForm.gr_no} onChange={e => setEditForm(f => ({ ...f, gr_no: e.target.value }))} />
                                </div>
                                <div>
                                    <label className={labelCls}>Grade</label>
                                    <input className={inputCls} placeholder="5" value={editForm.grade} onChange={e => setEditForm(f => ({ ...f, grade: e.target.value }))} />
                                </div>
                                <div>
                                    <label className={labelCls}>Section</label>
                                    <input className={inputCls} placeholder="A" value={editForm.section} onChange={e => setEditForm(f => ({ ...f, section: e.target.value }))} />
                                </div>
                            </div>

                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider pt-2">Parent / Guardian</p>
                            <div className="relative">
                                <label className={labelCls}>Search & Select Parent</label>
                                <input
                                    className={inputCls}
                                    placeholder="Type parent name or email..."
                                    value={editParentSearch}
                                    onChange={async e => {
                                        setEditParentSearch(e.target.value);
                                        if (e.target.value.length >= 2) {
                                            try {
                                                const { data } = await api.get('/users', { params: { role: 'parent', search: e.target.value } });
                                                setEditParents(Array.isArray(data) ? data : []);
                                            } catch { setEditParents([]); }
                                        } else { setEditParents([]); }
                                    }}
                                />
                                {editParents.length > 0 && (
                                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                                        {editParents.map(p => (
                                            <button key={p.id} type="button"
                                                onClick={() => { setEditForm(f => ({ ...f, parent_id: p.id, parent_name: p.name, parent_email: p.email, parent_phone: p.phone || f.parent_phone })); setEditParentSearch(p.name); setEditParents([]); }}
                                                className="w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--brand)]/5 transition-all">
                                                <span className="font-medium text-slate-800 dark:text-white">{p.name}</span>
                                                <span className="text-slate-400 text-xs ml-2">{p.email}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {editForm.parent_id && <p className="text-xs text-emerald-600 font-medium mt-1">✓ Linked: {editForm.parent_name}</p>}
                            </div>
                            <div>
                                <label className={labelCls}>Parent Phone</label>
                                <input type="tel" className={inputCls} placeholder="+91 9876543210" value={editForm.parent_phone} onChange={e => setEditForm(f => ({ ...f, parent_phone: e.target.value }))} />
                            </div>
                            {editForm.parent_email && (
                                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 space-y-3">
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Email (Login ID)</p>
                                        <p className="text-sm font-medium text-slate-900 dark:text-white">{editForm.parent_email}</p>
                                    </div>
                                    <div className="pt-1 border-t border-slate-200 dark:border-slate-600">
                                        <p className="text-xs text-slate-400 mb-2">Send a password reset link to the parent's email.</p>
                                        <button
                                            type="button"
                                            onClick={handleSendResetEmail}
                                            disabled={resetEmailLoading || resetEmailSent}
                                            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border transition-all disabled:opacity-60 border-[var(--brand)] text-[var(--brand)] hover:bg-[var(--brand)]/10"
                                        >
                                            {resetEmailLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                                            {resetEmailSent ? '✓ Reset Email Sent' : resetEmailLoading ? 'Sending...' : 'Send Password Reset Email'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider pt-2">Transport Assignment</p>
                            <div>
                                <label className={labelCls}>Route</label>
                                <select className={inputCls} value={editForm.route_id} onChange={e => { setEditForm(f => ({ ...f, route_id: e.target.value, stop_id: '' })); fetchEditStops(e.target.value); }}>
                                    <option value="">No Route</option>
                                    {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>Stop</label>
                                <select className={`${inputCls} disabled:opacity-40`} value={editForm.stop_id} onChange={e => setEditForm(f => ({ ...f, stop_id: e.target.value }))} disabled={!editForm.route_id}>
                                    <option value="">No Stop</option>
                                    {editStops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>

                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider pt-2">Fee Setup</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelCls}>Fee Amount (₹)</label>
                                    <input type="number" min="0" className={inputCls} placeholder="e.g. 2500" value={editForm.fee_amount} onChange={e => setEditForm(f => ({ ...f, fee_amount: e.target.value }))} />
                                </div>
                                <div>
                                    <label className={labelCls}>Frequency</label>
                                    <select className={inputCls} value={editForm.fee_frequency} onChange={e => setEditForm(f => ({ ...f, fee_frequency: e.target.value }))}>
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
                                    <input type="number" min="1" max="31" placeholder="5" className={inputCls} value={editForm.fee_due_day} onChange={e => setEditForm(f => ({ ...f, fee_due_day: e.target.value }))} />
                                </div>
                                <div>
                                    <label className={labelCls}>Academic Year</label>
                                    <input type="text" placeholder="2024" className={inputCls} value={editForm.academic_year} onChange={e => setEditForm(f => ({ ...f, academic_year: e.target.value }))} />
                                </div>
                            </div>
                            <p className="text-xs text-slate-400">Leave fee amount blank to keep existing fee settings.</p>

                            {editError && (
                                <div className="px-4 py-2.5 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl text-sm text-red-700 dark:text-red-400">
                                    {editError}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 px-6 pb-6">
                            <button
                                onClick={() => setEditModalOpen(false)}
                                className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-4 py-2.5 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleEditSubmit}
                                disabled={editSaving}
                                className="flex-1 flex items-center justify-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95 disabled:opacity-50"
                            >
                                {editSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {deleteId && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Remove this student?</h3>
                            <button onClick={() => setDeleteId(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 text-center">
                            <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="w-6 h-6 text-red-500" />
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">This will permanently remove the student record.</p>
                            <div className="flex gap-3">
                                <button onClick={() => setDeleteId(null)} className="flex-1 flex items-center gap-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all justify-center">Cancel</button>
                                <button onClick={() => handleDelete(deleteId)} className="flex-1 flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95 justify-center">Delete</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        {/* Parent credentials dialog — shown when a new parent account is auto-created */}
        {parentCreds && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm">
                    <div className="p-6 text-center space-y-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
                            <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">Parent Account Created</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Share these login credentials with the parent. Password must be changed on first login.</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 text-left space-y-2">
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-500 dark:text-slate-400">Name</span>
                                <span className="font-semibold text-slate-800 dark:text-white">{parentCreds.name}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-500 dark:text-slate-400">Email</span>
                                <span className="font-semibold text-slate-800 dark:text-white">{parentCreds.email}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500 dark:text-slate-400">Temp Password</span>
                                <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-[var(--brand)] text-sm">{parentCreds.password}</span>
                                    <button
                                        onClick={() => navigator.clipboard.writeText(parentCreds.password)}
                                        className="text-[10px] bg-[var(--brand)]/10 text-[var(--brand)] px-2 py-0.5 rounded-md font-semibold hover:bg-[var(--brand)]/20 transition-colors"
                                    >
                                        Copy
                                    </button>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setParentCreds(null)}
                            className="w-full bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95"
                        >
                            Done
                        </button>
                    </div>
                </div>
            </div>
        )}
        </div>
    );
}
