'use client';

import { createContext, useContext, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAInstallValue {
    canInstall: boolean;   // an install path is available (Android event captured, or iOS)
    isIOS: boolean;        // iOS Safari → manual "Add to Home Screen"
    installed: boolean;    // already running as the installed PWA
    promptInstall: () => Promise<void>;
}

const PWAInstallContext = createContext<PWAInstallValue>({
    canInstall: false, isIOS: false, installed: false, promptInstall: async () => {},
});

// Captures the (single) `beforeinstallprompt` event once for the whole app, so both the
// throttled install banner and the header install icons can trigger installation on demand.
export function PWAInstallProvider({ children }: { children: React.ReactNode }) {
    const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
    const [isIOS, setIsIOS] = useState(false);
    const [installed, setInstalled] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const standalone =
            window.matchMedia('(display-mode: standalone)').matches ||
            (navigator as unknown as { standalone?: boolean }).standalone === true;
        if (standalone) { setInstalled(true); return; }

        const ua = navigator.userAgent;
        const ios = /iphone|ipad|ipod/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
        if (ios) setIsIOS(true);

        const onPrompt = (e: Event) => {
            e.preventDefault();
            setDeferred(e as BeforeInstallPromptEvent);
        };
        const onInstalled = () => { setInstalled(true); setDeferred(null); };

        window.addEventListener('beforeinstallprompt', onPrompt);
        window.addEventListener('appinstalled', onInstalled);
        return () => {
            window.removeEventListener('beforeinstallprompt', onPrompt);
            window.removeEventListener('appinstalled', onInstalled);
        };
    }, []);

    const promptInstall = async () => {
        if (!deferred) return;
        try {
            await deferred.prompt();
            await deferred.userChoice;
        } finally {
            setDeferred(null);
        }
    };

    const canInstall = !installed && (!!deferred || isIOS);

    return (
        <PWAInstallContext.Provider value={{ canInstall, isIOS, installed, promptInstall }}>
            {children}
        </PWAInstallContext.Provider>
    );
}

export const usePWAInstall = () => useContext(PWAInstallContext);
