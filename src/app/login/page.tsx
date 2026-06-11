'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Bus, Eye, EyeOff, Lock, ArrowLeft, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import api from '@/lib/api';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [currentSchool, setCurrentSchool] = useState<{ name: string; logo?: string; color?: string } | null>(null);
    const [platformLogo, setPlatformLogo] = useState<string | null>(null);
    const [logoError, setLogoError] = useState(false);
    const { login } = useAuth();
    const router = useRouter();
    const { theme, setTheme } = useTheme();

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

    const brandColor = currentSchool?.color || '#22c55e';

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

    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-slate-50 dark:bg-slate-950">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 px-8 py-10 w-full max-w-md mx-auto">

                {/* Logo + Brand */}
                <div className="flex flex-col items-center mb-6">
                    <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-md"
                        style={{ backgroundColor: brandColor }}
                    >
                        {currentSchool?.logo && !logoError ? (
                            <img
                                src={currentSchool.logo}
                                alt={currentSchool.name}
                                className="w-10 h-10 rounded-xl object-cover"
                                onError={() => setLogoError(true)}
                            />
                        ) : platformLogo && !logoError ? (
                            <img
                                src={platformLogo}
                                alt="ONLIVE"
                                className="w-10 h-10 object-contain rounded-lg"
                                onError={() => setLogoError(true)}
                            />
                        ) : (
                            <Bus className="w-7 h-7 text-white" />
                        )}
                    </div>

                    <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                        {currentSchool?.name || 'ONLIVE'}
                    </h1>
                    <p className="text-xs text-slate-400 tracking-widest uppercase mt-1">
                        {currentSchool ? 'School Bus Portal' : 'School Bus Management Platform'}
                    </p>
                </div>

                {/* Divider */}
                <div className="border-t border-slate-100 dark:border-slate-800 my-6" />

                {/* Form heading */}
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6">
                    Sign in to your account
                </h2>

                {/* Form */}
                <form onSubmit={handleLogin} className="space-y-6">

                    {/* Email */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full border-0 border-b-2 border-slate-200 dark:border-slate-700 focus:border-[#22c55e] bg-transparent py-3 text-slate-900 dark:text-white text-sm outline-none transition-colors placeholder:text-slate-300 dark:placeholder:text-slate-600"
                            style={{ '--focus-color': brandColor } as React.CSSProperties}
                            onFocus={e => (e.currentTarget.style.borderBottomColor = brandColor)}
                            onBlur={e => (e.currentTarget.style.borderBottomColor = '')}
                            placeholder="you@school.com"
                            required
                            autoComplete="email"
                        />
                    </div>

                    {/* Password */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Password
                            </label>
                            <Link
                                href="/forgot-password"
                                className="text-xs font-semibold hover:underline"
                                style={{ color: brandColor }}
                            >
                                Forgot?
                            </Link>
                        </div>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full border-0 border-b-2 border-slate-200 dark:border-slate-700 focus:border-[#22c55e] bg-transparent py-3 text-slate-900 dark:text-white text-sm outline-none transition-colors placeholder:text-slate-300 dark:placeholder:text-slate-600 pr-10"
                                onFocus={e => (e.currentTarget.style.borderBottomColor = brandColor)}
                                onBlur={e => (e.currentTarget.style.borderBottomColor = '')}
                                placeholder="••••••••"
                                required
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                            <span className="shrink-0">⚠</span>
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3.5 text-white font-bold rounded-xl mt-6 transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg"
                        style={{
                            backgroundColor: isLoading ? brandColor : brandColor,
                            boxShadow: `0 8px 24px ${brandColor}33`,
                        }}
                        onMouseEnter={e => !isLoading && (e.currentTarget.style.filter = 'brightness(0.9)')}
                        onMouseLeave={e => (e.currentTarget.style.filter = '')}
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

                {/* Divider */}
                <div className="border-t border-slate-100 dark:border-slate-800 mt-8 mb-4" />

                {/* Footer */}
                <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                        <Lock size={11} />
                        Secure · ONLIVE
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                            title="Toggle theme"
                        >
                            {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
                        </button>
                        <Link
                            href="/"
                            className="text-xs text-slate-400 hover:text-green-600 dark:hover:text-green-400 flex items-center gap-1 transition-colors"
                        >
                            <ArrowLeft size={11} />
                            Home
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
