import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { fontFamily } from '@/theme/fonts';
import { useLang } from '@/lib/i18n';

export default function DriverMoreStack() {
    const t = useTheme();
    const { lang } = useLang();
    return (
        <Stack
            screenOptions={{
                headerStyle: { backgroundColor: t.color.surface },
                headerTintColor: t.color.text,
                headerTitleStyle: { fontFamily: fontFamily('700', lang) },
                contentStyle: { backgroundColor: t.color.bg },
                headerShadowVisible: false,
            }}
        />
    );
}
