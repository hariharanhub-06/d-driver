// Reads the central kill-switch from the Harish hub. Fails OPEN: any error,
// timeout, or non-200 response means the site is treated as enabled, so a hub
// outage never takes the real site down.

const HUB_URL = process.env.HARISH_HUB_URL ?? "https://hariharanhub.com";

export async function getSiteEnabled(key: "startup" | "ddriver"): Promise<boolean> {
    try {
        const res = await fetch(`${HUB_URL}/api/hub/site-status`, {
            // Cache for ~30s across requests so we don't fetch on every render.
            next: { revalidate: 30 },
            signal: AbortSignal.timeout(2500),
        });
        if (!res.ok) return true;
        const data = await res.json();
        // Only an explicit `false` disables the site.
        return data?.[key] !== false;
    } catch {
        return true;
    }
}
