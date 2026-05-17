'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Bus, Eye, EyeOff } from 'lucide-react';
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
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
            <div className="flex w-full max-w-3xl gap-6">
                {/* Left panel — desktop only */}
                <div
                    className="hidden lg:flex flex-col justify-center bg-[var(--brand)] text-white rounded-2xl p-10 w-[420px] shrink-0"
                    style={currentSchool?.color ? { backgroundColor: currentSchool.color } : undefined}
                >
                    <div className="mb-6">
                        {currentSchool?.logo ? (
                            <img
                                src={currentSchool.logo}
                                alt="School Logo"
                                className="w-16 h-16 object-contain rounded-2xl bg-white/10 p-2"
                            />
                        ) : (
                            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
                                <Bus className="w-8 h-8 text-white" />
                            </div>
                        )}
                    </div>
                    <h2 className="text-3xl font-bold mb-3 leading-tight">
                        {currentSchool?.name || 'D-Driver'}
                    </h2>
                    <p className="text-white/70 text-base leading-relaxed">
                        Manage your school bus transport with ease
                    </p>
                </div>

                {/* Right panel — login form */}
                <div className="flex-1 flex items-center justify-center p-8">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm p-8">
                        {/* Brand logo */}
                        <div className="w-12 h-12 rounded-2xl bg-[var(--brand)] flex items-center justify-center mx-auto mb-6">
                            <Bus className="w-6 h-6 text-white" />
                        </div>

                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white text-center mb-1">
                            Welcome back
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6">
                            Sign in to your account
                        </p>

                        {error && (
                            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-2.5 mb-4">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors"
                                    placeholder="admin@school.com"
                                    required
                                />
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-1.5">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Password
                                    </label>
                                    <Link
                                        href="/forgot-password"
                                        className="text-sm text-[var(--brand)] hover:underline font-medium"
                                    >
                                        Forgot password?
                                    </Link>
                                </div>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors pr-10"
                                        placeholder="••••••••"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-[var(--brand)] hover:opacity-90 text-white rounded-xl py-2.5 font-semibold text-sm transition-all active:scale-95 disabled:opacity-50 mt-2"
                            >
                                {isLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                        Signing in…
                                    </span>
                                ) : (
                                    'Sign in'
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
