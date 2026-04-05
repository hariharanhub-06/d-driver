'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Bus, Globe, MapPin, Shield, Users, Lock, ArrowRight, Loader2, ChevronRight } from 'lucide-react';
import api from '@/lib/api';

interface SchoolData {
    id: string;
    name: string;
    slug: string;
    logo_url?: string;
    primary_color?: string;
    address?: string;
    status: string;
    buses?: any[];
    drivers?: any[];
    routes?: any[];
    students?: any[];
}

export default function SchoolPortal() {
    const params = useParams();
    const router = useRouter();
    const slug = params.slug as string;

    const [school, setSchool] = useState<SchoolData | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        const fetchSchool = async () => {
            try {
                const res = await api.get('/schools');
                const found = res.data.find((s: SchoolData) => s.slug === slug);
                if (found) {
                    setSchool(found);
                } else {
                    setNotFound(true);
                }
            } catch {
                setNotFound(true);
            } finally {
                setLoading(false);
            }
        };
        fetchSchool();
    }, [slug]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                    <p className="text-slate-500 font-bold text-sm">Loading school portal...</p>
                </div>
            </div>
        );
    }

    if (notFound || !school) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center space-y-4">
                    <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto">
                        <Globe className="w-10 h-10 text-red-400" />
                    </div>
                    <h1 className="text-2xl font-black text-slate-900">School Not Found</h1>
                    <p className="text-slate-500">No school portal is configured for <strong>{slug}</strong>.</p>
                    <button onClick={() => router.push('/login')} className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all">
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    const themeColor = school.primary_color || '#2dbc75';

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex flex-col">

            {/* Header */}
            <header className="border-b border-slate-100 bg-white/80 backdrop-blur-md px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    {school.logo_url ? (
                        <img src={school.logo_url} alt="School Logo" className="w-10 h-10 rounded-xl object-cover" />
                    ) : (
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-lg" style={{ background: themeColor }}>
                            {school.name.charAt(0)}
                        </div>
                    )}
                    <div>
                        <h1 className="font-black text-slate-900 text-sm leading-none">{school.name}</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{school.slug}.ddriver365.com</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${school.status === 'Active' ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-red-50 text-red-500 border border-red-200'}`}>
                        {school.status}
                    </span>
                    <button
                        onClick={() => router.push(`/login?school=${school.slug}`)}
                        className="flex items-center gap-2 px-4 py-2 text-white rounded-xl font-bold text-xs shadow-lg hover:opacity-90 active:scale-[0.98] transition-all"
                        style={{ background: themeColor }}
                    >
                        <Lock className="w-3.5 h-3.5" />
                        Admin Login
                    </button>
                </div>
            </header>

            {/* Hero */}
            <main className="flex-1 p-6 md:p-12 max-w-5xl mx-auto w-full space-y-10">

                {/* Welcome Banner */}
                <div className="rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}cc)` }}>
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, white 0%, transparent 60%)' }} />
                    <div className="relative z-10">
                        <p className="text-xs font-black uppercase tracking-[0.3em] opacity-70 mb-2">School Bus ERP Portal</p>
                        <h2 className="text-3xl font-black leading-tight mb-3">{school.name}</h2>
                        {school.address && <p className="text-sm opacity-80 font-semibold flex items-center gap-2"><MapPin className="w-4 h-4" />{school.address}</p>}
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Buses', count: school.buses?.length || 0, icon: Bus, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100' },
                        { label: 'Drivers', count: school.drivers?.length || 0, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100' },
                        { label: 'Routes', count: school.routes?.length || 0, icon: Globe, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100' },
                        { label: 'Students', count: school.students?.length || 0, icon: Shield, color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-100' },
                    ].map((stat) => (
                        <div key={stat.label} className={`${stat.bg} border ${stat.border} rounded-2xl p-6 text-center`}>
                            <stat.icon className={`w-6 h-6 mx-auto mb-2 ${stat.color}`} />
                            <p className="text-3xl font-black text-slate-900">{stat.count}</p>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">{stat.label}</p>
                        </div>
                    ))}
                </div>

                {/* Routes List */}
                {school.routes && school.routes.length > 0 && (
                    <div>
                        <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-4">Active Routes</h3>
                        <div className="space-y-3">
                            {school.routes.map((route, i) => (
                                <div key={i} className="bg-white border border-slate-100 rounded-2xl p-5 flex items-center justify-between shadow-sm hover:border-slate-200 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${themeColor}15` }}>
                                            <MapPin className="w-5 h-5" style={{ color: themeColor }} />
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-900">{route.name}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">{route.stops?.length || 0} Stops Configured</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-300" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Login CTA */}
                <div className="bg-slate-900 rounded-[2rem] p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <h3 className="text-white font-black text-xl mb-1">Access Your Dashboard</h3>
                        <p className="text-slate-400 text-sm font-semibold">Sign in to manage buses, routes, attendance, and more.</p>
                    </div>
                    <button
                        onClick={() => router.push(`/login?school=${school.slug}`)}
                        className="flex items-center gap-3 px-8 py-4 text-white rounded-2xl font-black text-sm shadow-2xl hover:opacity-90 active:scale-[0.98] transition-all whitespace-nowrap"
                        style={{ background: themeColor }}
                    >
                        Login to Portal <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-100 px-6 py-4 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Powered by D-Driver365 • School Bus ERP</p>
            </footer>
        </div>
    );
}
