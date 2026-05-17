'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Search, Loader2, X, Save, UserCircle2 } from 'lucide-react';
import api from '@/lib/api';

interface Student {
    id: string;
    name: string;
    grade?: string;
    photo_url?: string;
    route_id?: string;
    route_name?: string;
    stop_id?: string;
    stop_name?: string;
    parent_name?: string;
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

export default function SchoolStudentsPage() {
    const { id } = useParams<{ id: string }>();

    const [students, setStudents] = useState<Student[]>([]);
    const [routes, setRoutes] = useState<Route[]>([]);
    const [stops, setStops] = useState<Stop[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [editForm, setEditForm] = useState({ route_id: '', stop_id: '' });
    const [saving, setSaving] = useState(false);
    const [editError, setEditError] = useState('');

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
        setEditForm({ route_id: student.route_id || '', stop_id: student.stop_id || '' });
        setEditError('');
        if (student.route_id) fetchStopsForRoute(student.route_id);
    };

    const handleRouteChange = (routeId: string) => {
        setEditForm(f => ({ ...f, route_id: routeId, stop_id: '' }));
        fetchStopsForRoute(routeId);
    };

    const handleSave = async () => {
        if (!editingStudent) return;
        setSaving(true);
        setEditError('');
        try {
            await api.put(`/students/${editingStudent.id}`, {
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

    const filtered = students.filter(s =>
        s.name?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-5">
            {/* Search */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                    type="text"
                    placeholder="Search students..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors"
                />
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
                                            {student.route_name || '—'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                            {student.stop_name || '—'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                            {student.parent_name || '—'}
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

            {/* Edit modal */}
            {editingStudent && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800">
                            <div>
                                <h2 className="text-slate-900 dark:text-white font-bold text-base">Edit Assignment</h2>
                                <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">{editingStudent.name}</p>
                            </div>
                            <button
                                onClick={() => setEditingStudent(null)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
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
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
