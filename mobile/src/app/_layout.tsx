import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts, NotoSansTamil_400Regular, NotoSansTamil_700Bold } from '@expo-google-fonts/noto-sans-tamil';

import { queryClient } from '@/lib/queryClient';
import { warmUpServer } from '@/lib/api';
import { LanguageProvider } from '@/lib/i18n';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { BrandingProvider, useBranding } from '@/context/BrandingContext';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { Loader } from '@/components/ui';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function RootLayout() {
    // Bundle Tamil glyphs so 'ta'/'both' modes never render as boxes.
    const [fontsLoaded] = useFonts({ NotoSansTamil_400Regular, NotoSansTamil_700Bold });

    // Wake a sleeping backend (Render free tier) as early as possible.
    useEffect(() => { warmUpServer(); }, []);

    if (!fontsLoaded) return null; // brief; splash stays up

    return (
        <ErrorBoundary>
            <GestureHandlerRootView style={{ flex: 1 }}>
                <SafeAreaProvider>
                    <QueryClientProvider client={queryClient}>
                        <LanguageProvider>
                            <AuthProvider>
                                <BrandingProvider>
                                    <ThemedRoot />
                                </BrandingProvider>
                            </AuthProvider>
                        </LanguageProvider>
                    </QueryClientProvider>
                </SafeAreaProvider>
            </GestureHandlerRootView>
        </ErrorBoundary>
    );
}

function ThemedRoot() {
    const branding = useBranding();
    return (
        <ThemeProvider brand={branding.primary_color}>
            <Gate />
        </ThemeProvider>
    );
}

// Imperative auth + role gate (the lowest-risk expo-router pattern).
function Gate() {
    const { user, loading, firstLogin } = useAuth();
    const segments = useSegments();
    const router = useRouter();
    const t = useTheme();

    useEffect(() => {
        if (loading) return;
        const segs = segments as string[];
        const group = segs[0];

        if (!user) {
            if (group !== '(auth)') router.replace('/(auth)/login' as any);
            return;
        }
        if (firstLogin) {
            // Force change-password unless we're already there.
            if (!(group === '(auth)' && segs[1] === 'change-password')) router.replace('/(auth)/change-password' as any);
            return;
        }
        // Roles with a built mobile experience → their group; everyone else (admin,
        // super-admin, not-yet-built roles) → the "use the web console" screen.
        // super_admin / is_dev_sa stay on the web console (no app); admin gets admin-lite.
        const roleGroup: Record<string, string> = {
            parent: '(parent)',
            driver: '(driver)',
            bus_staff: '(bus-staff)',
            admin: '(admin)',
            super_admin: '(super-admin)',
        };
        const role = user.is_dev_sa ? 'super_admin' : user.role;
        const target = roleGroup[role];
        if (!target) {
            if (group !== '(misc)') router.replace('/(misc)/unsupported' as any);
            return;
        }
        if (group !== target) router.replace(`/${target}` as any);
    }, [user, loading, firstLogin, segments, router]);

    return (
        <>
            <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
            {loading ? (
                <Loader label="Loading…" />
            ) : (
                <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.color.bg } }} />
            )}
        </>
    );
}
