'use client';

import { useEffect } from 'react';

// Registers the service worker for installable-PWA + offline shell.
// No-op during dev / unsupported browsers.
export default function PWARegister() {
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!('serviceWorker' in navigator)) return;
        if (process.env.NODE_ENV !== 'production') return;
        // Once the new worker takes control, reload so the page runs the fresh build.
        // Guard against reload loops with a one-shot flag.
        let refreshing = false;
        const onControllerChange = () => {
            if (refreshing) return;
            refreshing = true;
            window.location.reload();
        };
        navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

        const onLoad = () => {
            navigator.serviceWorker.register('/sw.js').then((reg) => {
                // When a new SW is found, activate it immediately so users never get stuck
                // on a stale cached build (the "old UI" some installs kept showing).
                const promote = (sw: ServiceWorker | null) => {
                    if (!sw) return;
                    sw.addEventListener('statechange', () => {
                        // Only auto-skip when there's already a controller (i.e. an update,
                        // not the very first install) to avoid an unnecessary first-load reload.
                        if (sw.state === 'installed' && navigator.serviceWorker.controller) {
                            sw.postMessage({ type: 'SKIP_WAITING' });
                        }
                    });
                };
                if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                reg.addEventListener('updatefound', () => promote(reg.installing));
            }).catch(() => {
                /* registration failure is non-fatal */
            });
        };
        window.addEventListener('load', onLoad);
        return () => {
            window.removeEventListener('load', onLoad);
            navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
        };
    }, []);
    return null;
}
