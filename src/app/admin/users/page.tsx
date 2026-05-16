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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Users</h1>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                        Manage drivers and parents in your school
                    </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 rounded-xl px-3 py-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span className="font-semibold">Only Super Admin can reset passwords.</span>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-700/30 rounded-2xl px-4 py-3 text-sm font-semibold">
                    {error}
                </div>
            )}

            {/* Tabs + Search */}
            <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 dark:border-slate-800 gap-4 flex-wrap">
                    {/* Tab Switcher */}
                    <div className="flex items-center bg-gray-100 dark:bg-slate-800 rounded-xl p-1 gap-1">
                        <button
                            onClick={() => setActiveTab('drivers')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
                                activeTab === 'drivers'
                                    ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm'
                                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-700'
                            }`}
                        >
                            <Truck className="w-3.5 h-3.5" />
                            Drivers
                            <span className="ml-1 bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 rounded-full px-1.5 py-0.5 text-[10px]">
                                {drivers.length}
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab('parents')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
                                activeTab === 'parents'
                                    ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm'
                                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-700'
                            }`}
                        >
                            <Users className="w-3.5 h-3.5" />
                            Parents
                            <span className="ml-1 bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 rounded-full px-1.5 py-0.5 text-[10px]">
                                {parents.length}
                            </span>
                        </button>
                    </div>

                    {/* Search */}
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-slate-800 rounded-xl border border-transparent focus-within:border-primary-500/30 transition-all">
                        <Search className="w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by name or phone..."
                            className="bg-transparent border-none focus:ring-0 text-sm text-gray-700 dark:text-gray-300 w-52 outline-none"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex items-center justify-center h-40">
                            <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                            <Users className="w-8 h-8 mb-2 opacity-40" />
                            <p className="text-sm font-semibold">No {activeTab} found</p>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead>
                                <tr className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest border-b border-gray-50 dark:border-slate-800">
                                    <th className="text-left px-6 py-3">Name</th>
                                    <th className="text-left px-6 py-3">Email</th>
                                    <th className="text-left px-6 py-3">Phone</th>
                                    {activeTab === 'parents' && (
                                        <th className="text-left px-6 py-3">Students</th>
                                    )}
                                    <th className="text-left px-6 py-3">Status</th>
                                    <th className="text-left px-6 py-3">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                                {filtered.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                                                {user.name}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-gray-500 dark:text-slate-400">
                                                {user.email}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-gray-500 dark:text-slate-400">
                                                {user.phone || '—'}
                                            </span>
                                        </td>
                                        {activeTab === 'parents' && (
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-gray-500 dark:text-slate-400">
                                                    {user.students?.map(s => s.name).join(', ') || '—'}
                                                </span>
                                            </td>
                                        )}
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                user.is_active
                                                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                                                    : 'bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400'
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-emerald-500' : 'bg-red-400'}`} />
                                                {user.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => toggleActive(user.id, user.is_active, activeTab)}
                                                disabled={toggling === user.id}
                                                title={user.is_active ? 'Deactivate user' : 'Activate user'}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                                    user.is_active
                                                        ? 'bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40'
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
