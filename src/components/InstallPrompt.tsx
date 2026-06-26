'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Shows an "Install app" banner on EVERY visit (until installed). Chrome throttles
// its own native prompt after one dismissal, so we capture the install event and
// drive our own banner — which re-appears each page load while the app isn't installed.
export default function InstallPrompt() {
    const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
    const [visible, setVisible] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Already installed / running as the PWA → never prompt.
        const standalone =
            window.matchMedia('(display-mode: standalone)').matches ||
            (navigator as unknown as { standalone?: boolean }).standalone === true;
        if (standalone) return;

        // iOS Safari doesn't fire beforeinstallprompt → show manual instructions instead.
        const ua = navigator.userAgent;
        const ios = /iphone|ipad|ipod/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
        if (ios) {
            setIsIOS(true);
            setVisible(true);
            return;
        }

        const onPrompt = (e: Event) => {
            e.preventDefault();
            setDeferred(e as BeforeInstallPromptEvent);
            setVisible(true);
        };
        const onInstalled = () => setVisible(false);

        window.addEventListener('beforeinstallprompt', onPrompt);
        window.addEventListener('appinstalled', onInstalled);
        return () => {
            window.removeEventListener('beforeinstallprompt', onPrompt);
            window.removeEventListener('appinstalled', onInstalled);
        };
    }, []);

    if (!visible) return null;

    const install = async () => {
        if (!deferred) return;
        await deferred.prompt();
        await deferred.userChoice;
        // Hide for now; the event re-fires on the next load if still not installed.
        setVisible(false);
        setDeferred(null);
    };

    return (
        <div
            role="dialog"
            aria-label="Install Onlive app"
            style={{
                position: 'fixed',
                left: 12,
                right: 12,
                bottom: 'calc(12px + env(safe-area-inset-bottom))',
                zIndex: 2147483000,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                borderRadius: 16,
                background: '#0a0f1e',
                border: '1px solid rgba(255,255,255,0.12)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.45)',
                maxWidth: 520,
                margin: '0 auto',
                fontFamily: 'system-ui, sans-serif',
            }}
        >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src="/icons/onlive-logo.png"
                alt="Onlive"
                width={44}
                height={44}
                style={{ borderRadius: 10, flexShrink: 0, objectFit: 'contain' }}
            />
            <div style={{ flex: 1, minWidth: 0, color: '#fff' }}>
                <div style={{ fontWeight: 800, fontSize: 14 }}>Install Onlive</div>
                <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.35 }}>
                    {isIOS
                        ? 'Tap the Share icon, then “Add to Home Screen”.'
                        : 'Add it to your home screen for quick, full-screen access.'}
                </div>
            </div>
            {!isIOS && (
                <button
                    type="button"
                    onClick={install}
                    style={{
                        flexShrink: 0,
                        background: '#facc15',
                        color: '#0a0f1e',
                        fontWeight: 800,
                        fontSize: 13,
                        border: 'none',
                        borderRadius: 10,
                        padding: '10px 16px',
                        cursor: 'pointer',
                    }}
                >
                    Install
                </button>
            )}
            <button
                type="button"
                aria-label="Dismiss"
                onClick={() => setVisible(false)}
                style={{
                    flexShrink: 0,
                    background: 'transparent',
                    color: '#94a3b8',
                    border: 'none',
                    fontSize: 20,
                    lineHeight: 1,
                    cursor: 'pointer',
                    padding: 4,
                }}
            >
                ×
            </button>
        </div>
    );
}
