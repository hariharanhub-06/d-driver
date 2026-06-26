import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import { getActiveLocations, type ActiveLocation } from '@/lib/api';
import { useT } from '@/lib/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen, AppText, Card, Loader, EmptyState, Badge } from '@/components/ui';
import BusMap from '@/components/BusMap';

function timeAgo(ts?: string): string {
    if (!ts) return '—';
    const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    return `${Math.floor(diff / 3600)}h`;
}

export default function SaTrackingScreen() {
    const tr = useT();
    const t = useTheme();
    const [selectedBusId, setSelectedBusId] = useState<string | null>(null);

    // Live positions for every active bus (GET /location/active). Poll every 3s.
    const q = useQuery<ActiveLocation[]>({
        queryKey: ['sa-active-locations'],
        queryFn: getActiveLocations,
        refetchInterval: 3000,
    });

    const header = <Stack.Screen options={{ title: tr('Live Tracking', 'நேரடி கண்காணிப்பு') }} />;

    if (q.isLoading) {
        return <>{header}<Screen><Loader label={tr('Loading buses…', 'ஏற்றுகிறது…')} /></Screen></>;
    }

    const buses = q.data ?? [];
    const selected = buses.find((b) => b.bus_id === selectedBusId) || buses[0];
    const center: [number, number] | null = selected ? [selected.latitude, selected.longitude] : null;

    if (buses.length === 0) {
        return (
            <>
                {header}
                <Screen scroll refreshing={q.isFetching} onRefresh={() => q.refetch()}>
                    <AppText size="xl" weight="800">{tr('Live Tracking', 'நேரடி கண்காணிப்பு')}</AppText>
                    <EmptyState
                        title={tr('No active buses', 'செயலில் பேருந்துகள் இல்லை')}
                        description={tr('Live positions appear when trips begin.', 'பயணம் தொடங்கியதும் நேரடி இடங்கள் காட்டப்படும்.')}
                        icon={<Feather name="map" size={40} color={t.color.textMuted} />}
                    />
                </Screen>
            </>
        );
    }

    return (
        <>
            {header}
            <View style={{ flex: 1, backgroundColor: t.color.bg }}>
                {/* Map shows the selected (or first) live bus. */}
                <View style={{ flex: 1 }}>
                    {center ? (
                        <BusMap
                            center={center}
                            busPosition={selected ? [selected.latitude, selected.longitude] : null}
                            busHeading={selected?.heading ?? null}
                        />
                    ) : null}
                </View>

                {/* Bottom list of all live buses; tap to focus the map. */}
                <View style={{ maxHeight: '42%', backgroundColor: t.color.bg, borderTopLeftRadius: 18, borderTopRightRadius: 18 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: t.spacing.md }}>
                        <AppText weight="800">{tr('Live Buses', 'நேரடி பேருந்துகள்')}</AppText>
                        <Badge label={`${buses.length} ${tr('live', 'நேரடி')}`} tone="success" />
                    </View>
                    <Screen scroll refreshing={q.isFetching} onRefresh={() => q.refetch()} style={{ paddingTop: 0 }}>
                        {buses.map((b) => {
                            const active = selected?.bus_id === b.bus_id;
                            return (
                                <Pressable key={b.bus_id} onPress={() => setSelectedBusId(b.bus_id)}>
                                    <Card style={{ borderColor: active ? t.color.brand : t.color.border, gap: 6 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: t.color.brand + '22', alignItems: 'center', justifyContent: 'center' }}>
                                                <Feather name="truck" size={18} color={t.color.brand} />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <AppText weight="700" numberOfLines={1}>{tr('Bus', 'பேருந்து')} {b.bus_id}</AppText>
                                                <AppText size="sm" muted numberOfLines={1}>
                                                    {b.latitude.toFixed(5)}, {b.longitude.toFixed(5)} · {timeAgo(b.timestamp)}
                                                </AppText>
                                            </View>
                                            {active ? <Feather name="map-pin" size={18} color={t.color.brand} /> : null}
                                        </View>
                                    </Card>
                                </Pressable>
                            );
                        })}
                    </Screen>
                </View>
            </View>
        </>
    );
}
