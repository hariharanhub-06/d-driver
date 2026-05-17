'use client';

import { useState, useEffect } from 'react';
import { Users, Truck, Search, ToggleLeft, ToggleRight, AlertCircle } from 'lucide-react';
import api from '@/lib/api';

interface UserRecord {
    id: string;
    name: string;
    email: string;
    phone?: string;
    is_active: boolean;
    students?: { name: string }[];
}

type Tab = 'drivers' | 'parents';

export default function AdminUsersPage() {
    const [activeTab, setActiveTab] = useState<Tab>('drivers');
    const [drivers, setDrivers] = useState<UserRecord[]>([]);
    const [parents, setParents] = useState<UserRecord[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [toggling, setToggling] = useState<string | null>(null);
    const [error, setError] = useState('');

    const fetchUsers = async () => {
        setLoading(true);
        setError('');
        try {
            const [driversRes, parentsRes] = await Promise.allSettled([
                api.get('/users?role=driver'),
                api.get('/users?role=parent'),
            ]);
            if (driversRes.status === 'fulfilled') {
                setDrivers(driversRes.value.data || []);
            }
            if (parentsRes.status === 'fulfilled') {
                setParents(parentsRes.value.data || []);
            }
        } catch {
            setError('Failed to load users. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const toggleActive = async (userId: string, currentStatus: boolean, role: Tab) => {
        setToggling(userId);
        try {
            await api.patch(`/users/${userId}/active`, { is_active: !currentStatus });
            if (role === 'drivers') {
                setDrivers(prev =>
                    prev.map(u => u.id === userId ? { ...u, is_active: !currentStatus } : u)
                );
            } else {
                setParents(prev =>
                    prev.map(u => u.id === userId ? { ...u, is_active: !currentStatus } : u)
                );
            }
        } catch {
            setError('Failed to update user status.');
        } finally {
            setToggling(null);
        }
    };

    const currentList = activeTab === 'drivers' ? drivers : parents;
    const filtered = currentList.filter(u =>
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.phone?.includes(search)
    );

    return (
        <div className="space-y-6 animate-in">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Users</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Manage drivers and parents in your school
                    </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700/30 rounded-xl px-3 py-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span className="font-semibold">Only Super Admin can reset passwords.</span>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-700/30 rounded-2xl px-4 py-3 text-sm font-semibold">
                    {error}
                </div>
            )}

            {/* Tabs + Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-700 gap-4 flex-wrap">
                    {/* Tab Switcher */}
                    <div className="flex border-b border-transparent gap-1">
                        <button
                            onClick={() => setActiveTab('drivers')}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-all rounded-t-lg ${
                                activeTab === 'drivers'
                                    ? 'text-[var(--brand)] border-b-2 border-[var(--brand)]'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border-b-2 border-transparent'
                            }`}
                        >
                            <Truck className="w-3.5 h-3.5" />
                            Drivers
                            <span className="ml-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-full px-1.5 py-0.5 text-xs">
                                {drivers.length}
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab('parents')}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-all rounded-t-lg ${
                                activeTab === 'parents'
                                    ? 'text-[var(--brand)] border-b-2 border-[var(--brand)]'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border-b-2 border-transparent'
                            }`}
                        >
                            <Users className="w-3.5 h-3.5" />
                            Parents
                            <span className="ml-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-full px-1.5 py-0.5 text-xs">
                                {parents.length}
                            </span>
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by name or phone..."
                            className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 pl-9 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors w-52"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin"></div></div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">
                            <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            <p>No {activeTab} found</p>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Name</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Phone</th>
                                    {activeTab === 'parents' && (
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Students</th>
                                    )}
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((user) => (
                                    <tr key={user.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 font-semibold">
                                            {user.name}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                            {user.email}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                            {user.phone || '—'}
                                        </td>
                                        {activeTab === 'parents' && (
                                            <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                                {user.students?.map(s => s.name).join(', ') || '—'}
                                            </td>
                                        )}
                                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                                user.is_active
                                                    ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                                    : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-emerald-500' : 'bg-red-400'}`} />
                                                {user.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                            <button
                                                onClick={() => toggleActive(user.id, user.is_active, activeTab)}
                                                disabled={toggling === user.id}
                                                title={user.is_active ? 'Deactivate user' : 'Activate user'}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                                                    user.is_active
                                                        ? 'bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40'
                                                        : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
                                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                                            >
                                                {toggling === user.id ? (
                                                    <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                ) : user.is_active ? (
                                                    <ToggleRight className="w-3.5 h-3.5" />
                                                ) : (
                                                    <ToggleLeft className="w-3.5 h-3.5" />
                                                )}
                                                {user.is_active ? 'Deactivate' : 'Activate'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
