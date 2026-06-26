import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import api, { getDriverMe } from '@/lib/api';
import { useTheme } from '@/theme/ThemeProvider';
import { useT } from '@/lib/i18n';
import { Screen, AppText, Card, Button, Loader, EmptyState, Badge } from '@/components/ui';
import { Field } from '@/components/form';

interface FuelRequest {
    id: string;
    amount_requested?: number;
    current_km?: number;
    reason?: string | null;
    status?: string;
    admin_note?: string | null;
    bus?: { bus_number?: string };
    created_at?: string;
}

function toneFor(status?: string): 'success' | 'warning' | 'neutral' {
    if (status === 'approved' || status === 'disbursed') return 'success';
    if (status === 'rejected') return 'warning';
    return 'neutral';
}

async function fetchMine(): Promise<FuelRequest[]> {
    const { data } = await api.get('/fuel/requests/mine');
    return Array.isArray(data?.requests) ? data.requests : [];
}

export default function DriverFuel() {
    const t = useTheme();
    const tr = useT();
    const qc = useQueryClient();

    const [amount, setAmount] = useState('');
    const [km, setKm] = useState('');
    const [reason, setReason] = useState('');

    const me = useQuery({ queryKey: ['driver-me'], queryFn: getDriverMe });
    const busId = me.data?.bus?.id || me.data?.assigned_bus_id;

    const list = useQuery({ queryKey: ['fuel-mine'], queryFn: fetchMine });

    const submit = useMutation({
        mutationFn: async () => {
            if (!busId) throw new Error('no-bus');
            const { data } = await api.post('/fuel/request', {
                bus_id: busId,
                amount_requested: parseFloat(amount),
                current_km: parseFloat(km),
                reason: reason.trim() || undefined,
            });
            return data;
        },
        onSuccess: () => {
            setAmount('');
            setKm('');
            setReason('');
            qc.invalidateQueries({ queryKey: ['fuel-mine'] });
            Alert.alert(tr('Requested', 'கோரப்பட்டது'), tr('Fuel request sent to admin.', 'எரிபொருள் கோரிக்கை நிர்வாகிக்கு அனுப்பப்பட்டது.'));
        },
        onError: (e: any) => {
            const msg = e?.message === 'no-bus'
                ? tr('No bus assigned to you.', 'உங்களுக்கு பேருந்து ஒதுக்கப்படவில்லை.')
                : tr('Could not send request. Try again.', 'கோரிக்கையை அனுப்ப முடியவில்லை. மீண்டும் முயற்சிக்கவும்.');
            Alert.alert(tr('Error', 'பிழை'), msg);
        },
    });

    const onSubmit = () => {
        const a = parseFloat(amount);
        const k = parseFloat(km);
        if (isNaN(a) || a <= 0) {
            Alert.alert(tr('Required', 'தேவை'), tr('Enter a valid amount.', 'சரியான தொகையை உள்ளிடவும்.'));
            return;
        }
        if (isNaN(k) || k < 0) {
            Alert.alert(tr('Required', 'தேவை'), tr('Enter current odometer reading.', 'தற்போதைய ஓடோமீட்டர் அளவை உள்ளிடவும்.'));
            return;
        }
        submit.mutate();
    };

    return (
        <>
            <Stack.Screen options={{ title: tr('Fuel', 'எரிபொருள்') }} />
            <Screen scroll refreshing={list.isRefetching} onRefresh={() => list.refetch()}>
                <AppText size="xl" weight="800">{tr('Request Fuel', 'எரிபொருள் கோரிக்கை')}</AppText>
                <AppText muted size="sm">
                    {me.data?.bus?.bus_number
                        ? `${tr('Bus', 'பேருந்து')} ${me.data.bus.bus_number}`
                        : tr('Send a fuel funding request to admin.', 'நிர்வாகிக்கு எரிபொருள் நிதி கோரிக்கையை அனுப்பவும்.')}
                </AppText>

                <Card style={{ gap: t.spacing.md }}>
                    <Field
                        label={tr('Amount Requested (₹)', 'கோரப்பட்ட தொகை (₹)')}
                        value={amount}
                        onChangeText={setAmount}
                        placeholder="0"
                        keyboardType="decimal-pad"
                    />
                    <Field
                        label={tr('Current Odometer (km)', 'தற்போதைய ஓடோமீட்டர் (கி.மீ)')}
                        value={km}
                        onChangeText={setKm}
                        placeholder="0"
                        keyboardType="decimal-pad"
                    />
                    <Field
                        label={tr('Reason (optional)', 'காரணம் (விருப்பம்)')}
                        value={reason}
                        onChangeText={setReason}
                        placeholder={tr('e.g. Tank near empty', 'எ.கா. டேங்க் காலியாக உள்ளது')}
                        multiline
                        autoCapitalize="sentences"
                    />
                    <Button
                        title={tr('Send Request', 'கோரிக்கையை அனுப்பு')}
                        onPress={onSubmit}
                        loading={submit.isPending}
                        disabled={me.isLoading}
                        icon={<Feather name="droplet" size={16} color={t.color.brandText} />}
                    />
                </Card>

                <AppText size="lg" weight="800" style={{ marginTop: t.spacing.sm }}>{tr('My Requests', 'எனது கோரிக்கைகள்')}</AppText>

                {list.isLoading ? (
                    <Loader />
                ) : (list.data || []).length === 0 ? (
                    <EmptyState
                        icon={<Feather name="droplet" size={40} color={t.color.textMuted} />}
                        title={tr('No requests yet', 'கோரிக்கைகள் இல்லை')}
                        description={tr('Your fuel requests appear here.', 'உங்கள் எரிபொருள் கோரிக்கைகள் இங்கே தோன்றும்.')}
                    />
                ) : (
                    (list.data || []).map((r) => (
                        <Card key={r.id} style={{ gap: 6 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <AppText weight="800" size="lg" style={{ flex: 1 }}>
                                    ₹{Number(r.amount_requested || 0).toLocaleString('en-IN')}
                                </AppText>
                                <Badge label={r.status || 'pending'} tone={toneFor(r.status)} />
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                {r.bus?.bus_number ? <AppText size="sm" muted>{tr('Bus', 'பேருந்து')} {r.bus.bus_number}</AppText> : null}
                                {r.current_km != null ? <AppText size="sm" muted>{r.current_km} {tr('km', 'கி.மீ')}</AppText> : null}
                                {r.created_at ? <AppText size="sm" muted>{new Date(r.created_at).toLocaleDateString()}</AppText> : null}
                            </View>
                            {r.reason ? <AppText size="sm" muted numberOfLines={2}>{r.reason}</AppText> : null}
                            {r.admin_note ? <AppText size="sm" color={t.color.warning}>{tr('Note', 'குறிப்பு')}: {r.admin_note}</AppText> : null}
                        </Card>
                    ))
                )}
            </Screen>
        </>
    );
}
