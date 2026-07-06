import React, { useState } from 'react';
import { View, TextInput, KeyboardAvoidingView, Platform, Image, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/theme/ThemeProvider';
import { useT } from '@/lib/i18n';
import { Screen, AppText, Button, Card } from '@/components/ui';

export default function Login() {
    const { login } = useAuth();
    const t = useTheme();
    const tr = useT();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const onSubmit = async () => {
        if (!email.trim() || !password) return;
        setLoading(true);
        setError('');
        try {
            // Lowercase only emails; a mobile number is passed through unchanged.
            const raw = email.trim();
            const identifier = raw.includes('@') ? raw.toLowerCase() : raw;
            await login(identifier, password);
            // Gate in _layout handles navigation by role.
        } catch (e: any) {
            setError(
                e?.response?.data?.error ||
                    e?.response?.data?.message ||
                    tr('Invalid email/mobile or password', 'தவறான மின்னஞ்சல்/மொபைல் அல்லது கடவுச்சொல்'),
            );
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = {
        backgroundColor: t.color.surfaceAlt,
        borderRadius: t.radius.md,
        borderWidth: 1,
        borderColor: t.color.border,
        paddingHorizontal: t.spacing.md,
        paddingVertical: 14,
        color: t.color.text,
        fontSize: t.font.md,
    } as const;

    return (
        <Screen>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1, justifyContent: 'center', gap: t.spacing.lg }}
            >
                <View style={{ alignItems: 'center', gap: t.spacing.sm, marginBottom: t.spacing.lg }}>
                    <Image
                        source={require('../../../assets/images/onlive-logo.png')}
                        style={{ width: 220, height: 120 }}
                        resizeMode="contain"
                    />
                    <AppText muted>{tr('Sign in to continue', 'தொடர உள்நுழையவும்')}</AppText>
                </View>

                <Card style={{ gap: t.spacing.md }}>
                    {error ? (
                        <View
                            style={{
                                backgroundColor: t.color.danger + '18',
                                borderRadius: t.radius.md,
                                padding: t.spacing.md,
                            }}
                        >
                            <AppText color={t.color.danger} size="sm" weight="600">
                                {error}
                            </AppText>
                        </View>
                    ) : null}

                    <View style={{ gap: 6 }}>
                        <AppText size="sm" muted weight="600">
                            {tr('Email or Mobile', 'மின்னஞ்சல் / மொபைல்')}
                        </AppText>
                        <TextInput
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="default"
                            autoComplete="username"
                            placeholder={tr('you@example.com or 9876543210', 'you@example.com / 9876543210')}
                            placeholderTextColor={t.color.textMuted}
                            style={inputStyle}
                        />
                    </View>

                    <View style={{ gap: 6 }}>
                        <AppText size="sm" muted weight="600">
                            {tr('Password', 'கடவுச்சொல்')}
                        </AppText>
                        <TextInput
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            autoComplete="password"
                            placeholder="••••••••"
                            placeholderTextColor={t.color.textMuted}
                            style={inputStyle}
                            onSubmitEditing={onSubmit}
                            returnKeyType="go"
                        />
                    </View>

                    <Button
                        title={tr('Sign In', 'உள்நுழை')}
                        onPress={onSubmit}
                        loading={loading}
                        disabled={!email.trim() || !password}
                        style={{ marginTop: t.spacing.sm }}
                    />

                    <Pressable onPress={() => router.push('/(auth)/forgot-password' as any)} style={{ alignSelf: 'center', paddingVertical: 4 }}>
                        <AppText size="sm" weight="600" color={t.color.brand}>
                            {tr('Forgot password?', 'கடவுச்சொல் மறந்துவிட்டதா?')}
                        </AppText>
                    </Pressable>
                </Card>
            </KeyboardAvoidingView>
        </Screen>
    );
}
