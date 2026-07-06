import React, { useState } from 'react';
import { View, TextInput, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { forgotPasswordRequest } from '@/lib/api';
import { useTheme } from '@/theme/ThemeProvider';
import { useT } from '@/lib/i18n';
import { Screen, AppText, Button, Card } from '@/components/ui';

export default function ForgotPassword() {
    const t = useTheme();
    const tr = useT();
    const router = useRouter();
    const [method, setMethod] = useState<'email' | 'mobile'>('email');
    const [value, setValue] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    const onSubmit = async () => {
        if (!value.trim()) return;
        setLoading(true);
        setError('');
        try {
            await forgotPasswordRequest(value.trim(), method);
            setSent(true);
        } catch (e: any) {
            setError(e?.response?.data?.error || tr('Something went wrong', 'ஏதோ தவறு நடந்தது'));
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = {
        backgroundColor: t.color.surfaceAlt, borderRadius: t.radius.md, borderWidth: 1,
        borderColor: t.color.border, paddingHorizontal: t.spacing.md, paddingVertical: 14,
        color: t.color.text, fontSize: t.font.md,
    } as const;

    return (
        <Screen>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'center', gap: t.spacing.lg }}>
                <View style={{ alignItems: 'center', gap: 6, marginBottom: t.spacing.md }}>
                    <AppText size="xl" weight="800">{tr('Reset password', 'கடவுச்சொல்லை மீட்டமை')}</AppText>
                    <AppText muted size="sm" style={{ textAlign: 'center' }}>
                        {tr("We'll email a reset link — even if you use your mobile number.", 'மொபைல் எண் கொடுத்தாலும் மின்னஞ்சலில் இணைப்பு அனுப்பப்படும்.')}
                    </AppText>
                </View>

                <Card style={{ gap: t.spacing.md }}>
                    {sent ? (
                        <View style={{ alignItems: 'center', gap: 10, paddingVertical: t.spacing.md }}>
                            <Feather name="check-circle" size={40} color={t.color.success} />
                            <AppText weight="700">{tr('Check your email', 'உங்கள் மின்னஞ்சலைப் பார்க்கவும்')}</AppText>
                            <AppText muted size="sm" style={{ textAlign: 'center' }}>
                                {tr('If an account matches, a reset link was sent to the registered email. It expires in 1 hour.', 'கணக்கு பொருந்தினால், பதிவு செய்யப்பட்ட மின்னஞ்சலுக்கு இணைப்பு அனுப்பப்பட்டது. 1 மணி நேரத்தில் காலாவதியாகும்.')}
                            </AppText>
                            <Button title={tr('Back to sign in', 'உள்நுழைவுக்குத் திரும்பு')} variant="ghost" onPress={() => router.replace('/(auth)/login' as any)} />
                        </View>
                    ) : (
                        <>
                            {error ? (
                                <View style={{ backgroundColor: t.color.danger + '18', borderRadius: t.radius.md, padding: t.spacing.md }}>
                                    <AppText color={t.color.danger} size="sm" weight="600">{error}</AppText>
                                </View>
                            ) : null}

                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                {(['email', 'mobile'] as const).map(m => {
                                    const active = method === m;
                                    return (
                                        <Pressable
                                            key={m}
                                            onPress={() => { setMethod(m); setValue(''); setError(''); }}
                                            style={{
                                                flex: 1, paddingVertical: 12, borderRadius: t.radius.md, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6,
                                                backgroundColor: active ? t.color.brand : t.color.surface,
                                                borderWidth: 1, borderColor: active ? t.color.brand : t.color.border,
                                            }}
                                        >
                                            <Feather name={m === 'email' ? 'mail' : 'smartphone'} size={15} color={active ? t.color.brandText : t.color.text} />
                                            <AppText weight="700" color={active ? t.color.brandText : t.color.text}>
                                                {m === 'email' ? tr('Email', 'மின்னஞ்சல்') : tr('Mobile', 'மொபைல்')}
                                            </AppText>
                                        </Pressable>
                                    );
                                })}
                            </View>

                            <View style={{ gap: 6 }}>
                                <AppText size="sm" muted weight="600">
                                    {method === 'mobile' ? tr('Mobile Number', 'மொபைல் எண்') : tr('Email Address', 'மின்னஞ்சல் முகவரி')}
                                </AppText>
                                <TextInput
                                    value={value}
                                    onChangeText={setValue}
                                    autoCapitalize="none"
                                    keyboardType={method === 'mobile' ? 'phone-pad' : 'email-address'}
                                    placeholder={method === 'mobile' ? '9876543210' : 'you@example.com'}
                                    placeholderTextColor={t.color.textMuted}
                                    style={inputStyle}
                                    onSubmitEditing={onSubmit}
                                    returnKeyType="go"
                                />
                            </View>

                            <Button title={tr('Send reset link', 'இணைப்பை அனுப்பு')} onPress={onSubmit} loading={loading} disabled={!value.trim()} style={{ marginTop: t.spacing.sm }} />
                            <Pressable onPress={() => router.replace('/(auth)/login' as any)} style={{ alignSelf: 'center', paddingVertical: 4 }}>
                                <AppText size="sm" weight="600" color={t.color.brand}>{tr('Back to sign in', 'உள்நுழைவுக்குத் திரும்பு')}</AppText>
                            </Pressable>
                        </>
                    )}
                </Card>
            </KeyboardAvoidingView>
        </Screen>
    );
}
