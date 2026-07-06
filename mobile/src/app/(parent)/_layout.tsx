import React from 'react';
import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { useT, useLang } from '@/lib/i18n';
import { fontFamily } from '@/theme/fonts';
import { usePushRegistration } from '@/lib/push';

export default function ParentLayout() {
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
                tabBarStyle: {
                    backgroundColor: t.color.surface,
                    borderTopColor: t.color.border,
                },
                tabBarLabelStyle: { fontFamily: fontFamily('600', lang) },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: tr('Home', 'முகப்பு'),
                    tabBarIcon: ({ color, size }) => <Feather name="home" color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="tracking"
                options={{
                    title: tr('Track', 'கண்காணி'),
                    tabBarIcon: ({ color, size }) => <Feather name="map-pin" color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="passport"
                options={{
                    title: tr('Passport', 'பாஸ்போர்ட்'),
                    tabBarIcon: ({ color, size }) => <Feather name="credit-card" color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="more"
                options={{
                    title: tr('More', 'மேலும்'),
                    tabBarIcon: ({ color, size }) => <Feather name="grid" color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: tr('Profile', 'சுயவிவரம்'),
                    tabBarIcon: ({ color, size }) => <Feather name="user" color={color} size={size} />,
                }}
            />
        </Tabs>
    );
}
