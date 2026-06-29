'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { usePWAInstall } from '@/context/PWAInstallContext';

// Small "install app" icon for the role headers. Shows only when an install path exists
// (and the app isn't already installed). On iOS it shows the manual Add-to-Home-Screen hint.
export default function InstallButton({ className = '' }: { className?: string }) {
    const { canInstall, isIOS, promptInstall } = usePWAInstall();
    const [showHint, setShowHint] = useState(false);

    if (!canInstall) return null;

    const onClick = () => {
        if (isIOS) { setShowHint(true); setTimeout(() => setShowHint(false), 5000); return; }
        promptInstall();
    };

    return (
        <div className="relative">
            <button
                onClick={onClick}
                title="Install app"
                aria-label="Install app"
                className={`w-9 h-9 flex items-center justify-center rounded-xl text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors ${className}`}
            >
                <Download size={19} />
            </button>
            {showHint && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-slate-900 text-white text-xs rounded-xl p-3 shadow-xl z-[200]">
                    Tap the <b>Share</b> icon in your browser, then <b>“Add to Home Screen”</b>.
                </div>
            )}
        </div>
    );
}
