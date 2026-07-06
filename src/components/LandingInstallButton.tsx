'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

// When the Android app is live, set this to the Play Store URL — the button then
// becomes a "Get the App" link instead of the PWA install prompt. (One-line swap.)
const PLAY_STORE_URL = '';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function LandingInstallButton({ compact = false }: { compact?: boolean }) {
    const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
    const [installed, setInstalled] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const standalone =
            window.matchMedia('(display-mode: standalone)').matches ||
            (navigator as unknown as { standalone?: boolean }).standalone === true;
        if (standalone) { setInstalled(true); return; }

        const onPrompt = (e: Event) => { e.preventDefault(); setDeferred(e as BeforeInstallPromptEvent); };
        const onInstalled = () => setInstalled(true);
        window.addEventListener('beforeinstallprompt', onPrompt);
        window.addEventListener('appinstalled', onInstalled);
        return () => {
            window.removeEventListener('beforeinstallprompt', onPrompt);
            window.removeEventListener('appinstalled', onInstalled);
        };
    }, []);

    // Compact = icon-only pill (for the header). Full = icon + label (for the footer).
    const compactCls = 'inline-flex items-center justify-center w-9 h-9 rounded-full border border-white/20 text-white hover:bg-white/10 transition-colors';
    const fullCls = 'inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors';

    // Play Store mode (future): a simple link.
    if (PLAY_STORE_URL) {
        return (
            <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className={compact ? compactCls : fullCls} title="Get the app">
                <Download className="w-4 h-4" />
                {!compact && <span className="hidden sm:inline">Get the App</span>}
            </a>
        );
    }

    // Hide entirely once the app is installed / running as a PWA.
    if (installed) return null;

    const onClick = async () => {
        if (deferred) {
            await deferred.prompt();
            await deferred.userChoice;
            setDeferred(null);
        } else {
            // iOS / not-yet-eligible fallback.
            alert('To install: open your browser menu (⋮) and choose "Add to Home screen" / "Install app".');
        }
    };

    return (
        <button type="button" onClick={onClick} className={compact ? compactCls : fullCls} title="Install app">
            <Download className="w-4 h-4" />
            {!compact && <span className="hidden sm:inline">Install App</span>}
        </button>
    );
}
