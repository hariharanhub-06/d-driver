'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import {
    Building2, Search, Plus, Loader2, ShieldCheck, Edit, Trash2,
    Globe, ExternalLink, Copy, Truck, Users, GraduationCap,
    Palette, X, Link as LinkIcon, Upload, MapPin, Shield
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

    return (
        <div className="space-y-10 animate-in relative p-4 max-w-7xl mx-auto">
            {/* Stats Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-1 bg-white p-2 rounded-xl border border-gray-100 shadow-sm">
                <div>
                    <h1 className="text-sm font-black text-slate-900 tracking-tight">SCHOOL NETWORK</h1>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[7px] flex items-center">
                        <Building2 className="w-2 h-2 mr-1 text-primary-500" /> Administrative Control
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="flex bg-gray-100 p-1.5 rounded-2xl border border-gray-200 shadow-inner">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={cn(
                            "p-2.5 rounded-xl transition-all flex items-center gap-2 font-bold text-[10px] uppercase tracking-wider",
                            viewMode === 'grid' ? "bg-white text-primary-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
                        )}
                    >
                        <Building2 className="w-3.5 h-3.5" /> Grid
                    </button>
                    <button
                        onClick={() => setViewMode('table')}
                        className={cn(
                            "p-2.5 rounded-xl transition-all flex items-center gap-2 font-bold text-[10px] uppercase tracking-wider",
                            viewMode === 'table' ? "bg-white text-primary-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
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
                    className="bg-primary-500 text-white hover:bg-primary-600 font-bold py-1 px-4 rounded-lg transition-all flex items-center transform active:scale-95 shadow-sm text-[8px] uppercase tracking-wider"
                >
                    <Plus className="w-2.5 h-2.5 mr-1.5" strokeWidth={3} /> Register
                </button>
            </div>

            {/* Filter & Stats */}
            <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search networks..."
                        className="w-full bg-white border border-gray-100 rounded-xl py-2 pl-9 pr-4 text-slate-900 placeholder:text-slate-400 focus:ring-1 focus:ring-primary-500 outline-none transition-all shadow-sm text-[10px]"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-4">
                    <div className="bg-white px-6 py-4 rounded-3xl border border-gray-100 shadow-sm">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Networks</p>
                        <p className="text-2xl font-black text-primary-500">{schools.filter(s => s.status === 'Active').length}</p>
                    </div>
                </div>
            </div>

            {/* Schools Grid/Table */}
            {isLoading ? (
                <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin text-primary-500" /></div>
            ) : schools.length === 0 ? (
                <div className="text-center p-20 bg-white border border-dashed border-gray-200 rounded-[3rem]">
                    <Building2 className="w-16 h-16 mx-auto text-slate-200 mb-4" />
                    <h3 className="text-xl font-bold text-slate-900">No Networks Found</h3>
                    <p className="text-slate-500 mt-2">Deploy your first school network to get started.</p>
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {schools.filter(s => s.name?.toLowerCase().includes(searchTerm.toLowerCase()) || s.slug?.includes(searchTerm.toLowerCase())).map((school) => (
                        <div key={school.id} className={cn(
                            "bg-white rounded-[1.5rem] border border-gray-100 overflow-hidden group hover:border-primary-200 transition-all shadow-md hover:shadow-lg flex flex-col h-full relative",
                            school.status !== 'Active' && "opacity-60 grayscale-[0.5]"
                        )}>
                            <div className="h-2 w-full" style={{ backgroundColor: school.primary_color || '#2dbc75' }}></div>
                            <div className="p-4 flex flex-col flex-1">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-12 h-12 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center p-2 shadow-inner group-hover:bg-primary-50 transition-colors">
                                        {school.logo_url ? (
                                            <img src={school.logo_url} alt={school.name} className="w-full h-full object-contain" />
                                        ) : (
                                            <Building2 className="w-6 h-6 text-slate-200 group-hover:text-primary-200 transition-colors" />
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-1 text-right">
                                        <div className="flex gap-1 justify-end">
                                            <button onClick={() => handleOpenAdminModal(school)} className="p-1.5 bg-gray-50 rounded-lg hover:bg-blue-50 hover:text-blue-500 transition-all text-gray-400" title="Manage Admins"><ShieldCheck className="w-3 h-3" /></button>
                                            <a href={`/super-admin/schools/${school.id}`} className="p-1.5 bg-gray-50 rounded-lg hover:bg-purple-50 hover:text-purple-500 transition-all text-gray-400" title="View Details"><ExternalLink className="w-3 h-3" /></a>
                                            <button onClick={() => { setEditingId(school.id); setFormData({ ...school } as any); setActiveTab('profile'); setIsModalOpen(true); }} className="p-1.5 bg-gray-50 rounded-lg hover:bg-primary-50 hover:text-primary-500 transition-all text-gray-400" title="Edit"><Edit className="w-3 h-3" /></button>
                                            <button onClick={() => handleDelete(school.id)} className="p-1.5 bg-gray-50 rounded-lg hover:bg-red-50 hover:text-red-500 transition-all text-gray-400"><Trash2 className="w-3 h-3" /></button>
                                        </div>
                                        <button onClick={() => handleToggleStatus(school)} className={cn("py-1 px-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all border self-end", school.status === 'Active' ? "bg-red-50 border-red-100 text-red-500 hover:bg-red-100" : "bg-green-50 border-green-100 text-green-500 hover:bg-green-100")}>
                                            {school.status === 'Active' ? 'Off' : 'On'}
                                        </button>
                                    </div>
                                </div>
                                <h3 className="text-sm font-black text-slate-900 tracking-tight mb-1">{school.name}</h3>
                                <div className="space-y-2 mb-6">
                                    <a href={`/school/${school.slug}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-slate-700 bg-primary-50 px-3 py-2 rounded-xl border border-primary-100 hover:bg-primary-100 transition-all w-full">
                                        <Globe className="w-3.5 h-3.5 text-primary-500 shrink-0" />
                                        <span className="text-[10px] font-bold tracking-tight uppercase truncate flex-1">localhost/school/{school.slug}</span>
                                        <ExternalLink className="w-3 h-3 text-primary-400 shrink-0" />
                                    </a>
                                    <div className="flex items-center gap-2 text-slate-500 bg-amber-50/60 px-3 py-1.5 rounded-xl border border-amber-100 hover:bg-amber-50 transition-all w-full cursor-pointer" onClick={() => { navigator.clipboard.writeText(`${school.slug}.ddriver365.com`); alert('Prod URL copied!'); }}>
                                        <span className="text-[9px] font-black uppercase text-amber-600">Prod</span>
                                        <span className="text-[10px] font-bold text-amber-700 uppercase truncate flex-1">{school.slug}.ddriver365.com</span>
                                        <Copy className="w-3 h-3 text-amber-400" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 gap-1.5">
                                    {[
                                        { id: 'buses', label: 'Buses', count: school.buses?.length || 0, icon: Truck, color: 'text-amber-500', bg: 'bg-amber-50/50' },
                                        { id: 'drivers', label: 'Drivers', count: school.drivers?.length || 0, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50/50' },
                                        { id: 'routes', label: 'Routes', count: school.routes?.length || 0, icon: Globe, color: 'text-emerald-500', bg: 'bg-emerald-50/50' },
                                        { id: 'students', label: 'Students', count: school.students?.length || 0, icon: GraduationCap, color: 'text-purple-500', bg: 'bg-purple-50/50' },
                                    ].map((stat) => (
                                        <div key={stat.id} className={cn("p-1.5 rounded-xl border border-slate-100 flex flex-col items-center", stat.bg)}>
                                            <stat.icon className={cn("w-3 h-3 mb-0.5", stat.color)} />
                                            <p className="text-xs font-black text-slate-900 leading-none">{stat.count}</p>
                                            <p className="text-[7px] font-bold text-slate-400 uppercase mt-0.5 tracking-tighter">{stat.label}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="pt-3 border-t border-gray-50 flex items-center justify-between">
                                    <span className={cn("px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest", school.subscription_plan === 'Enterprise' ? "bg-primary-50 text-primary-600" : "bg-blue-50 text-blue-600")}>
                                        {school.subscription_plan}
                                    </span>
                                    <span className="text-[8px] font-black text-green-500 uppercase flex items-center gap-1">
                                        <div className={cn("w-1 h-1 rounded-full animate-pulse", school.status === 'Active' ? 'bg-green-500' : 'bg-red-500')}></div>
                                        {school.status}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-premium overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-gray-100">Institution</th>
                                    <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-gray-100">Portal / URL</th>
                                    <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-gray-100 text-center">Fleet</th>
                                    <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-gray-100">Subscription</th>
                                    <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-gray-100">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {schools.filter(s => s.name?.toLowerCase().includes(searchTerm.toLowerCase()) || s.slug?.includes(searchTerm.toLowerCase())).map((school) => (
                                    <tr key={school.id} className="group hover:bg-primary-50/30 transition-colors">
                                        <td className="p-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-white rounded-2xl border border-gray-100 flex items-center justify-center p-2 shadow-sm shrink-0">
                                                    {school.logo_url ? (
                                                        <img src={school.logo_url} alt={school.name} className="w-full h-full object-contain" />
                                                    ) : (
                                                        <Building2 className="w-6 h-6 text-slate-200" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-900">{school.name}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[200px]">{school.address || 'Standard Access'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex flex-col gap-1.5">
                                                <a href={`/school/${school.slug}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[10px] font-bold text-primary-600 uppercase">
                                                    <Globe className="w-3 h-3" /> {school.slug}.localhost
                                                </a>
                                                <div className="text-[10px] font-bold text-amber-600/70 uppercase">{school.slug}.ddriver365.com</div>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex items-center justify-center gap-4 text-center">
                                                <div>
                                                    <p className="text-xs font-black">{school.buses?.length || 0}</p>
                                                    <p className="text-[8px] text-slate-400 font-bold uppercase">Buses</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black">{school.students?.length || 0}</p>
                                                    <p className="text-[8px] text-slate-400 font-bold uppercase">Students</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex flex-col items-start gap-1">
                                                <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest", school.subscription_plan === 'Enterprise' ? "bg-primary-50 text-primary-600" : "bg-blue-50 text-blue-600")}>
                                                    {school.subscription_plan}
                                                </span>
                                                <span className={cn("text-[9px] font-black uppercase", school.status === 'Active' ? 'text-green-500' : 'text-red-500')}>{school.status}</span>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => handleOpenAdminModal(school)} className="p-2 bg-gray-50 rounded-xl hover:bg-blue-50 hover:text-blue-500 text-gray-400"><ShieldCheck className="w-4 h-4" /></button>
                                                <button onClick={() => { setEditingId(school.id); setFormData({ ...school } as any); setActiveTab('profile'); setIsModalOpen(true); }} className="p-2 bg-gray-50 rounded-xl hover:bg-primary-50 hover:text-primary-500 text-gray-400"><Edit className="w-4 h-4" /></button>
                                                <button onClick={() => handleToggleStatus(school)} className={cn("p-2 rounded-xl transition-all", school.status === 'Active' ? "bg-red-50 text-red-500" : "bg-green-50 text-green-500")}><X className="w-4 h-4" /></button>
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
                    <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900">{editingId ? 'Edit Institution' : 'Deploy Network'}</h2>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Configuration Protocol</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 bg-white rounded-full hover:bg-gray-100 text-gray-400 shadow-sm"><X className="w-6 h-6" /></button>
                        </div>

                        <div className="flex border-b border-gray-100 overflow-x-auto bg-white px-4">
                            {['profile', 'buses', 'drivers', 'routes', 'students', 'permissions'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab as any)}
                                    className={cn(
                                        "px-6 py-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap",
                                        activeTab === tab ? "border-primary-500 text-primary-500 bg-primary-50/50" : "border-transparent text-slate-400 hover:text-slate-600"
                                    )}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-8">
                            {activeTab === 'profile' && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Name</label>
                                            <input type="text" value={formData.name} onChange={e => handleNameChange(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-primary-500" placeholder="School Name" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Portal URL</label>
                                            <input type="text" value={formData.slug} onChange={e => setFormData({ ...formData, slug: e.target.value })} className="w-full bg-slate-100 border border-slate-200 rounded-2xl p-4 text-sm font-mono font-bold text-primary-600" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Address</label>
                                        <input type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold" placeholder="Branch Address" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Branding</label>
                                            <label className="flex items-center justify-center w-full h-14 bg-white border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer hover:border-primary-500 transition-all">
                                                <span className="text-xs font-bold text-slate-400 truncate px-4">{logoFile?.name || 'Upload Logo'}</span>
                                                <input type="file" accept="image/*" className="hidden" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
                                            </label>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Theme</label>
                                            <div className="flex items-center h-14 bg-slate-50 border border-slate-200 px-4 rounded-2xl gap-3">
                                                <input type="color" value={formData.primary_color} onChange={e => setFormData({ ...formData, primary_color: e.target.value })} className="h-8 w-8 cursor-pointer rounded-lg bg-transparent" />
                                                <span className="text-xs font-mono font-bold uppercase">{formData.primary_color}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'buses' && (
                                <div className="space-y-4">
                                    <div className="flex gap-4">
                                        <input type="text" placeholder="Bus Number" value={editingBus.bus_number} onChange={e => setEditingBus({ ...editingBus, bus_number: e.target.value })} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2" />
                                        <input type="number" placeholder="Seats" value={editingBus.capacity} onChange={e => setEditingBus({ ...editingBus, capacity: e.target.value })} className="w-24 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2" />
                                        <button type="button" onClick={() => { if (!editingBus.bus_number) return; const newBuses = [...formData.buses]; editingBus.index !== null ? newBuses[editingBus.index] = { bus_number: editingBus.bus_number, capacity: parseInt(editingBus.capacity) || 0 } : newBuses.push({ bus_number: editingBus.bus_number, capacity: parseInt(editingBus.capacity) || 0 }); setFormData({ ...formData, buses: newBuses }); setEditingBus({ index: null, bus_number: '', capacity: '' }); }} className="bg-primary-500 text-white px-4 py-2 rounded-xl font-bold uppercase text-[10px]">Add</button>
                                    </div>
                                    <div className="space-y-2">
                                        {formData.buses.map((bus, i) => (
                                            <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                <span className="font-bold">{bus.bus_number} ({bus.capacity} seats)</span>
                                                <button type="button" onClick={() => setFormData({ ...formData, buses: formData.buses.filter((_, idx) => idx !== i) })} className="text-red-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'drivers' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <input type="text" placeholder="Driver Name" value={editingDriver.name} onChange={e => setEditingDriver({ ...editingDriver, name: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2" />
                                        <input type="email" placeholder="Email" value={editingDriver.email} onChange={e => setEditingDriver({ ...editingDriver, email: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2" />
                                    </div>
                                    <button type="button" onClick={() => { if (!editingDriver.name) return; const newDrivers = [...formData.drivers]; newDrivers.push({ ...editingDriver }); setFormData({ ...formData, drivers: newDrivers }); setEditingDriver({ index: null, name: '', email: '', license: '', assigned_bus: '' }); }} className="w-full bg-primary-500 text-white py-2 rounded-xl font-bold uppercase text-[10px]">Register Driver</button>
                                    <div className="space-y-2">
                                        {formData.drivers.map((driver, i) => (
                                            <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                <span className="font-bold">{driver.name} ({driver.email})</span>
                                                <button type="button" onClick={() => setFormData({ ...formData, drivers: formData.drivers.filter((_, idx) => idx !== i) })} className="text-red-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'routes' && (
                                <div className="space-y-4">
                                    <div className="flex gap-4">
                                        <input type="text" placeholder="Route Name" value={editingRoute.name} onChange={e => setEditingRoute({ ...editingRoute, name: e.target.value })} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2" />
                                        <button type="button" onClick={() => { if (!editingRoute.name) return; const newRoutes = [...formData.routes]; newRoutes.push({ name: editingRoute.name }); setFormData({ ...formData, routes: newRoutes }); setEditingRoute({ index: null, name: '' }); }} className="bg-primary-500 text-white px-4 py-2 rounded-xl font-bold uppercase text-[10px]">Add Route</button>
                                    </div>
                                    <div className="space-y-2">
                                        {formData.routes.map((route, i) => (
                                            <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                <span className="font-bold">{route.name}</span>
                                                <button type="button" onClick={() => setFormData({ ...formData, routes: formData.routes.filter((_, idx) => idx !== i) })} className="text-red-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'students' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <input type="text" placeholder="Student Name" value={editingStudent.name} onChange={e => setEditingStudent({ ...editingStudent, name: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2" />
                                        <input type="text" placeholder="Grade" value={editingStudent.grade} onChange={e => setEditingStudent({ ...editingStudent, grade: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2" />
                                    </div>
                                    <button type="button" onClick={() => { if (!editingStudent.name) return; const newStudents = [...formData.students]; newStudents.push({ ...editingStudent }); setFormData({ ...formData, students: newStudents }); setEditingStudent({ index: null, name: '', grade: '', parent_phone: '', bus_id: '' }); }} className="w-full bg-primary-500 text-white py-2 rounded-xl font-bold uppercase text-[10px]">Enroll Student</button>
                                    <div className="space-y-2">
                                        {formData.students.map((student, i) => (
                                            <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                <span className="font-bold">{student.name} - {student.grade}</span>
                                                <button type="button" onClick={() => setFormData({ ...formData, students: formData.students.filter((_, idx) => idx !== i) })} className="text-red-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'permissions' && (
                                <div className="grid grid-cols-2 gap-6">
                                    {Object.entries(formData.permissions).map(([key, val]) => (
                                        <label key={key} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer">
                                            <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{key} Feature</span>
                                            <input type="checkbox" checked={val} onChange={e => setFormData({ ...formData, permissions: { ...formData.permissions, [key]: e.target.checked } })} className="w-5 h-5 accent-primary-500" />
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-8 border-t border-gray-100 bg-gray-50/50">
                            <button onClick={handleCreateSchool} disabled={isSubmitting} className="w-full py-4 bg-primary-500 text-white rounded-2xl font-black uppercase text-sm shadow-xl shadow-primary-500/20 flex items-center justify-center">
                                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : editingId ? 'Update Network' : 'Deploy School Network'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Admin Management Modal */}
            {isAdminModalOpen && selectedSchoolForAdmin && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/60 shadow-2xl">
                    <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col">
                        <div className="p-8 bg-blue-600 text-white flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-black">Manage Admins</h2>
                                <p className="text-[10px] uppercase font-bold opacity-80">{selectedSchoolForAdmin.name}</p>
                            </div>
                            <button onClick={() => setIsAdminModalOpen(false)} className="bg-white/20 p-2 rounded-full hover:bg-white/30"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh]">
                            {/* Current Admins */}
                            <div className="space-y-3">
                                <p className="text-[10px] font-black uppercase text-slate-400">Current Assignments</p>
                                {loadingAdmins ? (
                                    <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin text-blue-500" /></div>
                                ) : schoolAdmins.length === 0 ? (
                                    <p className="text-xs text-slate-400 font-bold p-4 bg-slate-50 rounded-xl text-center">No admins assigned</p>
                                ) : (
                                    schoolAdmins.map((admin) => (
                                        <div key={admin.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                            <div>
                                                <p className="text-sm font-black">{admin.name}</p>
                                                <p className="text-[10px] font-bold text-slate-400">{admin.email}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleToggleAdminStatus(admin)} className={cn("px-2 py-1 rounded-lg text-[8px] font-black uppercase", admin.status === 'Active' ? "bg-amber-50 text-amber-600" : "bg-green-50 text-green-600")}>
                                                    {admin.status === 'Active' ? 'Stop' : 'Start'}
                                                </button>
                                                <button onClick={() => handleDeleteAdmin(admin.id)} className="p-1.5 text-red-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <hr className="border-slate-100" />

                            {/* Create Form */}
                            <form onSubmit={handleCreateAdmin} className="space-y-4">
                                <p className="text-[10px] font-black uppercase text-slate-400">Authorize New Admin</p>
                                <input required type="text" placeholder="Admin Name" value={adminFormData.name} onChange={e => setAdminFormData({ ...adminFormData, name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold" />
                                <input required type="email" placeholder="Email Address" value={adminFormData.email} onChange={e => setAdminFormData({ ...adminFormData, email: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold" />
                                <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px] shadow-lg shadow-blue-600/20">
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Grant Administrative Rights'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
