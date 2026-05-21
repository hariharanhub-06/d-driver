'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Search, Loader2, X, Save, UserCircle2, Plus, Copy, Check } from 'lucide-react';
import api from '@/lib/api';

interface Student {
    id: string;
    name: string;
    grade?: string;
    section?: string;
    gr_no?: string;
    photo_url?: string;
    route_id?: string;
    stop_id?: string;
    route?: { id: string; name: string } | null;
    stop?: { id: string; name: string } | null;
    parent?: { name: string; phone?: string; email?: string } | null;
}

interface Route {
    id: string;
    name: string;
}

interface Stop {
    id: string;
    name: string;
    route_id: string;
}

const inputCls = "w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors";

const emptyAddForm = {
    name: '',
    grade: '',
    section: '',
    gr_no: '',
    parent_name: '',
    parent_email: '',
    parent_phone: '',
    route_id: '',
    stop_id: '',
};

export default function SchoolStudentsPage() {
    const { id } = useParams<{ id: string }>();

    const [students, setStudents] = useState<Student[]>([]);
    const [routes, setRoutes] = useState<Route[]>([]);
    const [stops, setStops] = useState<Stop[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [editForm, setEditForm] = useState({
        name: '', grade: '', section: '', gr_no: '',
        parent_name: '', parent_phone: '',
        route_id: '', stop_id: '',
    });
    const [saving, setSaving] = useState(false);
    const [editError, setEditError] = useState('');

    // Add student modal state
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [addForm, setAddForm] = useState(emptyAddForm);
    const [addStops, setAddStops] = useState<Stop[]>([]);
    const [addSaving, setAddSaving] = useState(false);
    const [addError, setAddError] = useState('');
    const [tempPassword, setTempPassword] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        fetchAll();
    }, [id]);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [studRes, routesRes] = await Promise.allSettled([
                api.get(`/students?school_id=${id}`),
                api.get(`/routes?school_id=${id}`),
            ]);
            if (studRes.status === 'fulfilled') {
                setStudents(Array.isArray(studRes.value.data) ? studRes.value.data : []);
            }
            if (routesRes.status === 'fulfilled') {
                setRoutes(Array.isArray(routesRes.value.data) ? routesRes.value.data : []);
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchStopsForRoute = async (routeId: string) => {
        if (!routeId) { setStops([]); return; }
        try {
            const res = await api.get(`/stops?route_id=${routeId}`);
            setStops(Array.isArray(res.data) ? res.data : []);
        } catch {
            setStops([]);
        }
    };

    const openEdit = (student: Student) => {
        setEditingStudent(student);
        const routeId = student.route_id || student.route?.id || '';
        const stopId = student.stop_id || student.stop?.id || '';
        setEditForm({
            name: student.name || '',
            grade: student.grade || '',
            section: student.section || '',
            gr_no: student.gr_no || '',
            parent_name: student.parent?.name || '',
            parent_phone: student.parent?.phone || '',
            route_id: routeId,
            stop_id: stopId,
        });
        setEditError('');
        if (routeId) fetchStopsForRoute(routeId);
    };

    const handleRouteChange = (routeId: string) => {
        setEditForm(f => ({ ...f, route_id: routeId, stop_id: '' }));
        fetchStopsForRoute(routeId);
    };

    const handleSave = async () => {
        if (!editingStudent) return;
        if (!editForm.name.trim()) { setEditError('Student name is required.'); return; }
        setSaving(true);
        setEditError('');
        try {
            await api.put(`/students/${editingStudent.id}`, {
                name: editForm.name.trim(),
                grade: editForm.grade || undefined,
                section: editForm.section || undefined,
                gr_no: editForm.gr_no || undefined,
                parent_name: editForm.parent_name || undefined,
                parent_phone: editForm.parent_phone || undefined,
                route_id: editForm.route_id || null,
                stop_id: editForm.stop_id || null,
            });
            setEditingStudent(null);
            fetchAll();
        } catch (e: any) {
            setEditError(e.response?.data?.message || 'Failed to save changes.');
        } finally {
            setSaving(false);
        }
    };

    const fetchAddStops = async (routeId: string) => {
        if (!routeId) { setAddStops([]); return; }
        try {
            const res = await api.get(`/stops?route_id=${routeId}`);
            setAddStops(Array.isArray(res.data) ? res.data : []);
        } catch {
            setAddStops([]);
        }
    };

    const handleAddRouteChange = (routeId: string) => {
        setAddForm(f => ({ ...f, route_id: routeId, stop_id: '' }));
        fetchAddStops(routeId);
    };

    const openAddModal = () => {
        setAddForm(emptyAddForm);
        setAddStops([]);
        setAddError('');
        setTempPassword('');
        setCopied(false);
        setAddModalOpen(true);
    };

    const handleAddStudent = async () => {
        if (!addForm.name.trim()) { setAddError('Student name is required.'); return; }
        if (!addForm.parent_email.trim()) { setAddError('Parent email is required.'); return; }
        setAddSaving(true);
        setAddError('');
        try {
            const res = await api.post('/students', {
                name: addForm.name.trim(),
                grade: addForm.grade || undefined,
                section: addForm.section || undefined,
                gr_no: addForm.gr_no || undefined,
                parent_name: addForm.parent_name || undefined,
                parent_email: addForm.parent_email.trim(),
                parent_phone: addForm.parent_phone || undefined,
                route_id: addForm.route_id || undefined,
                stop_id: addForm.stop_id || undefined,
                school_id: id,
            });
            const pwd = res.data?.temp_password || res.data?.parent?.temp_password || '';
            if (pwd) {
                setTempPassword(pwd);
            } else {
                setAddModalOpen(false);
                fetchAll();
            }
            fetchAll();
        } catch (e: any) {
            setAddError(e.response?.data?.message || 'Failed to create student.');
        } finally {
            setAddSaving(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(tempPassword);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const filtered = students.filter(s =>
        s.name?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-5">
            {/* Header: search + add */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search students..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors"
                    />
                </div>
                <button
                    onClick={openAddModal}
                    className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95"
                >
                    <Plus className="w-4 h-4" /> Add Student
                </button>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex justify-center py-16">
                            <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">
                            {search ? 'No students match your search.' : 'No students found.'}
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-700">
                                    {['Student', 'Grade', 'Route', 'Stop', 'Parent', ''].map(col => (
                                        <th key={col} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-700/50">
                                            {col}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(student => (
                                    <tr key={student.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                            <div className="flex items-center gap-3">
                                                {student.photo_url ? (
                                                    <img
                                                        src={student.photo_url}
                                                        alt={student.name}
                                                        className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-100 dark:border-slate-600"
                                                    />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                                                        <UserCircle2 className="w-4 h-4 text-slate-400" />
                                                    </div>
                                                )}
                                                <span className="font-semibold text-slate-900 dark:text-white">{student.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                            {student.grade || '—'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                            {student.route?.name || '—'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                            {student.stop?.name || '—'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                            {student.parent?.name || '—'}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => openEdit(student)}
                                                className="flex items-center gap-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-3 py-1.5 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                                            >
                                                Edit
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Add Student modal */}
            {addModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
                            <h2 className="text-slate-900 dark:text-white font-bold text-base">Add Student</h2>
                            <button
                                onClick={() => { setAddModalOpen(false); setTempPassword(''); }}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {tempPassword ? (
                            <div className="p-6 space-y-4">
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">Student created successfully!</p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">Share this temporary password with the parent:</p>
                                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3">
                                    <span className="flex-1 font-mono text-sm text-slate-900 dark:text-white select-all">{tempPassword}</span>
                                    <button
                                        onClick={handleCopy}
                                        className="flex items-center gap-1.5 text-xs font-semibold text-[var(--brand)] hover:opacity-80 transition-opacity"
                                    >
                                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                        {copied ? 'Copied!' : 'Copy'}
                                    </button>
                                </div>
                                <button
                                    onClick={() => { setAddModalOpen(false); setTempPassword(''); }}
                                    className="w-full bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95"
                                >
                                    Done
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="p-6 space-y-4">
                                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Student Details</p>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Name <span className="text-red-500">*</span></label>
                                        <input className={inputCls} placeholder="Full name" value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} />
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Grade</label>
                                            <input className={inputCls} placeholder="e.g. 5" value={addForm.grade} onChange={e => setAddForm(f => ({ ...f, grade: e.target.value }))} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Section</label>
                                            <input className={inputCls} placeholder="e.g. A" value={addForm.section} onChange={e => setAddForm(f => ({ ...f, section: e.target.value }))} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">GR No.</label>
                                            <input className={inputCls} placeholder="e.g. 1023" value={addForm.gr_no} onChange={e => setAddForm(f => ({ ...f, gr_no: e.target.value }))} />
                                        </div>
                                    </div>

                                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider pt-2">Parent / Guardian</p>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Parent Name</label>
                                        <input className={inputCls} placeholder="Full name" value={addForm.parent_name} onChange={e => setAddForm(f => ({ ...f, parent_name: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Parent Email <span className="text-red-500">*</span></label>
                                        <input type="email" className={inputCls} placeholder="parent@email.com" value={addForm.parent_email} onChange={e => setAddForm(f => ({ ...f, parent_email: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Parent Phone</label>
                                        <input type="tel" className={inputCls} placeholder="+91 9876543210" value={addForm.parent_phone} onChange={e => setAddForm(f => ({ ...f, parent_phone: e.target.value }))} />
                                    </div>

                                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider pt-2">Transport Assignment</p>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Route</label>
                                        <select className={inputCls} value={addForm.route_id} onChange={e => handleAddRouteChange(e.target.value)}>
                                            <option value="">No Route</option>
                                            {routes.map(r => (
                                                <option key={r.id} value={r.id}>{r.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Stop</label>
                                        <select className={`${inputCls} disabled:opacity-40`} value={addForm.stop_id} onChange={e => setAddForm(f => ({ ...f, stop_id: e.target.value }))} disabled={!addForm.route_id}>
                                            <option value="">No Stop</option>
                                            {addStops.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {addError && (
                                        <p className="text-red-600 dark:text-red-400 text-xs font-medium bg-red-50 dark:bg-red-900/30 rounded-xl px-4 py-3 border border-red-200 dark:border-red-800">{addError}</p>
                                    )}
                                </div>

                                <div className="flex gap-3 px-6 pb-6">
                                    <button
                                        onClick={() => setAddModalOpen(false)}
                                        className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-4 py-2.5 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleAddStudent}
                                        disabled={addSaving}
                                        className="flex-1 flex items-center justify-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        {addSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                        Create Student
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Edit modal */}
            {editingStudent && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
                            <h2 className="text-slate-900 dark:text-white font-bold text-base">Edit Student</h2>
                            <button
                                onClick={() => setEditingStudent(null)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Student Details</p>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Name <span className="text-red-500">*</span></label>
                                <input className={inputCls} placeholder="Full name" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Grade</label>
                                    <input className={inputCls} placeholder="e.g. 5" value={editForm.grade} onChange={e => setEditForm(f => ({ ...f, grade: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Section</label>
                                    <input className={inputCls} placeholder="e.g. A" value={editForm.section} onChange={e => setEditForm(f => ({ ...f, section: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">GR No.</label>
                                    <input className={inputCls} placeholder="e.g. 1023" value={editForm.gr_no} onChange={e => setEditForm(f => ({ ...f, gr_no: e.target.value }))} />
                                </div>
                            </div>

                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider pt-2">Parent / Guardian</p>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Parent Name</label>
                                <input className={inputCls} placeholder="Full name" value={editForm.parent_name} onChange={e => setEditForm(f => ({ ...f, parent_name: e.target.value }))} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Parent Phone</label>
                                <input type="tel" className={inputCls} placeholder="+91 9876543210" value={editForm.parent_phone} onChange={e => setEditForm(f => ({ ...f, parent_phone: e.target.value }))} />
                            </div>

                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider pt-2">Transport Assignment</p>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Route</label>
                                <select
                                    value={editForm.route_id}
                                    onChange={e => handleRouteChange(e.target.value)}
                                    className={inputCls}
                                >
                                    <option value="">No Route</option>
                                    {routes.map(r => (
                                        <option key={r.id} value={r.id}>{r.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Stop</label>
                                <select
                                    value={editForm.stop_id}
                                    onChange={e => setEditForm(f => ({ ...f, stop_id: e.target.value }))}
                                    disabled={!editForm.route_id}
                                    className={`${inputCls} disabled:opacity-40`}
                                >
                                    <option value="">No Stop</option>
                                    {stops.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            {editError && (
                                <p className="text-red-600 dark:text-red-400 text-xs font-medium bg-red-50 dark:bg-red-900/30 rounded-xl px-4 py-3 border border-red-200 dark:border-red-800">
                                    {editError}
                                </p>
                            )}
                        </div>

                        <div className="flex gap-3 px-6 pb-6">
                            <button
                                onClick={() => setEditingStudent(null)}
                                className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-4 py-2.5 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex-1 flex items-center justify-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95 disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
