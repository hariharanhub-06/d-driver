import React from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import { getActiveTrips } from '@/lib/api';
import { useTheme } from '@/theme/ThemeProvider';
import { useT } from '@/lib/i18n';
import { Screen, AppText, Card, Loader, EmptyState, Badge, InfoRow } from '@/components/ui';

export default function BusStaffToday() {
    const t = useTheme();
    const tr = useT();

    const trips = useQuery({ queryKey: ['active-trips'], queryFn: getActiveTrips, refetchInterval: 10000 });
    const trip = (trips.data || []).find((x) => x.status === 'running') || (trips.data || [])[0];

    const stops = trip?.route?.stops || [];
    const students = trip?.route?.students || [];
    const studentCount = students.length || stops.reduce((n, s) => n + (s.students?.length || 0), 0);
    const idx = trip?.current_stop_index ?? 0;
    const currentStop = idx > 0 ? stops[idx - 1] : undefined;
    const nextStop = stops[idx];

    if (trips.isLoading) {
        return (
            <>
                <Stack.Screen options={{ title: tr('Live Trip', 'நேரடி பயணம்') }} />
                <Screen><Loader /></Screen>
            </>
        );
    }

    if (!trip) {
        return (
            <>
                <Stack.Screen options={{ title: tr('Live Trip', 'நேரடி பயணம்') }} />
                <Screen scroll refreshing={trips.isRefetching} onRefresh={() => trips.refetch()}>
                    <EmptyState
                        icon={<Feather name="navigation" size={40} color={t.color.textMuted} />}
                        title={tr('No active trip', 'செயலில் பயணம் இல்லை')}
                        description={tr('This screen updates live when the driver starts a trip.', 'ஓட்டுநர் பயணத்தைத் தொடங்கும்போது இந்தத் திரை நேரடியாகப் புதுப்பிக்கப்படும்.')}
                    />
                </Screen>
            </>
        );
    }

    return (
        <>
            <Stack.Screen options={{ title: tr('Live Trip', 'நேரடி பயணம்') }} />
            <Screen scroll refreshing={trips.isRefetching} onRefresh={() => trips.refetch()}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <AppText size="xl" weight="800" style={{ flex: 1 }}>{tr('Live Trip', 'நேரடி பயணம்')}</AppText>
                    <Badge label={trip.status} tone={trip.status === 'running' ? 'success' : 'neutral'} />
                </View>

                <Card>
                    <InfoRow
                        icon={<Feather name="map" size={16} color={t.color.brand} />}
                        label={tr('Route', 'வழித்தடம்')}
                        value={trip.route?.name || '—'}
                    />
                    <InfoRow
                        icon={<Feather name="truck" size={16} color={t.color.brand} />}
                        label={tr('Bus', 'பேருந்து')}
                        value={trip.bus?.bus_number || '—'}
                    />
                    <InfoRow
                        icon={<Feather name="user" size={16} color={t.color.brand} />}
                        label={tr('Driver', 'ஓட்டுநர்')}
                        value={trip.driver?.user?.name || '—'}
                    />
                    <InfoRow
                        icon={<Feather name="users" size={16} color={t.color.brand} />}
                        label={tr('Students', 'மாணவர்கள்')}
                        value={String(studentCount)}
                    />
                    <InfoRow
                        icon={<Feather name="flag" size={16} color={t.color.brand} />}
                        label={tr('Stops Done', 'முடிந்த நிறுத்தங்கள்')}
                        value={`${idx} / ${stops.length}`}
                    />
                </Card>

                <Card style={{ gap: 6 }}>
                    <AppText size="sm" muted weight="600">{tr('Last Stop', 'கடைசி நிறுத்தம்')}</AppText>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Feather name="check-circle" size={16} color={t.color.success} />
                        <AppText weight="700" style={{ flex: 1 }} numberOfLines={1}>
                            {currentStop?.name || tr('Not started', 'தொடங்கவில்லை')}
                        </AppText>
                    </View>
                    <AppText size="sm" muted weight="600" style={{ marginTop: t.spacing.sm }}>{tr('Next Stop', 'அடுத்த நிறுத்தம்')}</AppText>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Feather name="map-pin" size={16} color={t.color.brand} />
                        <AppText weight="700" style={{ flex: 1 }} numberOfLines={1}>
                            {nextStop?.name || tr('Trip complete', 'பயணம் முடிந்தது')}
                        </AppText>
                    </View>
                </Card>

                {stops.length > 0 ? (
                    <Card style={{ gap: 4 }}>
                        <AppText weight="800" style={{ marginBottom: 4 }}>{tr('All Stops', 'அனைத்து நிறுத்தங்கள்')}</AppText>
                        {stops.map((stop, i) => {
                            const done = i < idx;
                            const isNext = i === idx;
                            return (
                                <View key={stop.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}>
                                    <Feather
                                        name={done ? 'check-circle' : isNext ? 'navigation' : 'circle'}
                                        size={15}
                                        color={done ? t.color.success : isNext ? t.color.brand : t.color.textMuted}
                                    />
                                    <AppText style={{ flex: 1 }} numberOfLines={1} weight={isNext ? '700' : '400'} muted={!done && !isNext}>
                                        {stop.name}
                                    </AppText>
                                    <AppText size="sm" muted>{stop.students?.length || 0}</AppText>
                                </View>
                            );
                        })}
                    </Card>
                ) : null}
            </Screen>
        </>
    );
}
