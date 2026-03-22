'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Home, Map, Receipt, User } from 'lucide-react';
import Link from 'next/link';

export default function ParentLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) router.push('/login');
    }, [user, loading, router]);

    if (loading || !user) return <div className="min-h-screen bg-slate-50 dark:bg-slate-900"></div>;

    return (
        <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-900 pb-16 sm:pb-0 sm:flex-row">
            <header className="sm:hidden bg-primary-600 text-white p-4 shrink-0 shadow-md z-10 flex justify-between items-center">
                <h1 className="text-xl font-bold">D-Driver Parent</h1>
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
                    {user.name.charAt(0)}
                </div>
            </header>

            <main className="flex-1 overflow-y-auto w-full max-w-lg mx-auto sm:border-x border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-xl relative">
                {children}
            </main>

            <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-around p-3 z-50">
                <Link href="/parent/dashboard" className="flex flex-col items-center text-primary-600 dark:text-primary-400">
                    <Home className="w-6 h-6" />
                    <span className="text-[10px] font-medium mt-1">Home</span>
                </Link>
                <Link href="/parent/tracking" className="flex flex-col items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                    <Map className="w-6 h-6" />
                    <span className="text-[10px] mt-1">Track</span>
                </Link>
                <Link href="/parent/fees" className="flex flex-col items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                    <Receipt className="w-6 h-6" />
                    <span className="text-[10px] mt-1">Fees</span>
                </Link>
                <Link href="/parent/profile" className="flex flex-col items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                    <User className="w-6 h-6" />
                    <span className="text-[10px] mt-1">Profile</span>
                </Link>
            </nav>
        </div>
    );
}
