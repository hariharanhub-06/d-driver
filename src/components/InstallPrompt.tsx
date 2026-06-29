'use client';

import { useEffect, useState } from 'react';
import { usePWAInstall } from '@/context/PWAInstallContext';

const SHOWN_KEY = 'onlive_install_prompt_at';
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

// Auto-shows the install banner at most ONCE per ~month (and on the very first visit).
// Users can still install any time from the header download icon (InstallButton).
export default function InstallPrompt() {
    const { canInstall, isIOS, promptInstall } = usePWAInstall();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!canInstall) return;
        let lastShown = 0;
        try { lastShown = Number(localStorage.getItem(SHOWN_KEY)) || 0; } catch { /* ignore */ }
        if (Date.now() - lastShown < MONTH_MS) return; // already shown this month
        setVisible(true);
        try { localStorage.setItem(SHOWN_KEY, String(Date.now())); } catch { /* ignore */ }
    }, [canInstall]);

    if (!visible) return null;

    const install = async () => {
        await promptInstall();
        setVisible(false);
    };

    return (
        <div
            role="dialog"
            aria-label="Install Onlive app"
            style={{
                position: 'fixed', left: 12, right: 12,
                bottom: 'calc(12px + env(safe-area-inset-bottom))',
                zIndex: 2147483000, display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 16, background: '#0a0f1e',
                border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 10px 30px rgba(0,0,0,0.45)',
                maxWidth: 520, margin: '0 auto', fontFamily: 'system-ui, sans-serif',
            }}
        >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/onlive-logo.png" alt="Onlive" width={44} height={44}
                style={{ borderRadius: 10, flexShrink: 0, objectFit: 'contain' }} />
            <div style={{ flex: 1, minWidth: 0, color: '#fff' }}>
                <div style={{ fontWeight: 800, fontSize: 14 }}>Install Onlive</div>
                <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.35 }}>
                    {isIOS
                        ? 'Tap the Share icon, then “Add to Home Screen”.'
                        : 'Add it to your home screen for quick, full-screen access.'}
                </div>
            </div>
            {!isIOS && (
                <button type="button" onClick={install}
                    style={{ flexShrink: 0, background: '#facc15', color: '#0a0f1e', fontWeight: 800,
                        fontSize: 13, border: 'none', borderRadius: 10, padding: '10px 16px', cursor: 'pointer' }}>
                    Install
                </button>
            )}
            <button type="button" aria-label="Dismiss" onClick={() => setVisible(false)}
                style={{ flexShrink: 0, background: 'transparent', color: '#94a3b8', border: 'none',
                    fontSize: 20, lineHeight: 1, cursor: 'pointer', padding: 4 }}>
                ×
            </button>
        </div>
    );
}
