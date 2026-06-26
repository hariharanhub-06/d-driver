import React, { useState } from 'react';
import { View, TextInput, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/theme/ThemeProvider';
import { useT } from '@/lib/i18n';
import { Screen, AppText, Button, Card } from '@/components/ui';

export default function Login() {
    const { login } = useAuth();
    const t = useTheme();
    const tr = useT();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const onSubmit = async () => {
        if (!email.trim() || !password) return;
        setLoading(true);
        setError('');
        try {
            await login(email.trim().toLowerCase(), password);
            // Gate in _layout handles navigation by role.
        } catch (e: any) {
            setError(
                e?.response?.data?.error ||
                    e?.response?.data?.message ||
                    tr('Invalid email or password', 'தவறான மின்னஞ்சல் அல்லது கடவுச்சொல்'),
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
                        source={require('../../../assets/images/Square.png')}
                        style={{ width: 188, height: 188 }}
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
                            {tr('Email', 'மின்னஞ்சல்')}
                        </AppText>
                        <TextInput
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            autoComplete="email"
                            placeholder="you@example.com"
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
                </Card>
            </KeyboardAvoidingView>
        </Screen>
    );
}
