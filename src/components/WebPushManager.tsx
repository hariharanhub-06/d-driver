'use client';

import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

// Converts the server's base64url VAPID public key into the Uint8Array that
// PushManager.subscribe() requires as applicationServerKey.
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    const output = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
    return output;
}

/**
 * For a logged-in user, requests Notification permission (once) and registers a
 * Web Push subscription with the backend, so SOS + alerts arrive as OS notifications
 * even when the tab/PWA is closed. No-op in dev (no SW), if unsupported, or if the
 * user has denied permission. Mounted once in the root layout.
 */
export default function WebPushManager() {
    const { user } = useAuth();

    useEffect(() => {
        if (!user) return;
        if (process.env.NODE_ENV !== 'production') return; // SW only registered in prod
        if (typeof window === 'undefined') return;
        if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return;

        let cancelled = false;

        const subscribe = async () => {
            try {
                // Respect a prior "Block" — never re-nag.
                if (Notification.permission === 'denied') return;
                if (Notification.permission === 'default') {
                    const perm = await Notification.requestPermission();
                    if (perm !== 'granted') return;
                }

                const reg = await navigator.serviceWorker.ready;
                if (cancelled) return;

                const { data } = await api.get('/notifications/vapid-public-key');
                const publicKey: string | null = data?.publicKey;
                if (!publicKey) return; // web push not configured on the server yet

                let sub = await reg.pushManager.getSubscription();
                if (!sub) {
                    sub = await reg.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
                    });
                }
                if (cancelled) return;

                // sub.toJSON() → { endpoint, expirationTime, keys: { p256dh, auth } }
                await api.post('/notifications/web-push/subscribe', sub.toJSON());
            } catch {
                /* non-fatal — the user simply won't receive web push */
            }
        };

        subscribe();
        return () => { cancelled = true; };
    }, [user]);

    return null;
}
