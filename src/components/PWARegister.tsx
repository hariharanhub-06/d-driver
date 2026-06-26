'use client';

import { useEffect } from 'react';

// Registers the service worker for installable-PWA + offline shell.
// No-op during dev / unsupported browsers.
export default function PWARegister() {
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!('serviceWorker' in navigator)) return;
        if (process.env.NODE_ENV !== 'production') return;
        const onLoad = () => {
            navigator.serviceWorker.register('/sw.js').catch(() => {
                /* registration failure is non-fatal */
            });
        };
        window.addEventListener('load', onLoad);
        return () => window.removeEventListener('load', onLoad);
    }, []);
    return null;
}
