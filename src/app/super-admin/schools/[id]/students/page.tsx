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
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input
                    type="text"
                    placeholder="Search students..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full bg-[#161b22] border border-[#30363d] rounded-xl pl-10 pr-4 py-2.5 text-white text-sm font-bold outline-none placeholder:text-white/20 focus:border-blue-500 transition-all"
                />
            </div>

            {/* Table */}
            <div className="bg-[#161b22] rounded-2xl border border-[#30363d] overflow-hidden">
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-16 text-white/20 font-bold text-sm">
                            {search ? 'No students match your search.' : 'No students found.'}
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-[#30363d]">
                                    {['Student', 'Grade', 'Route', 'Stop', 'Parent', ''].map(col => (
                                        <th key={col} className="px-5 py-3.5 text-left text-[9px] font-black uppercase tracking-widest text-white/30">
                                            {col}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#30363d]">
                                {filtered.map(student => (
                                    <tr key={student.id} className="hover:bg-white/[0.02] transition-all">
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-3">
                                                {student.photo_url ? (
                                                    <img
                                                        src={student.photo_url}
                                                        alt={student.name}
                                                        className="w-8 h-8 rounded-full object-cover shrink-0 border border-white/10"
                                                    />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                                                        <UserCircle2 className="w-4 h-4 text-white/30" />
                                                    </div>
                                                )}
                                                <span className="text-white font-bold text-sm">{student.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span className="text-white/50 text-sm font-bold">{student.grade || '—'}</span>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span className="text-white/50 text-sm font-bold">{student.route_name || '—'}</span>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span className="text-white/50 text-sm font-bold">{student.stop_name || '—'}</span>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span className="text-white/50 text-sm font-bold">{student.parent_name || '—'}</span>
                                        </td>
                                        <td className="px-5 py-3.5 text-right">
                                            <button
                                                onClick={() => openEdit(student)}
                                                className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 text-[11px] font-black uppercase tracking-widest rounded-lg border border-blue-500/20 transition-all"
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-[#0d1117] border border-[#30363d] rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-5 border-b border-[#30363d]">
                            <div>
                                <h2 className="text-white font-black text-base">Edit Assignment</h2>
                                <p className="text-white/30 text-xs font-bold mt-0.5">{editingStudent.name}</p>
                            </div>
                            <button
                                onClick={() => setEditingStudent(null)}
                                className="w-8 h-8 flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest block mb-2">Route</label>
                                <select
                                    value={editForm.route_id}
                                    onChange={e => handleRouteChange(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold outline-none focus:border-blue-500 transition-all"
                                >
                                    <option value="">No Route</option>
                                    {routes.map(r => (
                                        <option key={r.id} value={r.id}>{r.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest block mb-2">Stop</label>
                                <select
                                    value={editForm.stop_id}
                                    onChange={e => setEditForm(f => ({ ...f, stop_id: e.target.value }))}
                                    disabled={!editForm.route_id}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold outline-none focus:border-blue-500 transition-all disabled:opacity-40"
                                >
                                    <option value="">No Stop</option>
                                    {stops.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            {editError && (
                                <p className="text-red-400 text-xs font-bold bg-red-500/10 rounded-lg px-4 py-3 border border-red-500/20">
                                    {editError}
                                </p>
                            )}
                        </div>

                        <div className="flex gap-3 px-6 pb-6">
                            <button
                                onClick={() => setEditingStudent(null)}
                                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white/50 rounded-xl font-black text-sm transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-sm disabled:opacity-50 transition-all"
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
