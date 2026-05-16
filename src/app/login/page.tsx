'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Bus, Eye, EyeOff, ShieldCheck, ArrowRight } from 'lucide-react';
import api from '@/lib/api';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [currentSchool, setCurrentSchool] = useState<{ name: string; logo?: string; color?: string } | null>(null);
    const { login } = useAuth();
    const router = useRouter();

    // Fetch school branding from cookie slug (set by middleware)
    useEffect(() => {
        const slug = document.cookie
            .split('; ')
            .find(r => r.startsWith('school-slug='))
            ?.split('=')[1];

        if (slug) {
            fetch(`${process.env.NEXT_PUBLIC_API_URL}/schools/public/${slug}`)
                .then(r => r.json())
                .then(data => {
                    if (data?.name) {
                        setCurrentSchool({
                            name: data.name,
                            logo: data.logo_url || undefined,
                            color: data.primary_color || undefined,
                        });
                    }
                })
                .catch(() => {});
        }
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await api.post('/auth/login', { email, password });

            const { access_token, refresh_token, user } = response.data;

            // Handle first login — redirect to change-password before dashboard
            if (user?.is_first_login === true) {
                localStorage.setItem('access_token', access_token);
                if (refresh_token) localStorage.setItem('refresh_token', refresh_token);
                localStorage.setItem('user', JSON.stringify(user));
                router.push('/change-password');
                return;
            }

            login(access_token, user, refresh_token);
        } catch (err: any) {
            let errorMessage = 'Verification failed. Please check your credentials.';

            if (err.response?.status === 503) {
                errorMessage = 'Service temporarily unavailable. Please try again later.';
            } else if (err.response?.data?.message) {
                errorMessage = err.response.data.message;
            }

            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 relative overflow-hidden font-sans">
            {/* Ambient Background Glow */}
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-600/10 blur-[120px] rounded-full"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-600/5 blur-[120px] rounded-full"></div>

            <div className="max-w-[420px] w-full z-10 animate-in scale-95 md:scale-100 origin-center">
                <div className="bg-[#121212] rounded-[32px] shadow-premium overflow-hidden border border-white/5 relative">
                    {/* Header Section */}
                    <div className="p-6 pt-8 text-center relative overflow-hidden">
                        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-20"></div>
                        <div className="w-16 h-16 bg-white rounded-2xl mx-auto flex items-center justify-center shadow-2xl mb-4 transform transition-transform border border-white/10 p-3">
                            {currentSchool?.logo ? (
                                <img src={currentSchool.logo} alt="School Logo" className="w-full h-full object-contain" />
                            ) : (
                                <Bus className="w-8 h-8 text-black" strokeWidth={1.5} />
                            )}
                        </div>
                        <h1 className="text-2xl font-black text-white tracking-tighter mb-1">
                            {currentSchool?.name || "D-DRIVER"}
                        </h1>
                        <p className="text-white/40 text-[9px] font-black uppercase tracking-[0.3em]">
                            {currentSchool ? "Institutional Logistics" : "Enterprise Transport Management"}
                        </p>
                    </div>

                    <div className="p-8 pt-4">
                        {error && (
                            <div className="bg-red-500/10 text-red-400 border border-red-500/20 p-3 rounded-2xl text-[10px] font-bold mb-4 text-center animate-in flex items-center justify-center gap-2">
                                <ShieldCheck className="w-3 h-3" /> {error}
                            </div>
                        )}

                        <form onSubmit={handleLogin} className="space-y-4 relative z-10">
                            <div className="space-y-2">
                                <label className="block text-[9px] font-black text-white/40 uppercase tracking-widest ml-1">
                                    Email Terminal
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-5 py-3.5 rounded-[18px] border border-white/10 bg-white/5 text-white placeholder:text-white/20 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-lg font-bold"
                                    placeholder="admin@school.com"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center ml-1">
                                    <label className="block text-[9px] font-black text-white/40 uppercase tracking-widest">
                                        Access Key
                                    </label>
                                    <Link
                                        href="/forgot-password"
                                        className="text-[9px] font-black text-blue-400/70 hover:text-blue-400 uppercase tracking-widest transition-colors"
                                    >
                                        Forgot password?
                                    </Link>
                                </div>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full px-5 py-3.5 rounded-[18px] border border-white/10 bg-white/5 text-white placeholder:text-white/20 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-lg font-bold"
                                        placeholder="••••••••"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-white hover:bg-white/90 text-black font-black py-4 px-6 rounded-[18px] transition-all flex justify-center items-center h-[56px] text-lg active:scale-[0.98] shadow-2xl overflow-hidden group mt-4"
                            >
                                {isLoading ? (
                                    <div className="w-6 h-6 border-4 border-black/10 border-t-black rounded-full animate-spin"></div>
                                ) : (
                                    <span className="flex items-center">
                                        Continue
                                        <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </span>
                                )}
                            </button>
                        </form>

                        <div className="mt-8 text-center border-t border-white/5 pt-6 relative z-10">
                            <p className="text-white/20 text-[9px] font-black uppercase tracking-[0.4em]">
                                &copy; 2025 D-Driver Portal
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
