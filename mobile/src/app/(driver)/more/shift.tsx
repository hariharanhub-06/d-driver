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

interface KmEntry {
    id: string;
    km_reading: number;
    entry_type: string;
    recorded_at?: string;
}

interface Shift {
    id: string;
    status: string;
    start_time?: string;
    end_time?: string | null;
    date?: string;
    kmEntries?: KmEntry[];
}

async function fetchActive(): Promise<Shift | null> {
    const { data } = await api.get('/shifts/active');
    return data || null;
}

async function fetchMine(): Promise<Shift[]> {
    const { data } = await api.get('/shifts/mine');
    return Array.isArray(data?.shifts) ? data.shifts : [];
}

export default function DriverShift() {
    const t = useTheme();
    const tr = useT();
    const qc = useQueryClient();

    const [km, setKm] = useState('');

    const me = useQuery({ queryKey: ['driver-me'], queryFn: getDriverMe });
    const busId = me.data?.bus?.id || me.data?.assigned_bus_id;

    const active = useQuery({ queryKey: ['shift-active'], queryFn: fetchActive });
    const history = useQuery({ queryKey: ['shift-mine'], queryFn: fetchMine });

    const invalidateAll = () => {
        qc.invalidateQueries({ queryKey: ['shift-active'] });
        qc.invalidateQueries({ queryKey: ['shift-mine'] });
    };

    const startShift = useMutation({
        mutationFn: async () => {
            if (!busId) throw new Error('no-bus');
            const { data } = await api.post('/shifts/start', { bus_id: busId, start_km: parseFloat(km) });
            return data;
        },
        onSuccess: () => {
            setKm('');
            invalidateAll();
            Alert.alert(tr('Shift Started', 'பணி தொடங்கியது'));
        },
        onError: (e: any) => {
            const msg = e?.message === 'no-bus'
                ? tr('No bus assigned to you.', 'உங்களுக்கு பேருந்து ஒதுக்கப்படவில்லை.')
                : e?.response?.data?.error || tr('Could not start shift.', 'பணியைத் தொடங்க முடியவில்லை.');
            Alert.alert(tr('Error', 'பிழை'), msg);
        },
    });

    const endShift = useMutation({
        mutationFn: async () => {
            const { data } = await api.post('/shifts/end', { end_km: parseFloat(km), bus_id: busId });
            return data;
        },
        onSuccess: () => {
            setKm('');
            invalidateAll();
            Alert.alert(tr('Shift Ended', 'பணி முடிந்தது'));
        },
        onError: (e: any) => {
            Alert.alert(tr('Error', 'பிழை'), e?.response?.data?.error || tr('Could not end shift.', 'பணியை முடிக்க முடியவில்லை.'));
        },
    });

    const onAction = () => {
        const k = parseFloat(km);
        if (isNaN(k) || k < 0) {
            Alert.alert(tr('Required', 'தேவை'), tr('Enter the current odometer reading.', 'தற்போதைய ஓடோமீட்டர் அளவை உள்ளிடவும்.'));
            return;
        }
        if (current) endShift.mutate();
        else startShift.mutate();
    };

    const current = active.data;
    const startEntry = current?.kmEntries?.find((e) => e.entry_type === 'shift_start');

    const onRefresh = () => {
        active.refetch();
        history.refetch();
    };

    if (active.isLoading) {
        return (
            <>
                <Stack.Screen options={{ title: tr('Shift Log', 'பணி நேரம்') }} />
                <Screen><Loader /></Screen>
            </>
        );
    }

    return (
        <>
            <Stack.Screen options={{ title: tr('Shift Log', 'பணி நேரம்') }} />
            <Screen scroll refreshing={active.isRefetching || history.isRefetching} onRefresh={onRefresh}>
                <AppText size="xl" weight="800">{tr('Shift Log', 'பணி நேரம்')}</AppText>
                <AppText muted size="sm">{tr('Start and end your driving shift.', 'உங்கள் ஓட்டுநர் பணியைத் தொடங்கி முடிக்கவும்.')}</AppText>

                <Card style={{ gap: t.spacing.md }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Feather name="clock" size={18} color={current ? t.color.success : t.color.textMuted} />
                        <AppText weight="700" style={{ flex: 1 }}>
                            {current ? tr('Shift Active', 'பணி இயங்குகிறது') : tr('No Active Shift', 'செயலில் பணி இல்லை')}
                        </AppText>
                        <Badge label={current ? 'active' : 'idle'} tone={current ? 'success' : 'neutral'} />
                    </View>
                    {current ? (
                        <AppText size="sm" muted>
                            {tr('Started', 'தொடங்கியது')}: {current.start_time ? new Date(current.start_time).toLocaleString() : '—'}
                            {startEntry ? ` · ${tr('Start km', 'தொடக்க கி.மீ')} ${startEntry.km_reading}` : ''}
                        </AppText>
                    ) : null}

                    <Field
                        label={current ? tr('End Odometer (km)', 'முடிவு ஓடோமீட்டர் (கி.மீ)') : tr('Start Odometer (km)', 'தொடக்க ஓடோமீட்டர் (கி.மீ)')}
                        value={km}
                        onChangeText={setKm}
                        placeholder="0"
                        keyboardType="decimal-pad"
                    />
                    <Button
                        title={current ? tr('End Shift', 'பணியை முடி') : tr('Start Shift', 'பணியைத் தொடங்கு')}
                        onPress={onAction}
                        variant={current ? 'danger' : 'primary'}
                        loading={startShift.isPending || endShift.isPending}
                        disabled={me.isLoading}
                        icon={<Feather name={current ? 'stop-circle' : 'play'} size={16} color={current ? '#fff' : t.color.brandText} />}
                    />
                </Card>

                <AppText size="lg" weight="800" style={{ marginTop: t.spacing.sm }}>{tr('History', 'வரலாறு')}</AppText>

                {history.isLoading ? (
                    <Loader />
                ) : (history.data || []).length === 0 ? (
                    <EmptyState
                        icon={<Feather name="clock" size={40} color={t.color.textMuted} />}
                        title={tr('No shifts yet', 'பணிகள் இல்லை')}
                        description={tr('Your past shifts appear here.', 'உங்கள் கடந்த பணிகள் இங்கே தோன்றும்.')}
                    />
                ) : (
                    (history.data || []).map((s) => {
                        const sEntry = s.kmEntries?.find((e) => e.entry_type === 'shift_start');
                        const eEntry = s.kmEntries?.find((e) => e.entry_type === 'shift_end');
                        const totalKm = sEntry && eEntry ? eEntry.km_reading - sEntry.km_reading : null;
                        return (
                            <Card key={s.id} style={{ gap: 6 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <AppText weight="700" style={{ flex: 1 }}>
                                        {s.start_time ? new Date(s.start_time).toLocaleDateString() : (s.date ? new Date(s.date).toLocaleDateString() : '—')}
                                    </AppText>
                                    <Badge label={s.status} tone={s.status === 'active' ? 'success' : 'neutral'} />
                                </View>
                                <AppText size="sm" muted>
                                    {s.start_time ? new Date(s.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                                    {' → '}
                                    {s.end_time ? new Date(s.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : tr('ongoing', 'நடந்துகொண்டிருக்கிறது')}
                                    {totalKm != null ? ` · ${totalKm} ${tr('km', 'கி.மீ')}` : ''}
                                </AppText>
                            </Card>
                        );
                    })
                )}
            </Screen>
        </>
    );
}
