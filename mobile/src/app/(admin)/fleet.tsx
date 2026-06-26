import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import { getActiveLocations, getActiveTrips } from '@/lib/api';
import { useTheme } from '@/theme/ThemeProvider';
import { useT } from '@/lib/i18n';
import { AppText, Loader, EmptyState } from '@/components/ui';
import { SafeAreaView } from 'react-native-safe-area-context';
import OsmMap, { type OsmMarker } from '@/components/OsmMap';

export default function Fleet() {
    const t = useTheme();
    const tr = useT();
    const locs = useQuery({ queryKey: ['active-locations'], queryFn: getActiveLocations, refetchInterval: 5000 });
    const trips = useQuery({ queryKey: ['active-trips'], queryFn: getActiveTrips, refetchInterval: 10000 });

    const tripByBus = useMemo(() => new Map((trips.data || []).map(t => [t.bus_id, t])), [trips.data]);
    const buses = locs.data || [];
    const center: [number, number] = buses[0] ? [buses[0].latitude, buses[0].longitude] : [11.1271, 78.6569];
    const markers: OsmMarker[] = useMemo(
        () => buses.map((b) => ({
            lat: b.latitude,
            lng: b.longitude,
            label: tripByBus.get(b.bus_id)?.bus?.bus_number || 'BUS',
            color: t.color.brand,
            round: true,
        })),
        [buses, tripByBus, t.color.brand],
    );

    if (locs.isLoading) return <Loader />;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: t.color.bg }} edges={['top']}>
            <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
                <AppText size="xl" weight="800">{tr('Live Fleet', 'நேரடி பேருந்துகள்')}</AppText>
                <AppText muted size="sm">{buses.length} {tr('bus(es) live', 'பேருந்து(கள்) நேரடி')}</AppText>
            </View>
            {buses.length === 0 ? (
                <EmptyState
                    icon={<Feather name="truck" size={40} color={t.color.textMuted} />}
                    title={tr('No buses live', 'நேரடி பேருந்துகள் இல்லை')}
                    description={tr('Buses appear here once drivers start trips and share GPS.', 'ஓட்டுநர்கள் பயணம் தொடங்கி GPS பகிர்ந்ததும் பேருந்துகள் தோன்றும்.')}
                />
            ) : (
                <View style={{ flex: 1 }}>
                    <OsmMap center={center} zoom={12} markers={markers} follow={false} />
                </View>
            )}
        </SafeAreaView>
    );
}
