// Shared Razorpay Checkout helpers.
//
// The SDK is loaded on demand rather than in the root layout so it is only fetched on the pages
// that can actually take a payment. Loading is idempotent — the script tag is added once and
// subsequent calls resolve immediately.

let loadPromise: Promise<boolean> | null = null;

export const loadRazorpay = (): Promise<boolean> => {
    if (typeof window === 'undefined') return Promise.resolve(false);
    if ((window as any).Razorpay) return Promise.resolve(true);
    if (loadPromise) return loadPromise;

    loadPromise = new Promise<boolean>(resolve => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        script.onload = () => resolve(true);
        script.onerror = () => { loadPromise = null; resolve(false); };
        document.body.appendChild(script);
    });
    return loadPromise;
};

/** Razorpay key ids are prefixed rzp_live_ / rzp_test_. */
export type RazorpayMode = 'live' | 'test' | 'unknown';

export const keyMode = (keyId?: string | null): RazorpayMode => {
    if (!keyId) return 'unknown';
    if (keyId.startsWith('rzp_live_')) return 'live';
    if (keyId.startsWith('rzp_test_')) return 'test';
    return 'unknown';
};

export const isLiveKey = (keyId?: string | null) => keyMode(keyId) === 'live';

/**
 * Confirm before charging a real card. Returns true when it is safe to proceed.
 * Live mode moves actual money, so make that unmistakable rather than letting someone
 * "just test" against production keys.
 */
export const confirmLivePayment = (keyId: string | null | undefined, amountRupees: number): boolean => {
    if (!isLiveKey(keyId)) return true;
    const amount = amountRupees.toLocaleString('en-IN', { maximumFractionDigits: 2 });
    return window.confirm(
        `LIVE payment — this will charge ₹${amount} for real.\n\nContinue?`
    );
};
