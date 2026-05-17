'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface User {
    id: string;
    name: string;
    email: string;
    phone?: string;
    role: string;
    school_id: string;
    is_dev_sa?: boolean;
    is_first_login?: boolean;
    isMockMode?: boolean;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (token: string, userData: User, refreshToken?: string) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    login: () => { },
    logout: () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        const storedUser = localStorage.getItem('user');

        if (token && storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch {
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                localStorage.removeItem('user');
            }
        }
        setLoading(false);
    }, []);

    const login = (token: string, userData: User, refreshToken?: string) => {
        localStorage.setItem('access_token', token);
        if (refreshToken) {
            localStorage.setItem('refresh_token', refreshToken);
        }
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);

        if (userData.role === 'super_admin') {
            router.push('/super-admin/dashboard');
        } else if (userData.role === 'driver') {
            router.push('/driver/dashboard');
        } else if (userData.role === 'parent') {
            router.push('/parent/dashboard');
        } else {
            router.push('/admin/dashboard');
        }
    };

    const logout = async () => {
        try { await api.post('/auth/logout'); } catch { /* fail silently — still clear local state */ }
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        setUser(null);
        router.push('/login');
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
