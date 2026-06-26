import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useT } from '@/lib/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen, AppText, Card, Button, Loader, EmptyState, Badge, InfoRow } from '@/components/ui';
import { Select } from '@/components/form';

type SwitchStatus = 'pending' | 'resolved';

interface BusSwitch {
    id: string;
    driver?: { user?: { name?: string } };
    original_bus?: { id?: string; bus_number?: string };
    new_bus?: { id?: string; bus_number?: string } | null;
    reason?: string;
    notes?: string | null;
    km_at_switch?: number | null;
    status: SwitchStatus;
    created_at?: string;
}

interface Bus {
    id: string;
    bus_number?: string;
}

function fmtDate(d?: string) {
    if (!d) return '—';
    try {
        return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
        return d;
    }
}

export default function BusSwitchesScreen() {
    const tr = useT();
    const t = useTheme();
    const qc = useQueryClient();
    const [selected, setSelected] = useState<Record<string, string>>({});

    const { data, isLoading, refetch, isRefetching } = useQuery<BusSwitch[]>({
        queryKey: ['bus-switch'],
        queryFn: async () => {
            const { data } = await api.get('/bus-switch');
            return Array.isArray(data) ? data : [];
        },
    });

    const { data: buses } = useQuery<Bus[]>({
        queryKey: ['buses'],
        queryFn: async () => {
            const { data } = await api.get('/buses');
            return Array.isArray(data) ? data : [];
        },
    });

    const assign = useMutation({
        mutationFn: async ({ id, new_bus_id }: { id: string; new_bus_id: string }) => {
            await api.put(`/bus-switch/${id}/assign`, { new_bus_id });
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['bus-switch'] }),
        onError: (e: any) =>
            Alert.alert(tr('Error', 'பிழை'), e?.response?.data?.details || e?.response?.data?.error || tr('Assignment failed', 'ஒதுக்கீடு தோல்வியடைந்தது')),
    });

    const switches = data ?? [];

    return (
        <>
            <Stack.Screen options={{ title: tr('Bus Switches', 'பேருந்து மாற்றங்கள்') }} />
            <Screen scroll refreshing={isRefetching} onRefresh={refetch}>
                {isLoading ? (
                    <Loader label={tr('Loading switches…', 'மாற்றங்களை ஏற்றுகிறது…')} />
                ) : switches.length === 0 ? (
                    <EmptyState
                        icon={<Feather name="repeat" size={40} color={t.color.textMuted} />}
                        title={tr('No bus switch requests', 'பேருந்து மாற்ற கோரிக்கைகள் இல்லை')}
                        description={tr('Driver bus switch requests will appear here.', 'ஓட்டுநர் கோரிக்கைகள் இங்கே தோன்றும்.')}
                    />
                ) : (
                    switches.map((s) => {
                        const pending = s.status === 'pending';
                        const options = (buses ?? [])
                            .filter((b) => b.id !== s.original_bus?.id)
                            .map((b) => ({ label: b.bus_number || b.id, value: b.id }));
                        const picked = selected[s.id];
                        return (
                            <Card key={s.id} style={{ gap: t.spacing.xs }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: t.spacing.sm }}>
                                    <AppText size="lg" weight="800" numberOfLines={1} style={{ flex: 1 }}>
                                        {s.driver?.user?.name || tr('Driver', 'ஓட்டுநர்')}
                                    </AppText>
                                    <Badge label={s.status} tone={s.status === 'resolved' ? 'success' : 'warning'} />
                                </View>
                                <InfoRow icon={<Feather name="truck" size={16} color={t.color.textMuted} />} label={tr('Original Bus', 'அசல் பேருந்து')} value={s.original_bus?.bus_number || '—'} />
                                <InfoRow icon={<Feather name="truck" size={16} color={t.color.brand} />} label={tr('New Bus', 'புதிய பேருந்து')} value={s.new_bus?.bus_number || tr('Not assigned', 'ஒதுக்கப்படவில்லை')} />
                                <InfoRow icon={<Feather name="message-square" size={16} color={t.color.textMuted} />} label={tr('Reason', 'காரணம்')} value={s.reason || '—'} />
                                {s.km_at_switch != null && (
                                    <InfoRow icon={<Feather name="map" size={16} color={t.color.textMuted} />} label={tr('KM at Switch', 'மாற்றத்தில் கி.மீ')} value={`${s.km_at_switch} km`} />
                                )}
                                <InfoRow icon={<Feather name="calendar" size={16} color={t.color.textMuted} />} label={tr('Date', 'தேதி')} value={fmtDate(s.created_at)} />

                                {pending && (
                                    <View style={{ gap: t.spacing.sm, marginTop: t.spacing.sm }}>
                                        <Select
                                            label={tr('Assign Replacement Bus', 'மாற்று பேருந்து ஒதுக்கு')}
                                            value={picked}
                                            options={options}
                                            onChange={(v) => setSelected((p) => ({ ...p, [s.id]: v }))}
                                        />
                                        <Button
                                            title={tr('Assign Bus', 'பேருந்து ஒதுக்கு')}
                                            disabled={!picked}
                                            loading={assign.isPending && assign.variables?.id === s.id}
                                            onPress={() => picked && assign.mutate({ id: s.id, new_bus_id: picked })}
                                        />
                                    </View>
                                )}
                            </Card>
                        );
                    })
                )}
            </Screen>
        </>
    );
}
