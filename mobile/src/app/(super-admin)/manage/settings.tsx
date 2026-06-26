import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useT } from '@/lib/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen, AppText, Card, Button, Loader } from '@/components/ui';
import { Field } from '@/components/form';

// Mirrors GET/PUT /platform/config (platformController). Branding + landing/footer text.
interface PlatformConfig {
    product_name?: string;
    landing_badge?: string;
    landing_title?: string;
    landing_subtitle?: string;
    landing_cta_text?: string;
    landing_footer_tagline?: string;
    landing_footer_email?: string;
    landing_footer_phone?: string;
    landing_footer_address?: string;
    landing_footer_copyright?: string;
}

type FormState = Record<keyof PlatformConfig, string>;
const empty: FormState = {
    product_name: '',
    landing_badge: '',
    landing_title: '',
    landing_subtitle: '',
    landing_cta_text: '',
    landing_footer_tagline: '',
    landing_footer_email: '',
    landing_footer_phone: '',
    landing_footer_address: '',
    landing_footer_copyright: '',
};

export default function SaSettingsScreen() {
    const tr = useT();
    const t = useTheme();
    const qc = useQueryClient();

    const config = useQuery<PlatformConfig>({
        queryKey: ['sa-platform-config'],
        queryFn: async () => (await api.get('/platform/config')).data || {},
    });

    const [form, setForm] = useState<FormState>(empty);
    const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

    // Seed the form once the config loads.
    useEffect(() => {
        const d = config.data;
        if (!d) return;
        setForm({
            product_name: d.product_name ?? '',
            landing_badge: d.landing_badge ?? '',
            landing_title: d.landing_title ?? '',
            landing_subtitle: d.landing_subtitle ?? '',
            landing_cta_text: d.landing_cta_text ?? '',
            landing_footer_tagline: d.landing_footer_tagline ?? '',
            landing_footer_email: d.landing_footer_email ?? '',
            landing_footer_phone: d.landing_footer_phone ?? '',
            landing_footer_address: d.landing_footer_address ?? '',
            landing_footer_copyright: d.landing_footer_copyright ?? '',
        });
    }, [config.data]);

    const save = useMutation({
        mutationFn: async () => (await api.put('/platform/config', form)).data,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['sa-platform-config'] });
            Alert.alert(tr('Saved', 'சேமிக்கப்பட்டது'), tr('Platform settings updated.', 'தள அமைப்புகள் புதுப்பிக்கப்பட்டன.'));
        },
        onError: (e: any) =>
            Alert.alert(tr('Error', 'பிழை'), e?.response?.data?.error || tr('Failed to save settings', 'சேமிக்க முடியவில்லை')),
    });

    const header = <Stack.Screen options={{ title: tr('Platform Settings', 'தள அமைப்புகள்') }} />;

    if (config.isLoading) {
        return <>{header}<Screen><Loader label={tr('Loading…', 'ஏற்றுகிறது…')} /></Screen></>;
    }

    return (
        <>
            {header}
            <Screen scroll refreshing={config.isFetching} onRefresh={() => config.refetch()}>
                <AppText size="xl" weight="800">{tr('Platform Settings', 'தள அமைப்புகள்')}</AppText>
                <AppText muted size="sm">{tr('Branding shown on the public landing page', 'பொது முகப்புப் பக்கத்தில் காட்டப்படும் பிராண்டிங்')}</AppText>

                <Card style={{ gap: t.spacing.md }}>
                    <AppText weight="700" size="sm">{tr('Branding & Hero', 'பிராண்டிங் & ஹீரோ')}</AppText>
                    <Field label={tr('Product Name', 'தயாரிப்பு பெயர்')} value={form.product_name} onChangeText={(v) => set('product_name', v)} placeholder="Onlive" autoCapitalize="words" />
                    <Field label={tr('Hero Badge', 'ஹீரோ பேட்ஜ்')} value={form.landing_badge} onChangeText={(v) => set('landing_badge', v)} placeholder="School Transport OS" autoCapitalize="sentences" />
                    <Field label={tr('Hero Title', 'ஹீரோ தலைப்பு')} value={form.landing_title} onChangeText={(v) => set('landing_title', v)} placeholder={tr('The modern platform for school bus management', '')} multiline autoCapitalize="sentences" />
                    <Field label={tr('Hero Subtitle', 'ஹீரோ உரை')} value={form.landing_subtitle} onChangeText={(v) => set('landing_subtitle', v)} placeholder={tr('Track buses, manage fees, inform parents.', '')} multiline autoCapitalize="sentences" />
                    <Field label={tr('CTA Text', 'CTA உரை')} value={form.landing_cta_text} onChangeText={(v) => set('landing_cta_text', v)} placeholder="Get Started" autoCapitalize="words" />
                </Card>

                <Card style={{ gap: t.spacing.md }}>
                    <AppText weight="700" size="sm">{tr('Footer', 'அடிக்குறிப்பு')}</AppText>
                    <Field label={tr('Footer Tagline', 'அடிக்குறிப்பு வரி')} value={form.landing_footer_tagline} onChangeText={(v) => set('landing_footer_tagline', v)} placeholder={tr('Powering safe school transport.', '')} multiline autoCapitalize="sentences" />
                    <Field label={tr('Footer Email', 'மின்னஞ்சல்')} value={form.landing_footer_email} onChangeText={(v) => set('landing_footer_email', v)} placeholder="hello@example.com" keyboardType="email-address" />
                    <Field label={tr('Footer Phone', 'தொலைபேசி')} value={form.landing_footer_phone} onChangeText={(v) => set('landing_footer_phone', v)} placeholder="+91 98765 43210" keyboardType="phone-pad" />
                    <Field label={tr('Footer Address', 'முகவரி')} value={form.landing_footer_address} onChangeText={(v) => set('landing_footer_address', v)} placeholder={tr('123 Main Street, Chennai', '')} multiline autoCapitalize="sentences" />
                    <Field label={tr('Footer Copyright', 'காப்புரிமை')} value={form.landing_footer_copyright} onChangeText={(v) => set('landing_footer_copyright', v)} placeholder="© 2026 Onlive. All rights reserved." autoCapitalize="sentences" />
                </Card>

                <Button
                    title={tr('Save Changes', 'மாற்றங்களை சேமி')}
                    onPress={() => save.mutate()}
                    loading={save.isPending}
                    icon={<Feather name="check" size={18} color={t.color.brandText} />}
                />
            </Screen>
        </>
    );
}
