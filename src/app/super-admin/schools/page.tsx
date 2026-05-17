'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import {
    Building2, Search, Plus, Loader2, ShieldCheck, Edit, Trash2,
    Globe, ExternalLink, Copy, Truck, Users, GraduationCap,
    X, Link as LinkIcon, Upload, MapPin, Shield
} from 'lucide-react';

interface School {
    id: string;
    name: string;
    slug: string;
    address: string;
    logo_url?: string;
    primary_color?: string;
    status: string;
    subscription_plan: string;
    permissions?: any;
    buses?: any[];
    drivers?: any[];
    routes?: any[];
    students?: any[];
}

export default function SchoolsManagement() {
    const [schools, setSchools] = useState<School[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

    // Admin Creation State
    const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
    const [selectedSchoolForAdmin, setSelectedSchoolForAdmin] = useState<School | null>(null);
    const [adminFormData, setAdminFormData] = useState({ name: '', email: '', password: 'password123' });
    const [schoolAdmins, setSchoolAdmins] = useState<any[]>([]);
    const [loadingAdmins, setLoadingAdmins] = useState(false);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<'profile' | 'buses' | 'drivers' | 'routes' | 'permissions' | 'students'>('profile');

    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        address: '',
        subscription_plan: 'Basic',
        status: 'Active',
        primary_color: '#2dbc75',
        logo_url: '',
        permissions: { f1: true, f4: false, f5: false, f6: false, f7: false, f8: false, f9: false, f10: false } as Record<string, boolean>,
        buses: [] as any[],
        drivers: [] as any[],
        routes: [] as any[],
        students: [] as any[]
    });

    const [editingBus, setEditingBus] = useState<{ index: number | null, bus_number: string, capacity: string }>({ index: null, bus_number: '', capacity: '' });
    const [editingDriver, setEditingDriver] = useState<{ index: number | null, name: string, email: string, license: string, assigned_bus: string }>({ index: null, name: '', email: '', license: '', assigned_bus: '' });
    const [editingRoute, setEditingRoute] = useState<{ index: number | null, name: string }>({ index: null, name: '' });
    const [editingStudent, setEditingStudent] = useState<any>({ index: null, name: '', grade: '', parent_phone: '', bus_id: '' });
    const [editingRouteStops, setEditingRouteStops] = useState<{ routeIndex: number | null, stops: any[] }>({ routeIndex: null, stops: [] });
    const [newStop, setNewStop] = useState({ name: '', time: '', lat: '', lng: '' });
    const [logoFile, setLogoFile] = useState<File | null>(null);

    useEffect(() => {
        fetchSchools();
    }, []);

    const fetchSchools = async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/schools');
            setSchools(response.data);
        } catch (error) {
            console.error('Failed to fetch real schools:', error);
            setSchools([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleNameChange = (name: string) => {
        const slug = name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
        setFormData({ ...formData, name, slug });
    };

    const handleCreateSchool = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            let finalLogoUrl = formData.logo_url || '';

            if (logoFile) {
                try {
                    const { data } = await api.get(`/upload/presigned-url?fileName=${logoFile.name}&fileType=${logoFile.type}`);
                    await fetch(data.uploadUrl, {
                        method: 'PUT',
                        headers: { 'Content-Type': logoFile.type },
                        body: logoFile
                    });
                    finalLogoUrl = data.finalUrl;
                } catch (err) {
                    console.error('Logo upload failed:', err);
                }
            }

            const payload = {
                ...formData,
                logo_url: finalLogoUrl,
                status: 'Active'
            };

            if (editingId) {
                await api.put(`/schools/${editingId}`, payload);
            } else {
                await api.post('/schools', payload);
            }

            setIsModalOpen(false);
            setEditingId(null);
            resetFormData();
            fetchSchools();
            alert(editingId ? 'Network Updated!' : 'Network Registered!');
        } catch (error: any) {
            const msg = error.response?.data?.message || error.message;
            alert(`Error: ${msg}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetFormData = () => {
        setFormData({
            name: '', slug: '', address: '', subscription_plan: 'Basic', status: 'Active', primary_color: '#2dbc75', logo_url: '',
            permissions: { f1: true, f4: false, f5: false, f6: false, f7: false, f8: false, f9: false, f10: false } as Record<string, boolean>,
            buses: [] as any[], drivers: [] as any[], routes: [] as any[], students: [] as any[]
        });
        setLogoFile(null);
    };

    const handleOpenAdminModal = async (school: School) => {
        setSelectedSchoolForAdmin(school);
        setIsAdminModalOpen(true);
        setLoadingAdmins(true);
        try {
            const res = await api.get('/users?role=admin');
            const filtered = res.data.filter((u: any) => u.school_id === school.id);
            setSchoolAdmins(filtered);
        } catch {
            setSchoolAdmins([]);
        } finally {
            setLoadingAdmins(false);
        }
    };

    const handleCreateAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSchoolForAdmin) return;
        setIsSubmitting(true);
        try {
            const res = await api.post('/users', {
                ...adminFormData,
                role: 'admin',
                school_id: selectedSchoolForAdmin.id
            });
            setSchoolAdmins(prev => [...prev, res.data]);
            setAdminFormData({ name: '', email: '', password: 'password123' });
            alert(`Admin Created for ${selectedSchoolForAdmin.name}!`);
        } catch (error: any) {
            alert(`Failed: ${error.response?.data?.message || error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteAdmin = async (userId: string) => {
        if (!confirm('Remove this admin?')) return;
        try {
            await api.delete(`/users/${userId}`);
            setSchoolAdmins(prev => prev.filter(u => u.id !== userId));
        } catch (e: any) {
            alert('Failed to remove admin');
        }
    };

    const handleToggleAdminStatus = async (admin: any) => {
        const newStatus = admin.status === 'Inactive' ? 'Active' : 'Inactive';
        try {
            await api.put(`/users/${admin.id}`, { ...admin, status: newStatus });
            setSchoolAdmins(prev => prev.map(u => u.id === admin.id ? { ...u, status: newStatus } : u));
        } catch {
            alert('Failed to update status');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Permanently delete this school network?')) return;
        try {
            await api.delete(`/schools/${id}`);
            fetchSchools();
        } catch (error) {
            console.error('Failed to delete:', error);
        }
    };

    const handleToggleStatus = async (school: School) => {
        const newStatus = school.status === 'Active' ? 'Inactive' : 'Active';
        try {
            await api.put(`/schools/${school.id}`, { ...school, status: newStatus });
            fetchSchools();
        } catch (error: any) {
            alert(`Failed: ${error.message}`);
        }
    };

    const inputCls = "w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors";

    return (
        <div className="space-y-6 animate-in">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <Building2 className="w-7 h-7 text-[var(--brand)]" />
                        School Network
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Administrative control for all school networks</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-xl">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={cn(
                                "px-3 py-1.5 rounded-lg transition-all text-xs font-semibold flex items-center gap-1.5",
                                viewMode === 'grid'
                                    ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm"
                                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                            )}
                        >
                            <Building2 className="w-3.5 h-3.5" /> Grid
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={cn(
                                "px-3 py-1.5 rounded-lg transition-all text-xs font-semibold flex items-center gap-1.5",
                                viewMode === 'table'
                                    ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm"
                                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                            )}
                        >
                            <Search className="w-3.5 h-3.5" /> Table
                        </button>
                    </div>
                    <button
                        onClick={() => {
                            setEditingId(null);
                            resetFormData();
                            setActiveTab('profile');
                            setIsModalOpen(true);
                        }}
                        className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95"
                    >
                        <Plus className="w-4 h-4" /> Register School
                    </button>
                </div>
            </div>

            {/* Search + stats */}
            <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search networks..."
                        className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 px-6 py-4 shrink-0">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Networks</p>
                    <p className="text-2xl font-bold text-[var(--brand)]">{schools.filter(s => s.status === 'Active').length}</p>
                </div>
            </div>

            {/* Schools Grid/Table */}
            {isLoading ? (
                <div className="flex justify-center py-16">
                    <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
                </div>
            ) : schools.length === 0 ? (
                <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                    <Building2 className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                    <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">No Networks Found</h3>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Deploy your first school network to get started.</p>
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {schools.filter(s => s.name?.toLowerCase().includes(searchTerm.toLowerCase()) || s.slug?.includes(searchTerm.toLowerCase())).map((school) => (
                        <div key={school.id} className={cn(
                            "bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden group hover:border-[var(--brand)]/30 transition-all flex flex-col",
                            school.status !== 'Active' && "opacity-60"
                        )}>
                            <div className="h-2 w-full" style={{ backgroundColor: school.primary_color || '#2dbc75' }}></div>
                            <div className="p-5 flex flex-col flex-1">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-12 h-12 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-100 dark:border-slate-600 flex items-center justify-center p-2">
                                        {school.logo_url ? (
                                            <img src={school.logo_url} alt={school.name} className="w-full h-full object-contain" />
                                        ) : (
                                            <Building2 className="w-6 h-6 text-slate-300 dark:text-slate-500" />
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-1 text-right">
                                        <div className="flex gap-1 justify-end">
                                            <button onClick={() => handleOpenAdminModal(school)} className="p-1.5 bg-slate-50 dark:bg-slate-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-all text-slate-400" title="Manage Admins"><ShieldCheck className="w-3.5 h-3.5" /></button>
                                            <a href={`/super-admin/schools/${school.id}`} className="p-1.5 bg-slate-50 dark:bg-slate-700 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:text-purple-600 dark:hover:text-purple-400 transition-all text-slate-400" title="View Details"><ExternalLink className="w-3.5 h-3.5" /></a>
                                            <button onClick={() => { setEditingId(school.id); setFormData({ ...school } as any); setActiveTab('profile'); setIsModalOpen(true); }} className="p-1.5 bg-slate-50 dark:bg-slate-700 rounded-lg hover:bg-[var(--brand)]/10 hover:text-[var(--brand)] transition-all text-slate-400" title="Edit"><Edit className="w-3.5 h-3.5" /></button>
                                            <button onClick={() => handleDelete(school.id)} className="p-1.5 bg-slate-50 dark:bg-slate-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-all text-slate-400"><Trash2 className="w-3.5 h-3.5" /></button>
                                        </div>
                                        <button onClick={() => handleToggleStatus(school)} className={cn("py-0.5 px-2 rounded-lg text-xs font-semibold transition-all border self-end", school.status === 'Active' ? "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50" : "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50")}>
                                            {school.status === 'Active' ? 'Deactivate' : 'Activate'}
                                        </button>
                                    </div>
                                </div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">{school.name}</h3>
                                <div className="space-y-2 mb-4">
                                    <a href={`/school/${school.slug}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-slate-700 dark:text-slate-300 bg-[var(--brand)]/5 px-3 py-2 rounded-xl border border-[var(--brand)]/20 hover:bg-[var(--brand)]/10 transition-all w-full">
                                        <Globe className="w-3.5 h-3.5 text-[var(--brand)] shrink-0" />
                                        <span className="text-xs font-medium truncate flex-1">localhost/school/{school.slug}</span>
                                        <ExternalLink className="w-3 h-3 text-[var(--brand)] shrink-0" />
                                    </a>
                                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-xl border border-amber-100 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-all w-full cursor-pointer" onClick={() => { navigator.clipboard.writeText(`${school.slug}.ddriver365.com`); alert('Prod URL copied!'); }}>
                                        <span className="text-xs font-bold uppercase text-amber-600 dark:text-amber-400">Prod</span>
                                        <span className="text-xs font-medium truncate flex-1">{school.slug}.ddriver365.com</span>
                                        <Copy className="w-3 h-3 shrink-0" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 gap-1.5">
                                    {[
                                        { label: 'Buses', count: school.buses?.length || 0, icon: Truck, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                                        { label: 'Drivers', count: school.drivers?.length || 0, icon: Users, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                                        { label: 'Routes', count: school.routes?.length || 0, icon: Globe, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                                        { label: 'Students', count: school.students?.length || 0, icon: GraduationCap, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20' },
                                    ].map((stat) => (
                                        <div key={stat.label} className={cn("p-1.5 rounded-xl border border-slate-100 dark:border-slate-700 flex flex-col items-center", stat.bg)}>
                                            <stat.icon className={cn("w-3 h-3 mb-0.5", stat.color)} />
                                            <p className="text-xs font-bold text-slate-900 dark:text-white leading-none">{stat.count}</p>
                                            <p className="text-[9px] font-medium text-slate-500 dark:text-slate-400 uppercase mt-0.5">{stat.label}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                                    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", school.subscription_plan === 'Enterprise' ? "bg-[var(--brand)]/10 text-[var(--brand)]" : "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400")}>
                                        {school.subscription_plan}
                                    </span>
                                    <span className="text-xs font-medium flex items-center gap-1">
                                        <div className={cn("w-1.5 h-1.5 rounded-full", school.status === 'Active' ? 'bg-emerald-500' : 'bg-red-500')}></div>
                                        <span className={school.status === 'Active' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>{school.status}</span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-700">
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-700/50">Institution</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-700/50">Portal / URL</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-700/50">Fleet</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-700/50">Subscription</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-700/50">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {schools.filter(s => s.name?.toLowerCase().includes(searchTerm.toLowerCase()) || s.slug?.includes(searchTerm.toLowerCase())).map((school) => (
                                    <tr key={school.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-100 dark:border-slate-600 flex items-center justify-center p-2 shrink-0">
                                                    {school.logo_url ? (
                                                        <img src={school.logo_url} alt={school.name} className="w-full h-full object-contain" />
                                                    ) : (
                                                        <Building2 className="w-5 h-5 text-slate-300 dark:text-slate-500" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{school.name}</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[180px]">{school.address || 'Standard Access'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                            <div className="flex flex-col gap-1">
                                                <a href={`/school/${school.slug}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-medium text-[var(--brand)] hover:opacity-80">
                                                    <Globe className="w-3 h-3" /> {school.slug}.localhost
                                                </a>
                                                <div className="text-xs font-medium text-amber-600 dark:text-amber-400">{school.slug}.ddriver365.com</div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                            <div className="flex items-center gap-4">
                                                <div className="text-center">
                                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{school.buses?.length || 0}</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">Buses</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{school.students?.length || 0}</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">Students</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                            <div className="flex flex-col gap-1">
                                                <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium w-fit", school.subscription_plan === 'Enterprise' ? "bg-[var(--brand)]/10 text-[var(--brand)]" : "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400")}>
                                                    {school.subscription_plan}
                                                </span>
                                                <span className={cn("text-xs font-medium", school.status === 'Active' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>{school.status}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => handleOpenAdminModal(school)} className="p-1.5 bg-slate-50 dark:bg-slate-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 text-slate-400 transition-colors"><ShieldCheck className="w-4 h-4" /></button>
                                                <button onClick={() => { setEditingId(school.id); setFormData({ ...school } as any); setActiveTab('profile'); setIsModalOpen(true); }} className="p-1.5 bg-slate-50 dark:bg-slate-700 rounded-lg hover:bg-[var(--brand)]/10 hover:text-[var(--brand)] text-slate-400 transition-colors"><Edit className="w-4 h-4" /></button>
                                                <button onClick={() => handleToggleStatus(school)} className={cn("p-1.5 rounded-lg transition-colors", school.status === 'Active' ? "bg-red-50 dark:bg-red-900/30 text-red-500" : "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500")}><X className="w-4 h-4" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Registration Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{editingId ? 'Edit Institution' : 'Deploy Network'}</h2>
                                <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Configuration Protocol</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 transition-colors"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="flex border-b border-slate-100 dark:border-slate-700 overflow-x-auto px-4">
                            {['profile', 'buses', 'drivers', 'routes', 'students', 'permissions'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab as any)}
                                    className={cn(
                                        "px-4 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap",
                                        activeTab === tab ? "border-[var(--brand)] text-[var(--brand)]" : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                    )}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        <div className="p-6 space-y-5">
                            {activeTab === 'profile' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Name</label>
                                            <input type="text" value={formData.name} onChange={e => handleNameChange(e.target.value)} className={inputCls} placeholder="School Name" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Portal URL</label>
                                            <input type="text" value={formData.slug} onChange={e => setFormData({ ...formData, slug: e.target.value })} className={inputCls} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Address</label>
                                        <input type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className={inputCls} placeholder="Branch Address" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Logo</label>
                                            <label className="flex items-center justify-center w-full h-11 bg-slate-50 dark:bg-slate-700/50 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl cursor-pointer hover:border-[var(--brand)] transition-all">
                                                <span className="text-xs font-medium text-slate-400 truncate px-4">{logoFile?.name || 'Upload Logo'}</span>
                                                <input type="file" accept="image/*" className="hidden" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
                                            </label>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Theme Color</label>
                                            <div className="flex items-center h-11 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 px-4 rounded-xl gap-3">
                                                <input type="color" value={formData.primary_color} onChange={e => setFormData({ ...formData, primary_color: e.target.value })} className="h-7 w-7 cursor-pointer rounded-lg bg-transparent" />
                                                <span className="text-xs font-mono text-slate-700 dark:text-slate-300">{formData.primary_color}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'buses' && (
                                <div className="space-y-4">
                                    <div className="flex gap-3">
                                        <input type="text" placeholder="Bus Number" value={editingBus.bus_number} onChange={e => setEditingBus({ ...editingBus, bus_number: e.target.value })} className={cn(inputCls, 'flex-1')} />
                                        <input type="number" placeholder="Seats" value={editingBus.capacity} onChange={e => setEditingBus({ ...editingBus, capacity: e.target.value })} className={cn(inputCls, 'w-24')} />
                                        <button type="button" onClick={() => { if (!editingBus.bus_number) return; const newBuses = [...formData.buses]; editingBus.index !== null ? newBuses[editingBus.index] = { bus_number: editingBus.bus_number, capacity: parseInt(editingBus.capacity) || 0 } : newBuses.push({ bus_number: editingBus.bus_number, capacity: parseInt(editingBus.capacity) || 0 }); setFormData({ ...formData, buses: newBuses }); setEditingBus({ index: null, bus_number: '', capacity: '' }); }} className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95">Add</button>
                                    </div>
                                    <div className="space-y-2">
                                        {formData.buses.map((bus, i) => (
                                            <div key={i} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-600">
                                                <span className="text-sm font-medium text-slate-900 dark:text-white">{bus.bus_number} ({bus.capacity} seats)</span>
                                                <button type="button" onClick={() => setFormData({ ...formData, buses: formData.buses.filter((_, idx) => idx !== i) })} className="text-red-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'drivers' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <input type="text" placeholder="Driver Name" value={editingDriver.name} onChange={e => setEditingDriver({ ...editingDriver, name: e.target.value })} className={inputCls} />
                                        <input type="email" placeholder="Email" value={editingDriver.email} onChange={e => setEditingDriver({ ...editingDriver, email: e.target.value })} className={inputCls} />
                                    </div>
                                    <button type="button" onClick={() => { if (!editingDriver.name) return; const newDrivers = [...formData.drivers]; newDrivers.push({ ...editingDriver }); setFormData({ ...formData, drivers: newDrivers }); setEditingDriver({ index: null, name: '', email: '', license: '', assigned_bus: '' }); }} className="w-full flex items-center justify-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95">Register Driver</button>
                                    <div className="space-y-2">
                                        {formData.drivers.map((driver, i) => (
                                            <div key={i} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-600">
                                                <span className="text-sm font-medium text-slate-900 dark:text-white">{driver.name} ({driver.email})</span>
                                                <button type="button" onClick={() => setFormData({ ...formData, drivers: formData.drivers.filter((_, idx) => idx !== i) })} className="text-red-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'routes' && (
                                <div className="space-y-4">
                                    <div className="flex gap-3">
                                        <input type="text" placeholder="Route Name" value={editingRoute.name} onChange={e => setEditingRoute({ ...editingRoute, name: e.target.value })} className={cn(inputCls, 'flex-1')} />
                                        <button type="button" onClick={() => { if (!editingRoute.name) return; const newRoutes = [...formData.routes]; newRoutes.push({ name: editingRoute.name }); setFormData({ ...formData, routes: newRoutes }); setEditingRoute({ index: null, name: '' }); }} className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95">Add Route</button>
                                    </div>
                                    <div className="space-y-2">
                                        {formData.routes.map((route, i) => (
                                            <div key={i} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-600">
                                                <span className="text-sm font-medium text-slate-900 dark:text-white">{route.name}</span>
                                                <button type="button" onClick={() => setFormData({ ...formData, routes: formData.routes.filter((_, idx) => idx !== i) })} className="text-red-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'students' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <input type="text" placeholder="Student Name" value={editingStudent.name} onChange={e => setEditingStudent({ ...editingStudent, name: e.target.value })} className={inputCls} />
                                        <input type="text" placeholder="Grade" value={editingStudent.grade} onChange={e => setEditingStudent({ ...editingStudent, grade: e.target.value })} className={inputCls} />
                                    </div>
                                    <button type="button" onClick={() => { if (!editingStudent.name) return; const newStudents = [...formData.students]; newStudents.push({ ...editingStudent }); setFormData({ ...formData, students: newStudents }); setEditingStudent({ index: null, name: '', grade: '', parent_phone: '', bus_id: '' }); }} className="w-full flex items-center justify-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95">Enroll Student</button>
                                    <div className="space-y-2">
                                        {formData.students.map((student, i) => (
                                            <div key={i} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-600">
                                                <span className="text-sm font-medium text-slate-900 dark:text-white">{student.name} - {student.grade}</span>
                                                <button type="button" onClick={() => setFormData({ ...formData, students: formData.students.filter((_, idx) => idx !== i) })} className="text-red-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'permissions' && (
                                <div className="grid grid-cols-2 gap-4">
                                    {Object.entries(formData.permissions).map(([key, val]) => (
                                        <label key={key} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-600 cursor-pointer">
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{key} Feature</span>
                                            <input type="checkbox" checked={val} onChange={e => setFormData({ ...formData, permissions: { ...formData.permissions, [key]: e.target.checked } })} className="w-4 h-4 accent-[var(--brand)]" />
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-slate-100 dark:border-slate-700">
                            <button onClick={handleCreateSchool} disabled={isSubmitting} className="w-full flex items-center justify-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95 disabled:opacity-50">
                                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : editingId ? 'Update Network' : 'Deploy School Network'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Admin Management Modal */}
            {isAdminModalOpen && selectedSchoolForAdmin && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Manage Admins</h2>
                                <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">{selectedSchoolForAdmin.name}</p>
                            </div>
                            <button onClick={() => setIsAdminModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 transition-colors"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div className="space-y-3">
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Current Assignments</p>
                                {loadingAdmins ? (
                                    <div className="flex justify-center py-4">
                                        <div className="w-5 h-5 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
                                    </div>
                                ) : schoolAdmins.length === 0 ? (
                                    <p className="text-sm text-slate-500 dark:text-slate-400 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl text-center">No admins assigned</p>
                                ) : (
                                    schoolAdmins.map((admin) => (
                                        <div key={admin.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-600">
                                            <div>
                                                <p className="text-sm font-semibold text-slate-900 dark:text-white">{admin.name}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">{admin.email}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleToggleAdminStatus(admin)} className={cn("px-2 py-1 rounded-lg text-xs font-semibold", admin.status === 'Active' ? "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" : "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400")}>
                                                    {admin.status === 'Active' ? 'Stop' : 'Start'}
                                                </button>
                                                <button onClick={() => handleDeleteAdmin(admin.id)} className="p-1.5 text-red-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <hr className="border-slate-100 dark:border-slate-700" />

                            <form onSubmit={handleCreateAdmin} className="space-y-3">
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Authorize New Admin</p>
                                <input required type="text" placeholder="Admin Name" value={adminFormData.name} onChange={e => setAdminFormData({ ...adminFormData, name: e.target.value })} className={inputCls} />
                                <input required type="email" placeholder="Email Address" value={adminFormData.email} onChange={e => setAdminFormData({ ...adminFormData, email: e.target.value })} className={inputCls} />
                                <button type="submit" disabled={isSubmitting} className="w-full flex items-center justify-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95 disabled:opacity-50">
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Grant Administrative Rights'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
