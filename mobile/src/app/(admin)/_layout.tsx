import React from 'react';
import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { useT, useLang } from '@/lib/i18n';
import { fontFamily } from '@/theme/fonts';
import { usePushRegistration } from '@/lib/push';

export default function AdminLayout() {
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
            <Tabs.Screen name="today" options={{ title: tr('Today', 'இன்று'), tabBarIcon: ({ color, size }) => <Feather name="bar-chart-2" color={color} size={size} /> }} />
            <Tabs.Screen name="fleet" options={{ title: tr('Fleet', 'பேருந்துகள்'), tabBarIcon: ({ color, size }) => <Feather name="map" color={color} size={size} /> }} />
            <Tabs.Screen name="manage" options={{ title: tr('Manage', 'நிர்வாகம்'), tabBarIcon: ({ color, size }) => <Feather name="grid" color={color} size={size} /> }} />
            <Tabs.Screen name="approvals" options={{ title: tr('Approvals', 'ஒப்புதல்கள்'), tabBarIcon: ({ color, size }) => <Feather name="inbox" color={color} size={size} /> }} />
            <Tabs.Screen name="profile" options={{ title: tr('Profile', 'சுயவிவரம்'), tabBarIcon: ({ color, size }) => <Feather name="user" color={color} size={size} /> }} />
            <Tabs.Screen name="index" options={{ href: null }} />
        </Tabs>
    );
}
