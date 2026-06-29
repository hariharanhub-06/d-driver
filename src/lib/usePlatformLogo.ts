'use client';

import { useState, useEffect } from 'react';

// The Onlive logo bundled with the app — used as the fallback until/unless a super-admin has
// uploaded a custom platform logo in settings.
export const FALLBACK_LOGO = '/icons/onlive-logo.png';

// Session + localStorage cache so every component that shows the logo resolves it instantly
// (no flash of the fallback) and we only hit /platform/config once per load.
let cached: string | null = null;

/**
 * Returns the platform logo URL to display anywhere in the app. Resolves to the super-admin's
 * uploaded `platform_logo_url` (from /platform/config) and falls back to the bundled logo.
 * Swap any hard-coded `/icons/onlive-logo.png` for `usePlatformLogo()` to make the SA logo global.
 */
export function usePlatformLogo(): string {
    const [logo, setLogo] = useState<string>(() => {
        if (cached) return cached;
        if (typeof window !== 'undefined') {
            try {
                const ls = localStorage.getItem('platform_logo_url');
                if (ls) return ls;
            } catch { /* ignore */ }
        }
        return FALLBACK_LOGO;
    });

    useEffect(() => {
        let cancelled = false;
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/platform/config`)
            .then(r => r.json())
            .then(data => {
                const url = data?.platform_logo_url || FALLBACK_LOGO;
                cached = url;
                try { localStorage.setItem('platform_logo_url', url); } catch { /* ignore */ }
                if (!cancelled) setLogo(url);
            })
            .catch(() => { /* keep cached/fallback */ });
        return () => { cancelled = true; };
    }, []);

    return logo;
}
