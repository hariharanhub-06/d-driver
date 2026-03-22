'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash, MapPin } from 'lucide-react';
import api from '@/lib/api';

export default function StudentsPage() {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStudents();
    }, []);

    const fetchStudents = async () => {
        try {
            const { data } = await api.get('/students');
            setStudents(data);
        } catch (_err) {
            console.error('Failed to fetch students');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Students Directory</h1>
                </div>
                <button className="btn-primary">
                    <Plus className="w-5 h-5 mr-2" />
                    Add Student
                </button>
            </div>

            <div className="card p-0 overflow-hidden">
                <div className="p-4 border-b border-[var(--border)] bg-slate-50/50 dark:bg-slate-800/50 flex flex-wrap gap-4">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by name or ID..."
                            className="pl-10 pr-4 py-2 border border-[var(--border)] rounded-lg w-full bg-[var(--background)] text-sm focus:outline-none focus:border-primary-500"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-medium border-b border-[var(--border)]">
                            <tr>
                                <th className="px-6 py-4">Student</th>
                                <th className="px-6 py-4">Grade & Section</th>
                                <th className="px-6 py-4">Pickup Stop</th>
                                <th className="px-6 py-4">Parent Info</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                            {loading ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Loading students...</td></tr>
                            ) : students.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No students found.</td></tr>
                            ) : (
                                students.map((student: { id: string, name: string, gr_no?: string, grade: string, section: string, stop?: { name: string }, parent?: { name: string } }) => (
                                    <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="px-6 py-4">
                                            <p className="font-semibold text-slate-900 dark:text-white">{student.name}</p>
                                            <p className="text-xs text-slate-500">{student.gr_no || 'No ID'}</p>
                                        </td>
                                        <td className="px-6 py-4">{student.grade} - {student.section}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center text-slate-600 dark:text-slate-300">
                                                <MapPin className="w-4 h-4 mr-1.5 text-orange-500" />
                                                {student.stop?.name || 'Unassigned'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {student.parent?.name || 'Unassigned'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="text-slate-400 hover:text-primary-600 p-1"><Edit className="w-4 h-4" /></button>
                                            <button className="text-slate-400 hover:text-red-600 p-1 ml-2"><Trash className="w-4 h-4" /></button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
