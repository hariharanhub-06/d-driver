import React from 'react';
import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { useT, useLang } from '@/lib/i18n';
import { fontFamily } from '@/theme/fonts';
import { usePushRegistration } from '@/lib/push';

export default function DriverLayout() {
    const t = useTheme();
    const tr = useT();
    const { lang } = useLang();
    usePushRegistration(true);
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: t.color.brand,
                tabBarInactiveTintColor: t.color.textMuted,
                tabBarStyle: { backgroundColor: t.color.surface, borderTopColor: t.color.border },
                tabBarLabelStyle: { fontFamily: fontFamily('600', lang) },
            }}
        >
            <Tabs.Screen
                name="dashboard"
                options={{ title: tr('My Trip', 'பயணம்'), tabBarIcon: ({ color, size }) => <Feather name="navigation" color={color} size={size} /> }}
            />
            <Tabs.Screen
                name="attendance"
                options={{ title: tr('Students', 'மாணவர்கள்'), tabBarIcon: ({ color, size }) => <Feather name="check-square" color={color} size={size} /> }}
            />
            <Tabs.Screen
                name="more"
                options={{ title: tr('More', 'மேலும்'), tabBarIcon: ({ color, size }) => <Feather name="grid" color={color} size={size} /> }}
            />
            <Tabs.Screen
                name="profile"
                options={{ title: tr('Profile', 'சுயவிவரம்'), tabBarIcon: ({ color, size }) => <Feather name="user" color={color} size={size} /> }}
            />
            {/* Full-screen ride — not a tab, hide the bar while on it. */}
            <Tabs.Screen name="ride" options={{ href: null, tabBarStyle: { display: 'none' } }} />
            {/* Redirect index → dashboard */}
            <Tabs.Screen name="index" options={{ href: null }} />
        </Tabs>
    );
}
