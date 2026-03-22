'use client';

import { useState, useEffect } from 'react';
import { Building2, Plus, Search, MoreVertical, Edit, Trash2, Globe, Phone, Mail, Palette } from 'lucide-react';
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

    useEffect(() => {
        fetchSchools();
    }, []);

    const fetchSchools = async () => {
        try {
            const response = await api.get('/schools');
            setSchools(response.data);
        } catch (error) {
            // Demo Fallback
            setSchools([
                { id: '1', name: 'Greenwood International', address: 'Sydney, AU', status: 'Active', subscription_plan: 'Enterprise', primary_color: '#276EF1' },
                { id: '2', name: 'St. Marys Academy', address: 'Melbourne, AU', status: 'Active', subscription_plan: 'Basic', primary_color: '#C026D3' },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-10 animate-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter uppercase">School Network</h1>
                    <p className="text-white/40 font-bold uppercase tracking-[0.3em] text-[10px] mt-2 flex items-center">
                        <Building2 className="w-3 h-3 mr-1 text-uber-blue" /> Manage Subscribed Institutions
                    </p>
                </div>
                <button className="bg-white hover:bg-white/90 text-black font-black py-4 px-8 rounded-2xl transition-all flex items-center transform active:scale-95 shadow-xl shadow-white/5">
                    <Plus className="w-5 h-5 mr-3" strokeWidth={3} /> Register New School
                </button>
            </div>

            {/* Filter Bar */}
            <div className="flex items-center gap-4 bg-[#121212] p-4 rounded-3xl border border-white/5">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search schools by name or region..."
                        className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-white placeholder:text-white/20 focus:ring-2 focus:ring-uber-blue outline-none transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Schools Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {schools.map((school) => (
                    <div key={school.id} className="bg-[#121212] rounded-[32px] border border-white/5 overflow-hidden group hover:border-white/20 transition-all shadow-premium">
                        <div className="h-2 w-full" style={{ backgroundColor: school.primary_color || '#276EF1' }}></div>
                        <div className="p-8">
                            <div className="flex justify-between items-start mb-6">
                                <div className="w-16 h-16 bg-black rounded-2xl border border-white/10 flex items-center justify-center p-3 shadow-xl">
                                    {school.logo_url ? (
                                        <img src={school.logo_url} alt={school.name} className="w-full h-full object-contain" />
                                    ) : (
                                        <Building2 className="w-8 h-8 text-white/20" />
                                    )}
                                </div>
                                <button className="text-white/20 hover:text-white transition-colors p-2">
                                    <MoreVertical className="w-5 h-5" />
                                </button>
                            </div>

                            <h3 className="text-xl font-black text-white tracking-tight">{school.name}</h3>
                            <div className="mt-4 space-y-3">
                                <div className="flex items-center text-white/40 text-sm font-bold">
                                    <Globe className="w-4 h-4 mr-3 text-uber-blue" /> {school.address}
                                </div>
                                <div className="flex items-center text-white/40 text-sm font-bold">
                                    <Palette className="w-4 h-4 mr-3 text-uber-blue" /> Brand Color:
                                    <span className="ml-2 w-3 h-3 rounded-full" style={{ backgroundColor: school.primary_color }}></span>
                                </div>
                            </div>

                            <div className="mt-8 flex items-center justify-between border-t border-white/5 pt-6">
                                <div>
                                    <span className="px-3 py-1 bg-uber-blue/10 border border-uber-blue/20 rounded-full text-[10px] font-black uppercase text-uber-blue">
                                        {school.subscription_plan}
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <button className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all">
                                        <Edit className="w-4 h-4 text-white/50" />
                                    </button>
                                    <button className="p-3 bg-red-500/10 rounded-xl hover:bg-red-500/20 transition-all">
                                        <Trash2 className="w-4 h-4 text-red-500" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}
