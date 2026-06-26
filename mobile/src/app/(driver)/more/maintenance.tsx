import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import api from '@/lib/api';
import { useTheme } from '@/theme/ThemeProvider';
import { useT } from '@/lib/i18n';
import { Screen, AppText, Card, Button, Loader, EmptyState, Badge } from '@/components/ui';
import { Field } from '@/components/form';

interface MaintenanceRecord {
    id: string;
    date: string;
    description?: string | null;
    items?: { name?: string; cost?: number }[];
    total_cost?: number;
    status?: string;
    admin_note?: string | null;
    bus_number?: string | null;
    created_at?: string;
}

function toneFor(status?: string): 'success' | 'warning' | 'neutral' {
    if (status === 'approved') return 'success';
    if (status === 'rejected') return 'warning';
    return 'neutral';
}

async function fetchMine(): Promise<MaintenanceRecord[]> {
    const { data } = await api.get('/maintenance/mine');
    return Array.isArray(data) ? data : [];
}

export default function DriverMaintenance() {
    const t = useTheme();
    const tr = useT();
    const qc = useQueryClient();

    const [issue, setIssue] = useState('');
    const [cost, setCost] = useState('');
    const [odometer, setOdometer] = useState('');

    const list = useQuery({ queryKey: ['maintenance-mine'], queryFn: fetchMine });

    const submit = useMutation({
        mutationFn: async () => {
            const items: { name: string; cost: number }[] = [];
            const c = parseFloat(cost);
            if (!isNaN(c) && c > 0) items.push({ name: issue.trim() || 'Repair', cost: c });
            const odo = parseFloat(odometer);
            const description = odometer.trim()
                ? `${issue.trim()} (Odometer: ${isNaN(odo) ? odometer.trim() : odo} km)`
                : issue.trim();
            const { data } = await api.post('/maintenance', {
                date: new Date().toISOString(),
                description,
                items,
            });
            return data;
        },
        onSuccess: () => {
            setIssue('');
            setCost('');
            setOdometer('');
            qc.invalidateQueries({ queryKey: ['maintenance-mine'] });
            Alert.alert(tr('Submitted', 'சமர்ப்பிக்கப்பட்டது'), tr('Maintenance report sent to admin.', 'பராமரிப்பு அறிக்கை நிர்வாகிக்கு அனுப்பப்பட்டது.'));
        },
        onError: () => {
            Alert.alert(tr('Error', 'பிழை'), tr('Could not submit report. Try again.', 'அறிக்கையை சமர்ப்பிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.'));
        },
    });

    const onSubmit = () => {
        if (!issue.trim()) {
            Alert.alert(tr('Required', 'தேவை'), tr('Describe the issue first.', 'முதலில் சிக்கலை விவரிக்கவும்.'));
            return;
        }
        submit.mutate();
    };

    return (
        <>
            <Stack.Screen options={{ title: tr('Maintenance', 'பராமரிப்பு') }} />
            <Screen scroll refreshing={list.isRefetching} onRefresh={() => list.refetch()}>
                <AppText size="xl" weight="800">{tr('Report an Issue', 'சிக்கலைப் புகாரளி')}</AppText>
                <AppText muted size="sm">{tr('Log a vehicle maintenance issue.', 'வாகன பராமரிப்பு சிக்கலைப் பதிவு செய்யவும்.')}</AppText>

                <Card style={{ gap: t.spacing.md }}>
                    <Field
                        label={tr('Issue / Description', 'சிக்கல் / விளக்கம்')}
                        value={issue}
                        onChangeText={setIssue}
                        placeholder={tr('e.g. Brake pads worn out', 'எ.கா. பிரேக் தேய்ந்தது')}
                        multiline
                        autoCapitalize="sentences"
                    />
                    <Field
                        label={tr('Cost (₹, optional)', 'செலவு (₹, விருப்பம்)')}
                        value={cost}
                        onChangeText={setCost}
                        placeholder="0"
                        keyboardType="decimal-pad"
                    />
                    <Field
                        label={tr('Odometer (km, optional)', 'ஓடோமீட்டர் (கி.மீ, விருப்பம்)')}
                        value={odometer}
                        onChangeText={setOdometer}
                        placeholder="0"
                        keyboardType="decimal-pad"
                    />
                    <Button
                        title={tr('Submit Report', 'அறிக்கையைச் சமர்ப்பி')}
                        onPress={onSubmit}
                        loading={submit.isPending}
                        icon={<Feather name="tool" size={16} color={t.color.brandText} />}
                    />
                </Card>

                <AppText size="lg" weight="800" style={{ marginTop: t.spacing.sm }}>{tr('My Reports', 'எனது அறிக்கைகள்')}</AppText>

                {list.isLoading ? (
                    <Loader />
                ) : (list.data || []).length === 0 ? (
                    <EmptyState
                        icon={<Feather name="tool" size={40} color={t.color.textMuted} />}
                        title={tr('No reports yet', 'அறிக்கைகள் இல்லை')}
                        description={tr('Your submitted maintenance reports appear here.', 'நீங்கள் சமர்ப்பித்த அறிக்கைகள் இங்கே தோன்றும்.')}
                    />
                ) : (
                    (list.data || []).map((r) => (
                        <Card key={r.id} style={{ gap: 6 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <AppText weight="700" style={{ flex: 1 }} numberOfLines={2}>
                                    {r.description || tr('Maintenance', 'பராமரிப்பு')}
                                </AppText>
                                <Badge label={r.status || 'pending'} tone={toneFor(r.status)} />
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                {r.total_cost != null ? (
                                    <AppText size="sm" muted>₹{Number(r.total_cost).toLocaleString('en-IN')}</AppText>
                                ) : null}
                                {r.bus_number ? <AppText size="sm" muted>{tr('Bus', 'பேருந்து')} {r.bus_number}</AppText> : null}
                                {r.date ? <AppText size="sm" muted>{new Date(r.date).toLocaleDateString()}</AppText> : null}
                            </View>
                            {r.admin_note ? (
                                <AppText size="sm" color={t.color.warning}>{tr('Note', 'குறிப்பு')}: {r.admin_note}</AppText>
                            ) : null}
                        </Card>
                    ))
                )}
            </Screen>
        </>
    );
}
