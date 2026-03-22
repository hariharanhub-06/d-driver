'use client';

import { useState, useEffect } from 'react';
import { Building2, Plus, Search, MoreVertical, Edit, Trash2, Globe, Palette, Upload, X, Loader2 } from 'lucide-react';
import api from '@/lib/api';

interface School {
    id: string;
    name: string;
    address: string;
    logo_url?: string;
    primary_color?: string;
    status: string;
    subscription_plan: string;
}

export default function SchoolsManagement() {
    const [schools, setSchools] = useState<School[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        subscription_plan: 'Enterprise',
        primary_color: '#276EF1'
    });
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
            setSchools([]); // STRICTLY DYNAMIC DATA NOW
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateSchool = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            let finalLogoUrl = '';

            // 1. Upload Logo to S3 First if selected
            if (logoFile) {
                // Get Presigned URL
                const { data } = await api.get(`/upload/presigned-url?fileName=${logoFile.name}&fileType=${logoFile.type}`);

                // Directly upload file to S3
                await fetch(data.uploadUrl, {
                    method: 'PUT',
                    headers: { 'Content-Type': logoFile.type },
                    body: logoFile
                });

                finalLogoUrl = data.finalUrl;
            }

            // 2. Insert into MongoDB
            await api.post('/schools', {
                ...formData,
                logo_url: finalLogoUrl,
                status: 'Active'
            });

            // 3. Cleanup & Refresh
            setIsModalOpen(false);
            setFormData({ name: '', address: '', subscription_plan: 'Enterprise', primary_color: '#276EF1' });
            setLogoFile(null);
            fetchSchools();

        } catch (error) {
            console.error('Failed to register school:', error);
            alert('Failed to register school. Check console for details.');
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

    return (
        <div className="space-y-10 animate-in relative">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">School Network</h1>
                    <p className="text-slate-500 dark:text-white/40 font-bold uppercase tracking-[0.3em] text-[10px] mt-2 flex items-center">
                        <Building2 className="w-3 h-3 mr-1 text-uber-blue" /> Manage Subscribed Institutions
                    </p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-black text-white dark:bg-white dark:text-black hover:bg-slate-800 dark:hover:bg-white/90 font-black py-4 px-8 rounded-2xl transition-all flex items-center transform active:scale-95 shadow-xl shadow-black/10 dark:shadow-white/5"
                >
                    <Plus className="w-5 h-5 mr-3" strokeWidth={3} /> Register New School
                </button>
            </div>

            {/* Filter Bar */}
            <div className="flex items-center gap-4 bg-slate-100 dark:bg-[#121212] p-4 rounded-3xl border border-slate-200 dark:border-white/5">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/30 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search schools by name or region..."
                        className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl py-3 pl-12 pr-4 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/20 focus:ring-2 focus:ring-uber-blue outline-none transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Schools Grid */}
            {isLoading ? (
                <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin text-uber-blue" /></div>
            ) : schools.length === 0 ? (
                <div className="text-center p-20 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-3xl">
                    <Building2 className="w-16 h-16 mx-auto text-slate-300 dark:text-white/10 mb-4" />
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">No Schools Registered</h3>
                    <p className="text-slate-500 dark:text-white/40 mt-2">Click 'Register New School' to initiate a new network.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {schools.filter(s => s.name?.toLowerCase().includes(searchTerm.toLowerCase())).map((school) => (
                        <div key={school.id} className="bg-white dark:bg-[#121212] rounded-[32px] border border-slate-200 dark:border-white/5 overflow-hidden group hover:border-slate-300 dark:hover:border-white/20 transition-all shadow-premium">
                            <div className="h-2 w-full" style={{ backgroundColor: school.primary_color || '#276EF1' }}></div>
                            <div className="p-8">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="w-16 h-16 bg-slate-50 dark:bg-black rounded-2xl border border-slate-200 dark:border-white/10 flex items-center justify-center p-3 shadow-xl">
                                        {school.logo_url ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={school.logo_url} alt={school.name} className="w-full h-full object-contain" />
                                        ) : (
                                            <Building2 className="w-8 h-8 text-slate-300 dark:text-white/20" />
                                        )}
                                    </div>
                                    <button className="text-slate-400 hover:text-slate-900 dark:text-white/20 dark:hover:text-white transition-colors p-2">
                                        <MoreVertical className="w-5 h-5" />
                                    </button>
                                </div>

                                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{school.name}</h3>
                                <div className="mt-4 space-y-3">
                                    <div className="flex items-center text-slate-500 dark:text-white/40 text-sm font-bold">
                                        <Globe className="w-4 h-4 mr-3 text-uber-blue" /> {school.address || 'Global Headquarter'}
                                    </div>
                                    <div className="flex items-center text-slate-500 dark:text-white/40 text-sm font-bold">
                                        <Palette className="w-4 h-4 mr-3 text-uber-blue" /> Brand Color:
                                        <span className="ml-2 w-3 h-3 rounded-full" style={{ backgroundColor: school.primary_color }}></span>
                                    </div>
                                </div>

                                <div className="mt-8 flex items-center justify-between border-t border-slate-100 dark:border-white/5 pt-6">
                                    <div>
                                        <span className="px-3 py-1 bg-uber-blue/10 border border-uber-blue/20 rounded-full text-[10px] font-black uppercase text-uber-blue">
                                            {school.subscription_plan}
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 transition-all">
                                            <Edit className="w-4 h-4 text-slate-500 dark:text-white/50" />
                                        </button>
                                        <button onClick={() => handleDelete(school.id)} className="p-3 bg-red-500/10 rounded-xl hover:bg-red-500/20 transition-all">
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Registration Modal Overlay */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#121212] w-full max-w-2xl rounded-[32px] border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white">Register School</h2>
                                <p className="text-slate-500 dark:text-white/40 text-sm mt-1">Initiate a new multi-tenant transport portal.</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-100 dark:bg-white/5 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-white/50 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateSchool} className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest">Institution Name *</label>
                                    <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-uber-blue" placeholder="e.g. St. Marys Academy" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest">Headquarter Address</label>
                                    <input type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-uber-blue" placeholder="e.g. Sydney, AU" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest">Brand Logo (PNG/JPG)</label>
                                    <label className="flex items-center justify-center w-full h-12 bg-slate-50 dark:bg-black border border-dashed border-slate-300 dark:border-white/20 rounded-xl cursor-pointer hover:border-uber-blue dark:hover:border-uber-blue transition-colors relative overflow-hidden">
                                        {logoFile ? (
                                            <span className="text-sm font-medium text-uber-blue truncate px-4">{logoFile.name}</span>
                                        ) : (
                                            <span className="flex items-center text-sm font-medium text-slate-400 dark:text-white/30"><Upload className="w-4 h-4 mr-2" /> Upload to AWS S3</span>
                                        )}
                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) setLogoFile(e.target.files[0]) }} />
                                    </label>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest">Dashboard Theme Color</label>
                                    <div className="flex gap-4 items-center">
                                        <input type="color" value={formData.primary_color} onChange={e => setFormData({ ...formData, primary_color: e.target.value })} className="block bg-transparent cursor-pointer w-12 h-12 border-0 rounded-xl" />
                                        <span className="text-sm font-mono text-slate-500 dark:text-white/50">{formData.primary_color}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-slate-100 dark:border-white/5 flex gap-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-4 rounded-xl font-bold text-slate-700 dark:text-white bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors flex-1">
                                    Cancel
                                </button>
                                <button disabled={isSubmitting} type="submit" className="px-6 py-4 rounded-xl font-black text-white bg-uber-blue hover:bg-blue-600 transition-colors flex-1 flex items-center justify-center disabled:opacity-50">
                                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Deploy Network'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function cn(...inputs: unknown[]) {
    return inputs.filter(Boolean).join(' ');
}
