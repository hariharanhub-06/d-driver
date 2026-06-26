// Token-based theme. Ingests the school's primary_color at runtime + light/dark.
import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { DEFAULT_BRAND } from '@/lib/config';

export interface Theme {
    scheme: 'light' | 'dark';
    color: {
        brand: string;
        brandText: string; // readable text on brand (luminance-aware)
        bg: string;
        surface: string;
        surfaceAlt: string;
        border: string;
        text: string;
        textMuted: string;
        success: string;
        warning: string;
        danger: string;
    };
    spacing: { xs: number; sm: number; md: number; lg: number; xl: number; xxl: number };
    radius: { sm: number; md: number; lg: number; pill: number };
    font: { sm: number; md: number; lg: number; xl: number; xxl: number };
}

// Relative luminance → pick black/white text for contrast on the brand colour.
function readableOn(hex: string): string {
    const c = hex.replace('#', '');
    if (c.length < 6) return '#ffffff';
    const r = parseInt(c.slice(0, 2), 16) / 255;
    const g = parseInt(c.slice(2, 4), 16) / 255;
    const b = parseInt(c.slice(4, 6), 16) / 255;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return lum > 0.6 ? '#0b2018' : '#ffffff';
}

function buildTheme(scheme: 'light' | 'dark', brand: string): Theme {
    const dark = scheme === 'dark';
    return {
        scheme,
        color: {
            brand,
            brandText: readableOn(brand),
            bg: dark ? '#0f172a' : '#f1f5f9',
            surface: dark ? '#1e293b' : '#ffffff',
            surfaceAlt: dark ? '#334155' : '#f8fafc',
            border: dark ? '#334155' : '#e2e8f0',
            text: dark ? '#f8fafc' : '#0f172a',
            textMuted: dark ? '#94a3b8' : '#64748b',
            success: '#10b981',
            warning: '#f59e0b',
            danger: '#ef4444',
        },
        spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
        radius: { sm: 8, md: 12, lg: 16, pill: 999 },
        font: { sm: 13, md: 15, lg: 18, xl: 22, xxl: 28 },
    };
}

const ThemeContext = createContext<Theme>(buildTheme('light', DEFAULT_BRAND));

export function ThemeProvider({ brand, children }: { brand?: string; children: React.ReactNode }) {
    const scheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
    const theme = useMemo(() => buildTheme(scheme, brand || DEFAULT_BRAND), [scheme, brand]);
    return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
