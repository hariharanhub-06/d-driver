import React, { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useT } from '@/lib/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen, AppText, Button, Card, Loader, Badge } from '@/components/ui';
import { Field } from '@/components/form';

interface SchoolInfo {
    name?: string;
    address?: string;
    phone?: string;
    email_contact?: string;
    notification_email?: string;
    razorpay_configured?: boolean;
}

export default function ManageSettingsScreen() {
    const tr = useT();
    const t = useTheme();
    const qc = useQueryClient();

    const schoolQ = useQuery({
        queryKey: ['admin-school'],
        queryFn: async () => (await api.get('/schools/my')).data as SchoolInfo,
    });

    const [info, setInfo] = useState({ name: '', address: '', phone: '', email_contact: '', notification_email: '' });
    const [rzp, setRzp] = useState({ key_id: '', key_secret: '' });
    const [savingInfo, setSavingInfo] = useState(false);
    const [savingRzp, setSavingRzp] = useState(false);

    useEffect(() => {
        const d = schoolQ.data;
        if (d) {
            setInfo({
                name: d.name || '',
                address: d.address || '',
                phone: d.phone || '',
                email_contact: d.email_contact || '',
                notification_email: d.notification_email || '',
            });
        }
    }, [schoolQ.data]);

    const saveInfo = async () => {
        if (!info.name.trim()) {
            Alert.alert(tr('School name is required', 'பள்ளி பெயர் தேவை'));
            return;
        }
        setSavingInfo(true);
        try {
            await api.put('/schools/my', info);
            qc.invalidateQueries({ queryKey: ['admin-school'] });
            Alert.alert(tr('Saved', 'சேமிக்கப்பட்டது'), tr('School information updated.', 'பள்ளி தகவல் புதுப்பிக்கப்பட்டது.'));
        } catch (e: any) {
            Alert.alert(tr('Error', 'பிழை'), e?.response?.data?.error || tr('Could not save.', 'சேமிக்க முடியவில்லை.'));
        } finally {
            setSavingInfo(false);
        }
    };

    const saveRzp = async () => {
        if (!rzp.key_id.trim() || !rzp.key_secret.trim()) {
            Alert.alert(tr('Both Key ID and Secret are required', 'இரண்டு சாவிகளும் தேவை'));
            return;
        }
        setSavingRzp(true);
        try {
            await api.put('/schools/my/razorpay', rzp);
            setRzp({ key_id: '', key_secret: '' });
            qc.invalidateQueries({ queryKey: ['admin-school'] });
            Alert.alert(tr('Saved', 'சேமிக்கப்பட்டது'), tr('Razorpay keys updated.', 'Razorpay சாவிகள் புதுப்பிக்கப்பட்டன.'));
        } catch (e: any) {
            Alert.alert(tr('Error', 'பிழை'), e?.response?.data?.error || tr('Could not save keys.', 'சேமிக்க முடியவில்லை.'));
        } finally {
            setSavingRzp(false);
        }
    };

    if (schoolQ.isLoading) {
        return (
            <>
                <Stack.Screen options={{ title: tr('Settings', 'அமைப்புகள்') }} />
                <Screen><Loader label={tr('Loading…', 'ஏற்றுகிறது…')} /></Screen>
            </>
        );
    }

    const configured = schoolQ.data?.razorpay_configured;

    return (
        <>
            <Stack.Screen options={{ title: tr('Settings', 'அமைப்புகள்') }} />
            <Screen scroll refreshing={schoolQ.isFetching} onRefresh={() => schoolQ.refetch()}>
                <Card style={{ gap: t.spacing.md }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
                        <Feather name="home" size={18} color={t.color.brand} />
                        <AppText size="lg" weight="800">{tr('School Information', 'பள்ளி தகவல்')}</AppText>
                    </View>
                    <Field label={tr('School Name', 'பள்ளி பெயர்')} value={info.name} onChangeText={(v) => setInfo((s) => ({ ...s, name: v }))} placeholder={tr('e.g. Sunrise Public School', 'எ.கா. சன்ரைஸ்')} autoCapitalize="words" />
                    <Field label={tr('Address', 'முகவரி')} value={info.address} onChangeText={(v) => setInfo((s) => ({ ...s, address: v }))} placeholder={tr('School address…', 'பள்ளி முகவரி…')} multiline autoCapitalize="sentences" />
                    <Field label={tr('Phone', 'தொலைபேசி')} value={info.phone} onChangeText={(v) => setInfo((s) => ({ ...s, phone: v }))} keyboardType="phone-pad" placeholder="+91 98765 43210" />
                    <Field label={tr('Contact Email', 'தொடர்பு மின்னஞ்சல்')} value={info.email_contact} onChangeText={(v) => setInfo((s) => ({ ...s, email_contact: v }))} keyboardType="email-address" placeholder="admin@school.com" />
                    <Field label={tr('Notification Email', 'அறிவிப்பு மின்னஞ்சல்')} value={info.notification_email} onChangeText={(v) => setInfo((s) => ({ ...s, notification_email: v }))} keyboardType="email-address" placeholder="notifications@school.com" />
                    <Button title={tr('Save Changes', 'மாற்றங்கள் சேமி')} onPress={saveInfo} loading={savingInfo} />
                </Card>

                <Card style={{ gap: t.spacing.md }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
                        <Feather name="credit-card" size={18} color={t.color.brand} />
                        <AppText size="lg" weight="800" style={{ flex: 1 }}>{tr('Razorpay', 'Razorpay')}</AppText>
                        <Badge label={configured ? tr('Connected', 'இணைக்கப்பட்டது') : tr('Not set', 'அமைக்கப்படவில்லை')} tone={configured ? 'success' : 'warning'} />
                    </View>
                    <AppText size="sm" muted>{tr('Enable online fee collection. Keys are stored securely and never shown again after saving.', 'ஆன்லைன் கட்டண வசூலை இயக்கு. சாவிகள் பாதுகாப்பாக சேமிக்கப்படும்.')}</AppText>
                    <Field label={tr('Key ID', 'Key ID')} value={rzp.key_id} onChangeText={(v) => setRzp((s) => ({ ...s, key_id: v }))} placeholder="rzp_live_…" />
                    <Field label={tr('Key Secret', 'Key Secret')} value={rzp.key_secret} onChangeText={(v) => setRzp((s) => ({ ...s, key_secret: v }))} placeholder={tr('Your Razorpay secret', 'உங்கள் ரகசியம்')} secureTextEntry />
                    <Button title={tr('Save Keys', 'சாவிகள் சேமி')} onPress={saveRzp} loading={savingRzp} />
                </Card>
            </Screen>
        </>
    );
}
