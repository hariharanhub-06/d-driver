import React from 'react';
import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { useT, useLang } from '@/lib/i18n';
import { fontFamily } from '@/theme/fonts';
import { usePushRegistration } from '@/lib/push';

export default function SuperAdminLayout() {
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
            <Tabs.Screen name="index" options={{ title: tr('Dashboard', 'டாஷ்போர்டு'), tabBarIcon: ({ color, size }) => <Feather name="grid" color={color} size={size} /> }} />
            <Tabs.Screen name="schools" options={{ title: tr('Schools', 'பள்ளிகள்'), tabBarIcon: ({ color, size }) => <Feather name="home" color={color} size={size} /> }} />
            <Tabs.Screen name="manage" options={{ title: tr('Manage', 'நிர்வாகம்'), tabBarIcon: ({ color, size }) => <Feather name="grid" color={color} size={size} /> }} />
            <Tabs.Screen name="profile" options={{ title: tr('Profile', 'சுயவிவரம்'), tabBarIcon: ({ color, size }) => <Feather name="user" color={color} size={size} /> }} />
        </Tabs>
    );
}
