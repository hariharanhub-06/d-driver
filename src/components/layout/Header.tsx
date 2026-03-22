'use client';

import { Bell, Menu, Moon, Search, Sun, Globe } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Header({ onMenuClick }: { onMenuClick: () => void }) {
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        if (document.documentElement.classList.contains('dark')) {
            setIsDark(true);
        }
    }, []);

    const toggleTheme = () => {
        document.documentElement.classList.toggle('dark');
        setIsDark(!isDark);
    };
    return (
        <header className="h-16 bg-[var(--card-bg)] border-b border-[var(--border)] flex items-center justify-between px-6 z-10 sticky top-0 shrink-0">
            <div className="flex items-center">
                <button
                    onClick={onMenuClick}
                    className="md:hidden mr-4 text-slate-500 hover:text-foreground"
                >
                    <Menu className="w-6 h-6" />
                </button>
                <div className="relative hidden md:block">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="pl-10 pr-4 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-sm focus:outline-none focus:border-primary-500 w-64 transition-colors"
                    />
                </div>
            </div>

            <div className="flex items-center space-x-2 md:space-x-4">
                <button
                    onClick={() => alert('Language selection will be available in the next release.')}
                    className="p-2 text-slate-500 hover:text-foreground rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center text-sm font-medium"
                >
                    <Globe className="w-5 h-5 md:mr-2" />
                    <span className="hidden md:inline">EN</span>
                </button>
                <button
                    onClick={toggleTheme}
                    className="p-2 text-slate-500 hover:text-foreground rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                    {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
                <button
                    onClick={() => alert('You have no new notifications.')}
                    className="p-2 text-slate-500 hover:text-foreground rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
                >
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
                </button>
                <div
                    onClick={() => alert('Profile settings coming soon.')}
                    className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold ml-2 cursor-pointer hover:bg-primary-200 transition-colors"
                >
                    H
                </div>
            </div>
        </header>
    );
}
