'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { authStorage } from '@/lib/authStorage';

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
    profile_photo_url?: string;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (token: string, userData: User, refreshToken?: string) => void;
    logout: () => void;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    login: () => { },
    logout: () => { },
    refreshUser: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const token = authStorage.get('access_token');
        const storedUser = authStorage.get('user');

        if (token && storedUser) {
            try {
                const parsed = JSON.parse(storedUser);
                setUser(parsed);
                // Refresh from server to pick up any fields missing from old sessions (e.g. is_dev_sa)
                api.get('/users/me')
                    .then(({ data }) => {
                        const refreshed: User = {
                            ...parsed,
                            name: data.name,
                            email: data.email,
                            role: data.role,
                            school_id: data.school?.id ?? data.school_id ?? parsed.school_id,
                            is_dev_sa: data.is_dev_sa ?? false,
                            is_first_login: data.is_first_login,
                            profile_photo_url: data.profile_photo_url ?? undefined,
                        };
                        setUser(refreshed);
                        authStorage.set('user', JSON.stringify(refreshed));
                    })
                    .catch(() => { /* keep cached user if /me fails */ })
                    .finally(() => setLoading(false));
                return;
            } catch {
                authStorage.remove('access_token');
                authStorage.remove('refresh_token');
                authStorage.remove('user');
            }
        }
        setLoading(false);
    }, []);

    const login = (token: string, userData: User, refreshToken?: string) => {
        authStorage.set('access_token', token);
        if (refreshToken) {
            authStorage.set('refresh_token', refreshToken);
        }
        authStorage.set('user', JSON.stringify(userData));
        setUser(userData);

        if (userData.role === 'super_admin') {
            router.push('/super-admin/dashboard');
        } else if (userData.role === 'driver') {
            router.push('/driver/dashboard');
        } else if (userData.role === 'parent') {
            router.push('/parent/dashboard');
        } else if (userData.role === 'bus_staff') {
            router.push('/bus-staff/attendance');
        } else {
            router.push('/admin/dashboard');
        }
    };

    const refreshUser = async () => {
        try {
            const { data } = await api.get('/users/me');
            setUser(prev => {
                if (!prev) return prev;
                const updated: User = {
                    ...prev,
                    name: data.name,
                    email: data.email,
                    profile_photo_url: data.profile_photo_url ?? undefined,
                };
                authStorage.set('user', JSON.stringify(updated));
                return updated;
            });
        } catch { /* silent */ }
    };

    const logout = async () => {
        try { await api.post('/auth/logout'); } catch { /* fail silently — still clear local state */ }
        authStorage.remove('access_token');
        authStorage.remove('refresh_token');
        authStorage.remove('user');
        setUser(null);
        router.push('/login');
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
