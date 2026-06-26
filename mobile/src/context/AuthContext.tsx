// Session state: hydrate from secure storage, login/logout, and wire the api
// client's auth-failure + first-login callbacks to navigation-friendly state.
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { loginRequest, setOnAuthFailure, setOnFirstLogin } from '@/lib/api';
import { saveSession, getStoredUser, getAccessToken, clearSession } from '@/lib/secureStore';
import { connectSocket, joinParentRooms, disconnectSocket } from '@/lib/socket';
import { queryClient } from '@/lib/queryClient';

export interface AppUser {
    id: string;
    name: string;
    email?: string;
    role: 'super_admin' | 'admin' | 'driver' | 'parent' | 'bus_staff';
    school_id?: string;
    is_first_login?: boolean;
    is_dev_sa?: boolean;
}

interface AuthState {
    user: AppUser | null;
    loading: boolean;
    firstLogin: boolean;
    login: (email: string, password: string) => Promise<AppUser>;
    logout: () => Promise<void>;
    clearFirstLogin: () => void;
}

const AuthContext = createContext<AuthState>({} as AuthState);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [firstLogin, setFirstLogin] = useState(false);

    const logout = useCallback(async () => {
        await clearSession();
        disconnectSocket();
        queryClient.clear(); // drop cached role-scoped data so a re-login can't see stale data
        setUser(null);
        setFirstLogin(false);
    }, []);

    // Wire api interceptors → state once.
    useEffect(() => {
        setOnAuthFailure(() => { logout(); });
        setOnFirstLogin(() => { setFirstLogin(true); });
    }, [logout]);

    // Hydrate session on launch.
    useEffect(() => {
        (async () => {
            try {
                const [token, stored] = await Promise.all([getAccessToken(), getStoredUser<AppUser>()]);
                if (token && stored) {
                    setUser(stored);
                    setFirstLogin(!!stored.is_first_login);
                    if (stored.role === 'parent') {
                        await connectSocket();
                        joinParentRooms(stored.id, stored.school_id);
                    }
                }
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        const data = await loginRequest(email, password);
        const u = data.user as AppUser;
        await saveSession(data.access_token, data.refresh_token, u);
        setUser(u);
        setFirstLogin(!!u.is_first_login);
        if (u.role === 'parent' && !u.is_first_login) {
            await connectSocket();
            joinParentRooms(u.id, u.school_id);
        }
        return u;
    }, []);

    const clearFirstLogin = useCallback(() => setFirstLogin(false), []);

    return (
        <AuthContext.Provider value={{ user, loading, firstLogin, login, logout, clearFirstLogin }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
