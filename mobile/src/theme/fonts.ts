// Tamil-aware font selection. English uses the platform's native font (best
// look); Tamil / bilingual modes use bundled Noto Sans Tamil (covers Latin +
// Tamil) so glyphs never render as boxes. Returns undefined for English so the
// system font applies.
import type { Lang } from '@/lib/i18n';

export function fontFamily(weight: any, lang: Lang): string | undefined {
    if (lang === 'en') return undefined;
    const w = typeof weight === 'string'
        ? (weight === 'bold' ? 700 : parseInt(weight, 10) || 400)
        : (typeof weight === 'number' ? weight : 400);
    return w >= 600 ? 'NotoSansTamil_700Bold' : 'NotoSansTamil_400Regular';
}
