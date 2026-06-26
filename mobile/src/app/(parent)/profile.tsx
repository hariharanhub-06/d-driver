import React from 'react';
import { View, Pressable, Alert, Linking } from 'react-native';
import { Feather } from '@expo/vector-icons';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/theme/ThemeProvider';
import { useT, useLang, type Lang } from '@/lib/i18n';
import { WEB_CONSOLE_URL } from '@/lib/config';
import { Screen, AppText, Card, Button, InfoRow } from '@/components/ui';

export default function Profile() {
    const { user, logout } = useAuth();
    const t = useTheme();
    const tr = useT();
    const { lang, setLang } = useLang();

    const confirmDelete = () => {
        Alert.alert(
            tr('Delete account', 'கணக்கை நீக்கு'),
            tr('This permanently deletes your account and data. This cannot be undone.', 'இது உங்கள் கணக்கையும் தரவையும் நிரந்தரமாக நீக்கும். இதை மீட்டெடுக்க முடியாது.'),
            [
                { text: tr('Cancel', 'ரத்து'), style: 'cancel' },
                {
                    text: tr('Delete', 'நீக்கு'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.delete('/users/me');
                        } catch {
                            /* endpoint may be pending — still clear local session */
                        }
                        await logout();
                    },
                },
            ],
        );
    };

    const langs: { key: Lang; label: string }[] = [
        { key: 'en', label: 'EN' },
        { key: 'ta', label: 'தமிழ்' },
        { key: 'both', label: 'Both' },
    ];

    return (
        <Screen scroll>
            <View style={{ alignItems: 'center', gap: 8, marginTop: t.spacing.lg }}>
                <View
                    style={{
                        width: 72,
                        height: 72,
                        borderRadius: 36,
                        backgroundColor: t.color.brand,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <AppText size="xxl" weight="800" color={t.color.brandText}>
                        {(user?.name || 'P').charAt(0).toUpperCase()}
                    </AppText>
                </View>
                <AppText size="lg" weight="800">
                    {user?.name}
                </AppText>
                {user?.email ? <AppText muted size="sm">{user.email}</AppText> : null}
            </View>

            {/* Language */}
            <Card style={{ gap: 10 }}>
                <AppText weight="700">{tr('Language', 'மொழி')}</AppText>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    {langs.map((l) => {
                        const active = lang === l.key;
                        return (
                            <Pressable
                                key={l.key}
                                onPress={() => setLang(l.key)}
                                style={{
                                    flex: 1,
                                    paddingVertical: 10,
                                    borderRadius: t.radius.md,
                                    alignItems: 'center',
                                    backgroundColor: active ? t.color.brand : t.color.surfaceAlt,
                                    borderWidth: 1,
                                    borderColor: active ? t.color.brand : t.color.border,
                                }}
                            >
                                <AppText weight="700" size="sm" color={active ? t.color.brandText : t.color.text}>
                                    {l.label}
                                </AppText>
                            </Pressable>
                        );
                    })}
                </View>
            </Card>

            {/* Account */}
            <Card style={{ gap: 0 }}>
                <Pressable onPress={() => Linking.openURL(`${WEB_CONSOLE_URL}/privacy`)}>
                    <InfoRow icon={<Feather name="shield" size={16} color={t.color.textMuted} />} label={tr('Legal', 'சட்டம்')} value={tr('Privacy Policy', 'தனியுரிமைக் கொள்கை')} action={<Feather name="external-link" size={16} color={t.color.textMuted} />} />
                </Pressable>
                <Pressable onPress={confirmDelete}>
                    <InfoRow icon={<Feather name="trash-2" size={16} color={t.color.danger} />} label={tr('Account', 'கணக்கு')} value={tr('Delete account', 'கணக்கை நீக்கு')} action={<Feather name="chevron-right" size={16} color={t.color.danger} />} />
                </Pressable>
            </Card>

            <Button title={tr('Log out', 'வெளியேறு')} variant="secondary" icon={<Feather name="log-out" size={16} color={t.color.text} />} onPress={logout} />
        </Screen>
    );
}
