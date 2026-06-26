import React, { useState } from 'react';
import { View, TextInput } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/theme/ThemeProvider';
import { useT } from '@/lib/i18n';
import { changePassword } from '@/lib/api';
import { connectSocket, joinParentRooms } from '@/lib/socket';
import { Screen, AppText, Button, Card } from '@/components/ui';

export default function ChangePassword() {
    const { user, clearFirstLogin, logout } = useAuth();
    const t = useTheme();
    const tr = useT();
    const [current, setCurrent] = useState('');
    const [next, setNext] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const onSubmit = async () => {
        setError('');
        if (next.length < 6) return setError(tr('Password must be at least 6 characters', 'கடவுச்சொல் குறைந்தது 6 எழுத்துகள் இருக்க வேண்டும்'));
        if (next !== confirm) return setError(tr('Passwords do not match', 'கடவுச்சொற்கள் பொருந்தவில்லை'));
        setLoading(true);
        try {
            await changePassword(current, next);
            clearFirstLogin();
            // Connect realtime now that the account is unlocked.
            if (user?.role === 'parent') {
                await connectSocket();
                joinParentRooms(user.id, user.school_id);
            }
        } catch (e: any) {
            setError(e?.response?.data?.error || tr('Could not change password', 'கடவுச்சொல்லை மாற்ற முடியவில்லை'));
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
        <Screen scroll>
            <View style={{ gap: t.spacing.xs, marginTop: t.spacing.xl }}>
                <AppText size="xl" weight="800">
                    {tr('Set a new password', 'புதிய கடவுச்சொல்லை அமைக்கவும்')}
                </AppText>
                <AppText muted>
                    {tr('For your security, please change your password before continuing.', 'உங்கள் பாதுகாப்பிற்காக, தொடரும் முன் கடவுச்சொல்லை மாற்றவும்.')}
                </AppText>
            </View>

            <Card style={{ gap: t.spacing.md, marginTop: t.spacing.lg }}>
                {error ? (
                    <View style={{ backgroundColor: t.color.danger + '18', borderRadius: t.radius.md, padding: t.spacing.md }}>
                        <AppText color={t.color.danger} size="sm" weight="600">
                            {error}
                        </AppText>
                    </View>
                ) : null}

                <TextInput value={current} onChangeText={setCurrent} secureTextEntry placeholder={tr('Current password', 'தற்போதைய கடவுச்சொல்')} placeholderTextColor={t.color.textMuted} style={inputStyle} />
                <TextInput value={next} onChangeText={setNext} secureTextEntry placeholder={tr('New password', 'புதிய கடவுச்சொல்')} placeholderTextColor={t.color.textMuted} style={inputStyle} />
                <TextInput value={confirm} onChangeText={setConfirm} secureTextEntry placeholder={tr('Confirm new password', 'புதிய கடவுச்சொல்லை உறுதிப்படுத்தவும்')} placeholderTextColor={t.color.textMuted} style={inputStyle} />

                <Button title={tr('Update Password', 'கடவுச்சொல்லை புதுப்பி')} onPress={onSubmit} loading={loading} disabled={!current || !next || !confirm} style={{ marginTop: t.spacing.sm }} />
                <Button title={tr('Log out', 'வெளியேறு')} variant="ghost" onPress={logout} />
            </Card>
        </Screen>
    );
}
