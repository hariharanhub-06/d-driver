// Namespaced auth storage.
//
// Normally (no namespace) this is a thin pass-through to localStorage, so real users are
// completely unaffected — keys stay 'access_token' / 'refresh_token' / 'user'.
//
// The /qa multi-login test page loads four iframes of /login?ns=qa1..qa4. When a `ns`
// is present the auth keys are prefixed (`ns_qa1_access_token`, …) so each frame keeps an
// independent session even though same-origin frames share one localStorage.
//
// The namespace is resolved ONCE per browsing context (iframe) and persisted in
// `window.name`, which is per-context and survives reloads + Next.js client-side
// navigations (so it sticks after /login?ns=qa1 routes to /admin/dashboard).

function resolveNamespace(): string {
    if (typeof window === 'undefined') return '';
    try {
        const urlNs = new URLSearchParams(window.location.search).get('ns');
        if (urlNs) {
            window.name = `ns:${urlNs}`;
            return urlNs;
        }
        if (window.name && window.name.startsWith('ns:')) {
            return window.name.slice(3);
        }
    } catch {
        // Accessing window.name/search can throw in exotic sandboxes — fall back to no namespace.
    }
    return '';
}

const NS = resolveNamespace();

const realKey = (key: string) => (NS ? `ns_${NS}_${key}` : key);

export const authStorage = {
    namespace: NS,
    get(key: string): string | null {
        if (typeof window === 'undefined') return null;
        try { return localStorage.getItem(realKey(key)); } catch { return null; }
    },
    set(key: string, value: string): void {
        if (typeof window === 'undefined') return;
        try { localStorage.setItem(realKey(key), value); } catch { /* ignore quota/security errors */ }
    },
    remove(key: string): void {
        if (typeof window === 'undefined') return;
        try { localStorage.removeItem(realKey(key)); } catch { /* ignore */ }
    },
};
