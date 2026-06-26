import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import MapView, { Marker, UrlTile, PROVIDER_DEFAULT } from 'react-native-maps';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import { getActiveLocations, getActiveTrips } from '@/lib/api';
import { useTheme } from '@/theme/ThemeProvider';
import { useT } from '@/lib/i18n';
import { AppText, Loader, EmptyState } from '@/components/ui';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Fleet() {
    const t = useTheme();
    const tr = useT();
    const locs = useQuery({ queryKey: ['active-locations'], queryFn: getActiveLocations, refetchInterval: 5000 });
    const trips = useQuery({ queryKey: ['active-trips'], queryFn: getActiveTrips, refetchInterval: 10000 });

    const tripByBus = useMemo(() => new Map((trips.data || []).map(t => [t.bus_id, t])), [trips.data]);
    const buses = locs.data || [];
    const center = buses[0] ? { latitude: buses[0].latitude, longitude: buses[0].longitude } : { latitude: 11.1271, longitude: 78.6569 };

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
                    <MapView
                        style={{ flex: 1 }}
                        provider={PROVIDER_DEFAULT}
                        initialRegion={{ ...center, latitudeDelta: 0.08, longitudeDelta: 0.08 }}
                    >
                        <UrlTile urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maximumZ={19} tileSize={256} />
                        {buses.map(b => {
                            const trip = tripByBus.get(b.bus_id);
                            return (
                                <Marker key={b.bus_id} coordinate={{ latitude: b.latitude, longitude: b.longitude }} title={trip?.bus?.bus_number || tr('Bus', 'பேருந்து')} description={trip?.route?.name} anchor={{ x: 0.5, y: 0.5 }}>
                                    <View style={{ backgroundColor: t.color.brand, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, borderWidth: 2, borderColor: '#fff' }}>
                                        <Text style={{ color: t.color.brandText, fontSize: 10, fontWeight: '800' }}>{trip?.bus?.bus_number || '🚌'}</Text>
                                    </View>
                                </Marker>
                            );
                        })}
                    </MapView>
                    <View style={{ position: 'absolute', bottom: 2, right: 4, backgroundColor: 'rgba(255,255,255,0.7)', paddingHorizontal: 4, borderRadius: 4 }} pointerEvents="none">
                        <Text style={{ fontSize: 9, color: '#333' }}>© OpenStreetMap</Text>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
}
