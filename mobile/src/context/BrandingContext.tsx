// Per-school branding (accent colour + feature permissions). Fetched once the
// user is authenticated; feeds the ThemeProvider and permission gates.
import React, { createContext, useContext, useEffect, useState } from 'react';
import { getBranding, type Branding } from '@/lib/api';
import { useAuth } from './AuthContext';

const BrandingContext = createContext<Branding>({});

export function BrandingProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [branding, setBranding] = useState<Branding>({});

    useEffect(() => {
        if (!user) { setBranding({}); return; }
        getBranding().then(setBranding).catch(() => {});
    }, [user]);

    return <BrandingContext.Provider value={branding}>{children}</BrandingContext.Provider>;
}

export const useBranding = () => useContext(BrandingContext);

// Permission gate helper: returns true unless the school explicitly disabled the key.
export function useHasPermission(key: string): boolean {
    const branding = useBranding();
    const perms = branding.permissions;
    if (!perms) return true;
    return perms[key] !== false;
}
