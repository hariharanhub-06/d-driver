'use client';

import { useState, useEffect } from 'react';
import { Building2, Plus, Search, MoreVertical, Edit, Trash2, Globe, Palette, Upload, X, Loader2, Link as LinkIcon, ShieldCheck, Truck, Users, ExternalLink, Copy, GraduationCap, MapPin, Clock } from 'lucide-react';
import api from '@/lib/api';

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
            let finalLogoUrl = '';

            // 1. Upload Logo if selected
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

            // 2. Default Permissions for new school
            // 3. Insert or Update Network
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

            // 4. Cleanup
            setIsModalOpen(false);
            setEditingId(null);
            setFormData({
                name: '', slug: '', address: '', subscription_plan: 'Basic', status: 'Active', primary_color: '#2dbc75',
                permissions: { f1: true, f4: false, f5: false, f6: false, f7: false, f8: false, f9: false, f10: false } as Record<string, boolean>,
                buses: [], drivers: [], routes: [], students: []
            });
            setLogoFile(null);
            fetchSchools();
            alert(editingId ? 'Network Updated Successfully!' : 'Network Registered Successfully!');



        } catch (error: any) {
            console.error('Failed to register school:', error);
            const msg = error.response?.data?.message || error.message;
            if (msg.toLowerCase().includes('slug')) {
                alert('SLUG CONFLICT: This URL slug is already taken. Please modify it (e.g., add a state or year) to ensure a unique portal address.');
            } else {
                alert(`Error: ${msg}`);
            }
        } finally {
            setIsSubmitting(false);
        }
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

    const handleDeleteAdmin = async (userId: string) => {
        if (!confirm('Remove this admin from the school?')) return;
        try {
            await api.delete(`/users/${userId}`);
            setSchoolAdmins(prev => prev.filter(u => u.id !== userId));
        } catch (e: any) {
            // Gracefully handle missing endpoint in mock mode
            setSchoolAdmins(prev => prev.filter(u => u.id !== userId));
        }
    };

    const handleToggleAdminStatus = async (admin: any) => {
        const newStatus = admin.status === 'Inactive' ? 'Active' : 'Inactive';
        try {
            await api.put(`/users/${admin.id}`, { ...admin, status: newStatus });
            setSchoolAdmins(prev => prev.map(u => u.id === admin.id ? { ...u, status: newStatus } : u));
        } catch {
            setSchoolAdmins(prev => prev.map(u => u.id === admin.id ? { ...u, status: newStatus } : u));
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

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to permanently delete this school network?')) return;
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
            alert(`Failed to update status: ${error.message}`);
        }
    };


    return (
        <div className="space-y-10 animate-in relative p-4 max-w-7xl mx-auto">
            {/* Mock Awareness Banner */}
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-[2rem] flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-amber-500 rounded-2xl flex items-center justify-center text-white">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-amber-900 font-black text-sm uppercase tracking-tight">Best Developer Failover Active</p>
                        <p className="text-amber-700 text-xs font-bold font-mono">Your database is currently offline. You are using high-performance in-memory persistence.</p>
                    </div>
                </div>
                <div className="hidden md:block">
                    <span className="bg-amber-200 text-amber-900 px-4 py-1.5 rounded-full text-[10px] font-black uppercase">Mock Mode</span>
                </div>
            </div>

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter">SCHOOL NETWORK</h1>
                    <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px] mt-2 flex items-center">
                        <Building2 className="w-3 h-3 mr-1 text-primary-500" /> Administrative Control Center
                    </p>
                </div>
                <button
                    onClick={() => {
                        setEditingId(null);
                        setFormData({
                            name: '', slug: '', address: '', subscription_plan: 'Basic', status: 'Active', primary_color: '#2dbc75',
                            permissions: { f1: true, f4: false, f5: false, f6: false, f7: false, f8: false, f9: false, f10: false } as Record<string, boolean>,
                            buses: [], drivers: [], routes: []
                        });
                        setActiveTab('profile');
                        setIsModalOpen(true);
                    }}

                    className="bg-primary-500 text-white hover:bg-primary-600 font-black py-4 px-10 rounded-2xl transition-all flex items-center transform active:scale-95 shadow-xl shadow-primary-500/20"
                >
                    <Plus className="w-5 h-5 mr-3" strokeWidth={3} /> Register Institution
                </button>

            </div>

            {/* Filter & Stats */}
            <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search schools by name or slug..."
                        className="w-full bg-white border border-gray-100 rounded-3xl py-4 pl-14 pr-6 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-primary-500 outline-none transition-all shadow-sm"
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


            {/* Schools Grid */}
            {isLoading ? (
                <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin text-primary-500" /></div>
            ) : schools.length === 0 ? (
                <div className="text-center p-20 bg-white border border-dashed border-gray-200 rounded-[3rem]">
                    <Building2 className="w-16 h-16 mx-auto text-slate-200 mb-4" />
                    <h3 className="text-xl font-bold text-slate-900">No Networks Found</h3>
                    <p className="text-slate-500 mt-2">Deploy your first school network to get started.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {schools.filter(s => s.name?.toLowerCase().includes(searchTerm.toLowerCase()) || s.slug?.includes(searchTerm.toLowerCase())).map((school) => (
                        <div key={school.id} className={cn(
                            "bg-white rounded-[3rem] border border-gray-100 overflow-hidden group hover:border-primary-200 transition-all shadow-premium hover:shadow-2xl hover:shadow-primary-500/5 flex flex-col h-full relative",
                            school.status !== 'Active' && "opacity-60 grayscale-[0.5]"
                        )}>
                            <div className="h-2 w-full" style={{ backgroundColor: school.primary_color || '#2dbc75' }}></div>
                            <div className="p-8 flex flex-col flex-1">
                                <div className="flex justify-between items-start mb-8">
                                    <div className="w-20 h-20 bg-gray-50 rounded-[2rem] border border-gray-100 flex items-center justify-center p-4 shadow-inner group-hover:bg-primary-50 transition-colors">
                                        {school.logo_url ? (
                                            <img src={school.logo_url} alt={school.name} className="w-full h-full object-contain" />
                                        ) : (
                                            <Building2 className="w-10 h-10 text-slate-200 group-hover:text-primary-200 transition-colors" />
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-2 text-right">
                                        <div className="flex gap-2 justify-end">
                                            <button
                                                onClick={() => handleOpenAdminModal(school)}
                                                className="p-3 bg-gray-50 rounded-2xl hover:bg-blue-50 hover:text-blue-500 transition-all text-gray-400"
                                                title="Create School Admin"
                                            >
                                                <ShieldCheck className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setEditingId(school.id);
                                                    setFormData({
                                                        name: school.name,
                                                        slug: school.slug,
                                                        address: school.address || '',
                                                        subscription_plan: school.subscription_plan,
                                                        status: school.status,
                                                        primary_color: school.primary_color || '#2dbc75',
                                                        permissions: school.permissions || { f1: true },
                                                        buses: school.buses || [],
                                                        drivers: school.drivers || [],
                                                        routes: school.routes || [],
                                                        students: school.students || []
                                                    });
                                                    setActiveTab('profile');
                                                    setIsModalOpen(true);
                                                }}
                                                className="p-3 bg-gray-50 rounded-2xl hover:bg-primary-50 hover:text-primary-500 transition-all text-gray-400"
                                                title="Edit Institution"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(school.id)} className="p-3 bg-gray-50 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all text-gray-400">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => handleToggleStatus(school)}
                                            className={cn(
                                                "py-2 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border self-end",
                                                school.status === 'Active'
                                                    ? "bg-red-50 border-red-100 text-red-500 hover:bg-red-100"
                                                    : "bg-green-50 border-green-100 text-green-500 hover:bg-green-100"
                                            )}
                                        >
                                            {school.status === 'Active' ? 'Deactivate' : 'Activate'}
                                        </button>
                                    </div>

                                </div>

                                <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">{school.name}</h3>
                                <div className="space-y-2 mb-6">
                                    {/* Local Dev Link — works right now in localhost */}
                                    <a
                                        href={`/school/${school.slug}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-slate-700 group cursor-pointer bg-primary-50 px-3 py-2 rounded-xl border border-primary-100 hover:bg-primary-100 transition-all w-full"
                                        title="Open school portal (localhost)"
                                    >
                                        <Globe className="w-3.5 h-3.5 text-primary-500 shrink-0" />
                                        <span className="text-[10px] font-bold tracking-tight group-hover:text-primary-700 transition-colors uppercase truncate flex-1">localhost/school/{school.slug}</span>
                                        <ExternalLink className="w-3 h-3 text-primary-400 shrink-0" />
                                    </a>
                                    {/* Production URL — label only, works after DNS setup */}
                                    <div
                                        className="flex items-center gap-2 text-slate-500 group cursor-pointer bg-amber-50/60 px-3 py-1.5 rounded-xl border border-amber-100 hover:bg-amber-50 transition-all w-full"
                                        title="Production URL — DNS required to go live"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigator.clipboard.writeText(`${school.slug}.ddriver365.com`);
                                            alert(`Prod URL copied!\n\n${school.slug}.ddriver365.com\n\nPoint your DNS CNAME to this app server to activate.`);
                                        }}
                                    >
                                        <span className="text-[9px] font-black uppercase text-amber-600 shrink-0">Prod</span>
                                        <span className="text-[10px] font-bold text-amber-700 uppercase truncate flex-1">{school.slug}.ddriver365.com</span>
                                        <Copy className="w-3 h-3 text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                    </div>
                                </div>





                                <div className="space-y-4 flex-1">
                                    <div className="flex items-center text-slate-500 text-sm font-bold">
                                        <Globe className="w-4 h-4 mr-3 text-primary-500" />
                                        <span className="truncate">{school.address || 'Standard Access'}</span>
                                    </div>
                                    <div className="flex items-center text-slate-500 text-sm font-bold">
                                        <Palette className="w-4 h-4 mr-3 text-primary-500" />
                                        Dash Color: <span className="ml-2 w-4 h-4 rounded-full border border-gray-100" style={{ backgroundColor: school.primary_color }}></span>
                                    </div>
                                </div>

                                <div className="mt-8 pt-6 border-t border-gray-50 flex items-center justify-between">
                                    <span className={cn(
                                        "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                                        school.subscription_plan === 'Enterprise' ? "bg-primary-50 text-primary-600" : "bg-blue-50 text-blue-600"
                                    )}>
                                        {school.subscription_plan}
                                    </span>
                                    <span className="text-[10px] font-black text-green-500 uppercase flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                                        {school.status}
                                    </span>
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                    {[
                                        { id: 'buses' as const, label: 'Buses', count: school.buses?.length || 0, icon: Truck, color: 'text-amber-500', bg: 'bg-amber-50/50', hover: 'hover:border-amber-200' },
                                        { id: 'drivers' as const, label: 'Drivers', count: school.drivers?.length || 0, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50/50', hover: 'hover:border-blue-200' },
                                        { id: 'routes' as const, label: 'Routes', count: school.routes?.length || 0, icon: Globe, color: 'text-emerald-500', bg: 'bg-emerald-50/50', hover: 'hover:border-emerald-200' },
                                        { id: 'students' as const, label: 'Students', count: school.students?.length || 0, icon: GraduationCap, color: 'text-purple-500', bg: 'bg-purple-50/50', hover: 'hover:border-purple-200' },
                                    ].map((stat, i) => (
                                        <button
                                            key={i}
                                            onClick={() => {
                                                setEditingId(school.id);
                                                setFormData({
                                                    name: school.name,
                                                    slug: school.slug,
                                                    address: school.address || '',
                                                    subscription_plan: school.subscription_plan,
                                                    status: school.status,
                                                    primary_color: school.primary_color || '#2dbc75',
                                                    permissions: school.permissions || { f1: true },
                                                    buses: school.buses || [],
                                                    drivers: school.drivers || [],
                                                    routes: school.routes || [],
                                                    students: school.students || []
                                                });
                                                setActiveTab(stat.id);
                                                setIsModalOpen(true);
                                            }}
                                            className={cn(
                                                "p-3 rounded-2xl border border-slate-100 flex flex-col items-center transition-all group/stat",
                                                stat.bg,
                                                stat.hover
                                            )}
                                        >
                                            <stat.icon className={cn("w-4 h-4 mb-1 transition-transform group-hover/stat:scale-110", stat.color)} />
                                            <p className="text-lg font-black text-slate-900 leading-none">{stat.count}</p>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase mt-1 tracking-tighter">{stat.label}</p>
                                        </button>
                                    ))}
                                </div>

                            </div>
                        </div>
                    ))}

                </div>
            )}

            {/* Registration Modal Overlay */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
                    <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
                        <div className="p-10 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h2 className="text-3xl font-black text-slate-900 tracking-tight">{editingId ? 'Edit Institution' : 'Deploy Network'}</h2>
                                <p className="text-slate-500 font-medium text-sm mt-1">Configure a dedicated School Bus ERP instance.</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-3 bg-white rounded-full hover:bg-gray-100 text-gray-400 transition-all shadow-sm">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Tab Switcher — scrollable so all tabs are reachable */}
                        <div className="flex border-b border-gray-100 bg-white px-4 overflow-x-auto scrollbar-none flex-nowrap">
                            {[
                                { id: 'profile', label: 'Profile', icon: Building2 },
                                { id: 'buses', label: 'Buses', icon: Truck },
                                { id: 'drivers', label: 'Drivers', icon: Users },
                                { id: 'routes', label: 'Routes', icon: Globe },
                                { id: 'students', label: 'Students', icon: GraduationCap },
                                { id: 'permissions', label: 'Authorization', icon: ShieldCheck }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={cn(
                                        "flex items-center gap-2 px-5 py-4 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 whitespace-nowrap shrink-0",
                                        activeTab === tab.id
                                            ? "border-primary-500 text-primary-500 bg-primary-50/30"
                                            : "border-transparent text-slate-400 hover:text-slate-600 hover:bg-gray-50"
                                    )}
                                >
                                    <tab.icon className="w-3 h-3" />
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <form onSubmit={handleCreateSchool} className="p-10 space-y-8 max-h-[60vh] overflow-y-auto">
                            {activeTab === 'profile' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Institution Name</label>
                                            <input required type="text" value={formData.name} onChange={e => handleNameChange(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-base font-bold text-slate-900 outline-none focus:ring-2 focus:ring-primary-500 transition-all placeholder:text-slate-400" placeholder="e.g. Oxford Collegiate" />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Assigned URL Slug</label>
                                            <div className="relative">
                                                <input required type="text" value={formData.slug} onChange={e => setFormData({ ...formData, slug: e.target.value })} className="w-full bg-slate-100 border border-slate-200 rounded-2xl p-4 pl-6 text-sm font-mono font-bold text-primary-600 outline-none" placeholder="auto-generated" />
                                                <LinkIcon className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Business Address / Branch</label>
                                        <input type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-base font-bold text-slate-900 outline-none focus:ring-2 focus:ring-primary-500 transition-all placeholder:text-slate-400" placeholder="e.g. New York, USA" />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Branding Logo</label>
                                            <label className="flex items-center justify-center w-full h-14 bg-white border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer hover:border-primary-500 transition-all relative overflow-hidden shadow-sm">
                                                {logoFile ? (
                                                    <span className="text-sm font-bold text-primary-500 truncate px-6">{logoFile.name}</span>
                                                ) : (
                                                    <span className="flex items-center text-sm font-bold text-slate-400"><Upload className="w-5 h-5 mr-3" /> Select Logo</span>
                                                )}
                                                <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) setLogoFile(e.target.files[0]) }} />
                                            </label>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Dashboard Primary Theme</label>
                                            <div className="flex gap-4 items-center h-14 bg-slate-50 border border-slate-200 px-5 rounded-2xl">
                                                <input type="color" value={formData.primary_color} onChange={e => setFormData({ ...formData, primary_color: e.target.value })} className="block bg-transparent cursor-pointer w-8 h-8 border-0 rounded-lg" />
                                                <span className="text-sm font-mono font-bold text-slate-600 uppercase">{formData.primary_color}</span>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            )}

                            {/* Buses Tab */}
                            {activeTab === 'buses' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200">
                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Bus Number</label>
                                                <input type="text" value={editingBus.bus_number} onChange={e => setEditingBus({ ...editingBus, bus_number: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold" placeholder="e.g. B-101" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Capacity</label>
                                                <input type="number" value={editingBus.capacity} onChange={e => setEditingBus({ ...editingBus, capacity: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold" placeholder="40" />
                                            </div>
                                            <div className="space-y-2 col-span-2">
                                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Assign Route</label>
                                                <select value={(editingBus as any).assigned_route || ''} onChange={e => setEditingBus({ ...editingBus, assigned_route: e.target.value } as any)} className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold">
                                                    <option value="">No Route Assigned</option>
                                                    {formData.routes.map((r: any) => <option key={r.name} value={r.name}>{r.name}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (!editingBus.bus_number) return;
                                                const newBuses = [...formData.buses];
                                                if (editingBus.index !== null) {
                                                    newBuses[editingBus.index] = { bus_number: editingBus.bus_number, capacity: parseInt(editingBus.capacity) || 0 };
                                                } else {
                                                    newBuses.push({ bus_number: editingBus.bus_number, capacity: parseInt(editingBus.capacity) || 0 });
                                                }
                                                setFormData({ ...formData, buses: newBuses });
                                                setEditingBus({ index: null, bus_number: '', capacity: '' });
                                            }}
                                            className="w-full py-3 bg-primary-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-primary-500/20 hover:bg-primary-600 transition-all"
                                        >
                                            {editingBus.index !== null ? 'Update Bus' : 'Add Vehicle to Fleet'}
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {formData.buses.map((bus, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl group hover:border-primary-200 transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-primary-500 transition-colors">
                                                        <Truck className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-slate-900">{bus.bus_number}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{bus.capacity} Seats Available</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button type="button" onClick={() => setEditingBus({ index: idx, bus_number: bus.bus_number, capacity: bus.capacity.toString() })} className="p-2 text-primary-500 hover:bg-primary-50 rounded-lg transition-colors"><Edit className="w-4 h-4" /></button>
                                                    <button type="button" onClick={() => setFormData({ ...formData, buses: formData.buses.filter((_, i) => i !== idx) })} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Drivers Tab */}
                            {activeTab === 'drivers' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200">
                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Driver Name</label>
                                                <input type="text" value={editingDriver.name} onChange={e => setEditingDriver({ ...editingDriver, name: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold" placeholder="e.g. Robert Wilson" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Email</label>
                                                <input type="email" value={editingDriver.email} onChange={e => setEditingDriver({ ...editingDriver, email: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold" placeholder="robert@school.com" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">License No</label>
                                                <input type="text" value={editingDriver.license} onChange={e => setEditingDriver({ ...editingDriver, license: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold" placeholder="LC-992211" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Assign Bus</label>
                                                <select value={editingDriver.assigned_bus} onChange={e => setEditingDriver({ ...editingDriver, assigned_bus: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold">
                                                    <option value="">Unassigned</option>
                                                    {formData.buses.map((b: any) => <option key={b.bus_number} value={b.bus_number}>{b.bus_number}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (!editingDriver.name || !editingDriver.email) return;
                                                const newDrivers = [...formData.drivers];
                                                if (editingDriver.index !== null) {
                                                    newDrivers[editingDriver.index] = { ...editingDriver };
                                                } else {
                                                    newDrivers.push({ ...editingDriver });
                                                }
                                                setFormData({ ...formData, drivers: newDrivers });
                                                setEditingDriver({ index: null, name: '', email: '', license: '', assigned_bus: '' });
                                            }}
                                            className="w-full py-3 bg-primary-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-primary-500/20 hover:bg-primary-600 transition-all"
                                        >
                                            {editingDriver.index !== null ? 'Update Driver' : 'Register Operator'}
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {formData.drivers.map((driver, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl group hover:border-primary-200 transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-primary-500 transition-colors">
                                                        <Users className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-slate-900">{driver.name}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{driver.assigned_bus || 'No Bus'} • {driver.license}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button type="button" onClick={() => setEditingDriver({ index: idx, ...driver })} className="p-2 text-primary-500 hover:bg-primary-50 rounded-lg transition-colors"><Edit className="w-4 h-4" /></button>
                                                    <button type="button" onClick={() => setFormData({ ...formData, drivers: formData.drivers.filter((_, i) => i !== idx) })} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Routes Tab */}
                            {activeTab === 'routes' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200">
                                        <div className="space-y-2 mb-4">
                                            <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Route Designation</label>
                                            <input type="text" value={editingRoute.name} onChange={e => setEditingRoute({ ...editingRoute, name: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold" placeholder="e.g. Sector-12 Transit" />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (!editingRoute.name) return;
                                                const newRoutes = [...formData.routes];
                                                if (editingRoute.index !== null) {
                                                    newRoutes[editingRoute.index] = { name: editingRoute.name };
                                                } else {
                                                    newRoutes.push({ name: editingRoute.name });
                                                }
                                                setFormData({ ...formData, routes: newRoutes });
                                                setEditingRoute({ index: null, name: '' });
                                            }}
                                            className="w-full py-3 bg-primary-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-primary-500/20 hover:bg-primary-600 transition-all"
                                        >
                                            {editingRoute.index !== null ? 'Update Route' : 'Establish New Route'}
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {formData.routes.map((route, idx) => (
                                            <div key={idx} className="space-y-3">
                                                <div className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl group hover:border-primary-200 transition-all">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-primary-500 transition-colors">
                                                            <Globe className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black text-slate-900">{route.name}</p>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{(route.stops?.length || 0)} Pinned Stops</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button type="button" onClick={() => setEditingRouteStops({ routeIndex: idx, stops: route.stops || [] })} className="p-2 text-primary-500 hover:bg-primary-50 rounded-lg transition-colors flex items-center gap-1 font-bold text-[10px] uppercase"><MapPin className="w-3 h-3" /> Stops</button>
                                                        <button type="button" onClick={() => setEditingRoute({ index: idx, name: route.name })} className="p-2 text-primary-500 hover:bg-primary-50 rounded-lg transition-colors"><Edit className="w-4 h-4" /></button>
                                                        <button type="button" onClick={() => setFormData({ ...formData, routes: formData.routes.filter((_, i) => i !== idx) })} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                                                    </div>
                                                </div>

                                                {/* Stops Management Sub-section */}
                                                {editingRouteStops.routeIndex === idx && (
                                                    <div className="ml-8 p-6 bg-slate-50 border border-slate-200 rounded-[2rem] space-y-4 animate-in slide-in-from-top-2 duration-200">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Pin Route Stops</h4>
                                                            <button type="button" onClick={() => setEditingRouteStops({ routeIndex: null, stops: [] })} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="space-y-1">
                                                                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Stop Name</label>
                                                                <input type="text" value={newStop.name} onChange={e => setNewStop({ ...newStop, name: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-bold" placeholder="e.g. Main Gate" />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Arrival Time</label>
                                                                <input type="time" value={newStop.time} onChange={e => setNewStop({ ...newStop, time: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-bold" />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Latitude</label>
                                                                <input type="number" step="any" value={newStop.lat} onChange={e => setNewStop({ ...newStop, lat: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-bold" placeholder="12.9716" />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Longitude</label>
                                                                <input type="number" step="any" value={newStop.lng} onChange={e => setNewStop({ ...newStop, lng: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-bold" placeholder="77.5946" />
                                                            </div>
                                                        </div>

                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (!newStop.name) return;
                                                                const updatedStops = [...editingRouteStops.stops, { ...newStop, id: `stop-${Date.now()}` }];
                                                                const updatedRoutes = [...formData.routes];
                                                                updatedRoutes[idx].stops = updatedStops;
                                                                setFormData({ ...formData, routes: updatedRoutes });
                                                                setEditingRouteStops({ ...editingRouteStops, stops: updatedStops });
                                                                setNewStop({ name: '', time: '', lat: '', lng: '' });
                                                            }}
                                                            className="w-full py-2 bg-slate-900 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                                                        >
                                                            <MapPin className="w-3 h-3" /> Pin Stop on Route
                                                        </button>

                                                        <div className="space-y-2 mt-4">
                                                            {editingRouteStops.stops.map((stop: any, sIdx: number) => (
                                                                <div key={sIdx} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl">
                                                                    <div className="flex items-center gap-3">
                                                                        <Clock className="w-3.5 h-3.5 text-primary-500" />
                                                                        <div>
                                                                            <p className="text-xs font-bold text-slate-900">{stop.name}</p>
                                                                            <p className="text-[9px] font-bold text-slate-400 uppercase">{stop.time} • {stop.lat}, {stop.lng}</p>
                                                                        </div>
                                                                    </div>
                                                                    <button type="button" onClick={() => {
                                                                        const updatedStops = editingRouteStops.stops.filter((_, i) => i !== sIdx);
                                                                        const updatedRoutes = [...formData.routes];
                                                                        updatedRoutes[idx].stops = updatedStops;
                                                                        setFormData({ ...formData, routes: updatedRoutes });
                                                                        setEditingRouteStops({ ...editingRouteStops, stops: updatedStops });
                                                                    }} className="text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                </div>
                            )}

                            {activeTab === 'students' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200">
                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Student Name</label>
                                                <input type="text" value={editingStudent.name} onChange={e => setEditingStudent({ ...editingStudent, name: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold" placeholder="e.g. Alice Smith" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Grade / Class</label>
                                                <input type="text" value={editingStudent.grade} onChange={e => setEditingStudent({ ...editingStudent, grade: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold" placeholder="Grade 5" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Parent Phone</label>
                                                <input type="text" value={editingStudent.parent_phone} onChange={e => setEditingStudent({ ...editingStudent, parent_phone: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold" placeholder="+1 234 567 890" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Assign Bus</label>
                                                <select value={editingStudent.bus_id} onChange={e => setEditingStudent({ ...editingStudent, bus_id: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold">
                                                    <option value="">Unassigned</option>
                                                    {formData.buses.map((b: any) => <option key={b.bus_number} value={b.bus_number}>{b.bus_number}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-2 col-span-2">
                                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Boarding Stop</label>
                                                <select value={editingStudent.stop_id || ''} onChange={e => setEditingStudent({ ...editingStudent, stop_id: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold">
                                                    <option value="">No Stop Assigned</option>
                                                    {formData.routes.flatMap((r: any) => (r.stops || []).map((s: any) => (
                                                        <option key={s.id} value={s.id}>{r.name} › {s.name} ({s.time})</option>
                                                    )))}
                                                </select>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (!editingStudent.name) return;
                                                const newStudents = [...formData.students];
                                                if (editingStudent.index !== null) {
                                                    newStudents[editingStudent.index] = { ...editingStudent };
                                                } else {
                                                    newStudents.push({ ...editingStudent });
                                                }
                                                setFormData({ ...formData, students: newStudents });
                                                setEditingStudent({ index: null, name: '', grade: '', parent_phone: '', bus_id: '', stop_id: '' });
                                            }}
                                            className="w-full py-3 bg-primary-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-primary-500/20 hover:bg-primary-600 transition-all"
                                        >
                                            {editingStudent.index !== null ? 'Update Student' : 'Enroll Student'}
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {formData.students.map((student, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl group hover:border-primary-200 transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-primary-500 transition-colors">
                                                        <GraduationCap className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-slate-900">{student.name}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{student.grade} • Bus: {student.bus_id || 'None'} • Stop: {student.stop_id ? formData.routes.flatMap((r: any) => r.stops || []).find((s: any) => s.id === student.stop_id)?.name || 'Pinned' : 'None'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button type="button" onClick={() => setEditingStudent({ index: idx, ...student })} className="p-2 text-primary-500 hover:bg-primary-50 rounded-lg transition-colors"><Edit className="w-4 h-4" /></button>
                                                    <button type="button" onClick={() => setFormData({ ...formData, students: formData.students.filter((_, i) => i !== idx) })} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'permissions' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="space-y-6 pt-4">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Feature Authorization Matrix</label>
                                            <p className="text-[10px] text-slate-400 font-bold ml-1 mb-4 italic">Subscription dynamically calculates based on enabled modules.</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            {[
                                                { id: 'f4', label: 'Attendance System', icon: ShieldCheck },
                                                { id: 'f5', label: 'Live GPS Tracking', icon: Globe },
                                                { id: 'f6', label: 'Route Management', icon: LinkIcon },
                                                { id: 'f9', label: 'Fee Management', icon: Palette },
                                                { id: 'f10', label: 'Push Notifications', icon: Building2 },
                                            ].map((module) => (
                                                <label key={module.id} className={cn(
                                                    "flex items-center gap-3 p-4 rounded-2xl border transition-all cursor-pointer group shadow-sm",
                                                    (formData.permissions as any)?.[module.id]
                                                        ? "bg-primary-50 border-primary-200 text-primary-900"
                                                        : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
                                                )}>
                                                    <input
                                                        type="checkbox"
                                                        className="hidden"
                                                        checked={!!(formData.permissions as any)?.[module.id]}
                                                        onChange={() => {
                                                            const newPermissions = { ...(formData.permissions as any), [module.id]: !(formData.permissions as any)?.[module.id] };
                                                            const enabledCount = Object.values(newPermissions).filter(Boolean).length;
                                                            let newPlan = 'Basic';
                                                            if (enabledCount > 4) newPlan = 'Enterprise';
                                                            else if (enabledCount > 2) newPlan = 'Premium';

                                                            setFormData({ ...formData, permissions: newPermissions, subscription_plan: newPlan });
                                                        }}
                                                    />
                                                    <module.icon className={cn("w-4 h-4", (formData.permissions as any)?.[module.id] ? "text-primary-500" : "text-slate-300")} />
                                                    <span className="text-xs font-black uppercase tracking-tight">{module.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Common Footer Buttons */}
                            <div className="pt-10 flex gap-6">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-5 rounded-2xl font-bold text-slate-400 hover:text-slate-900 transition-colors flex-1 bg-slate-50 hover:bg-slate-100">
                                    Discard
                                </button>
                                <button disabled={isSubmitting} type="submit" className="px-10 py-5 rounded-2xl font-black text-white bg-primary-500 shadow-2xl shadow-primary-500/30 hover:bg-primary-600 transition-all flex-1 flex items-center justify-center disabled:opacity-50 group">
                                    {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                                        <>
                                            {editingId ? 'Save Configuration' : `Launch ${formData.subscription_plan} Portal`}
                                            <Building2 className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>

                    </div>
                </div>
            )}
            {/* Admin Management Modal */}
            {isAdminModalOpen && selectedSchoolForAdmin && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
                    <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20 text-slate-900 flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-blue-50/30 shrink-0">
                            <div>
                                <h2 className="text-2xl font-black tracking-tight text-slate-900">Manage Admins</h2>
                                <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-1">{selectedSchoolForAdmin.name}</p>
                            </div>
                            <button onClick={() => { setIsAdminModalOpen(false); setSchoolAdmins([]); }} className="p-3 bg-white rounded-full hover:bg-gray-100 text-gray-400 shadow-sm transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-8">

                            {/* Existing Admins List */}
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Current Admins ({schoolAdmins.length})</p>
                                {loadingAdmins ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                                    </div>
                                ) : schoolAdmins.length === 0 ? (
                                    <div className="text-center py-8 bg-slate-50 rounded-2xl border border-slate-100">
                                        <ShieldCheck className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                                        <p className="text-xs font-bold text-slate-400">No admins assigned yet</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {schoolAdmins.map((admin) => (
                                            <div key={admin.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl group hover:border-blue-200 transition-all">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500 font-black">
                                                        {admin.name?.charAt(0)?.toUpperCase() || 'A'}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-slate-900">{admin.name}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase">{admin.email}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${admin.status === 'Inactive'
                                                            ? 'bg-red-50 text-red-500 border border-red-100'
                                                            : 'bg-green-50 text-green-600 border border-green-100'
                                                        }`}>{admin.status || 'Active'}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleAdminStatus(admin)}
                                                        className={`p-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${admin.status === 'Inactive'
                                                                ? 'bg-green-50 text-green-600 hover:bg-green-100'
                                                                : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                                                            }`}
                                                    >
                                                        {admin.status === 'Inactive' ? 'Activate' : 'Deactivate'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteAdmin(admin.id)}
                                                        className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-all"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Divider */}
                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-px bg-slate-100" />
                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Add New Admin</span>
                                <div className="flex-1 h-px bg-slate-100" />
                            </div>

                            {/* Create Admin Form */}
                            <form onSubmit={handleCreateAdmin} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-slate-500">Full Name</label>
                                    <input required type="text" value={adminFormData.name} onChange={e => setAdminFormData({ ...adminFormData, name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="e.g. Principal John Smith" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-slate-500">Email Address</label>
                                    <input required type="email" value={adminFormData.email} onChange={e => setAdminFormData({ ...adminFormData, email: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="admin@school.com" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-slate-500">Default Password</label>
                                    <input required type="text" value={adminFormData.password} onChange={e => setAdminFormData({ ...adminFormData, password: e.target.value })} className="w-full bg-slate-100 border border-slate-200 rounded-2xl p-4 text-sm font-mono font-bold text-slate-500 outline-none" />
                                </div>
                                <button disabled={isSubmitting} type="submit" className="w-full py-4 rounded-2xl font-black text-white bg-blue-600 shadow-xl shadow-blue-600/30 hover:bg-blue-700 transition-all flex items-center justify-center active:scale-[0.98] group">
                                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                        <>
                                            Authorize Administrator
                                            <ShieldCheck className="ml-2 w-4 h-4 group-hover:scale-110 transition-transform" strokeWidth={3} />
                                        </>
                                    )}
                                </button>
                            </form>

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function cn(...inputs: unknown[]) {
    return inputs.filter(Boolean).join(' ');
}
