'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Bus, Eye, EyeOff, CheckCircle2, MapPin, Users, BarChart3 } from 'lucide-react';
import dynamic from 'next/dynamic';
const AuthBusPanel = dynamic(() => import('@/components/ui/AuthBusPanel'), { ssr: false });
import api from '@/lib/api';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [currentSchool, setCurrentSchool] = useState<{ name: string; logo?: string; color?: string } | null>(null);
    const [platformLogo, setPlatformLogo] = useState<string | null>(null);
    const { login } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // Auto-redirect if a valid session already exists in localStorage
        try {
            const token = localStorage.getItem('access_token');
            const storedUser = localStorage.getItem('user');
            if (token && storedUser) {
                const u = JSON.parse(storedUser);
                const dest =
                    u.role === 'super_admin' ? '/super-admin/dashboard' :
                    u.role === 'driver'      ? '/driver/dashboard' :
                    u.role === 'parent'      ? '/parent/dashboard' :
                    u.role === 'bus_staff'   ? '/bus-staff/attendance' :
                    u.role === 'admin'       ? '/admin/dashboard' : null;
                if (dest) { router.replace(dest); return; }
            }
        } catch { /* ignore parse errors */ }

        const params = new URLSearchParams(window.location.search);
        const slugFromQuery = params.get('school');
        const slugFromCookie = document.cookie
            .split('; ')
            .find(r => r.startsWith('school-slug='))
            ?.split('=')[1];
        const slug = slugFromQuery || slugFromCookie;

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
        } else {
            // Main domain — fetch platform branding
            fetch(`${process.env.NEXT_PUBLIC_API_URL}/platform/config`)
                .then(r => r.json())
                .then(data => { if (data?.platform_logo_url) setPlatformLogo(data.platform_logo_url); })
                .catch(() => {});
        }
    }, []);

    const brandColor = currentSchool?.color || 'var(--brand)';

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await api.post('/auth/login', { email, password });
            const { access_token, refresh_token, user } = response.data;

            if (user?.is_first_login === true) {
                localStorage.setItem('access_token', access_token);
                if (refresh_token) localStorage.setItem('refresh_token', refresh_token);
                localStorage.setItem('user', JSON.stringify(user));
                router.push('/change-password');
                return;
            }

            login(access_token, user, refresh_token);
        } catch (err: any) {
            const msg = err.response?.data?.error || err.response?.data?.message;
            if (err.response?.status === 503) {
                setError('Service temporarily unavailable. Please try again later.');
            } else if (err.response?.status === 403 && (msg?.toLowerCase().includes('suspend') || msg?.toLowerCase().includes('not active') || msg?.toLowerCase().includes('inactive'))) {
                setError('Your school account has been suspended. Please contact your school administrator or D-Driver support.');
            } else {
                setError(msg || 'Invalid email or password.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const features = [
        { icon: MapPin, text: 'Live GPS tracking for every bus' },
        { icon: Users, text: 'Manage students, drivers & parents' },
        { icon: BarChart3, text: 'Attendance, fees & reports in one place' },
    ];

    return (
        <div className="min-h-screen flex">
            {/* ── Left panel — animated bus scene only ─────────── */}
            <div
                className="hidden lg:block lg:w-[52%] relative overflow-hidden"
                style={{ backgroundColor: currentSchool?.color || 'var(--brand)' }}
            >
                <AuthBusPanel brandColor={currentSchool?.color} />
            </div>

            {/* ── Right form panel ─────────────────────────────── */}
            <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-slate-900 px-6 py-12">
                {/* Mobile-only logo */}
                <div className="flex items-center gap-2 mb-10 lg:hidden">
                    {currentSchool?.logo ? (
                        <img src={currentSchool.logo} alt={currentSchool.name} className="w-9 h-9 rounded-xl object-cover" />
                    ) : platformLogo ? (
                        <img src={platformLogo} alt="D-Driver" className="h-9 object-contain" />
                    ) : (
                        <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: currentSchool?.color || 'var(--brand)' }}
                        >
                            <Bus className="w-5 h-5 text-white" />
                        </div>
                    )}
                    <span className="font-bold text-slate-900 dark:text-white text-lg">
                        {currentSchool?.name || 'D-Driver'}
                    </span>
                </div>

                <div className="w-full max-w-sm">
                    {/* Heading */}
                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                            Welcome back
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">
                            Sign in to your account to continue
                        </p>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="flex items-start gap-2.5 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 mb-5">
                            <span className="mt-0.5 shrink-0">⚠</span>
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleLogin} className="space-y-5">
                        {/* Email */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                Email address
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                                style={{ '--tw-ring-color': currentSchool?.color || 'var(--brand)' } as React.CSSProperties}
                                placeholder="you@school.com"
                                required
                                autoComplete="email"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    Password
                                </label>
                                <Link
                                    href="/forgot-password"
                                    className="text-xs font-medium hover:underline"
                                    style={{ color: currentSchool?.color || 'var(--brand)' }}
                                >
                                    Forgot password?
                                </Link>
                            </div>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all pr-11"
                                    style={{ '--tw-ring-color': currentSchool?.color || 'var(--brand)' } as React.CSSProperties}
                                    placeholder="••••••••"
                                    required
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full text-white rounded-xl py-3 font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-60 mt-1 flex items-center justify-center gap-2"
                            style={{ backgroundColor: currentSchool?.color || 'var(--brand)' }}
                        >
                            {isLoading ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Signing in…
                                </>
                            ) : (
                                'Sign in'
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-8">
                        D-Driver · School Bus Management Platform
                    </p>
                </div>
            </div>
        </div>
    );
}
