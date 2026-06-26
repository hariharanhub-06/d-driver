import React, { useEffect, useState } from 'react';
import { View, Pressable, Linking } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';

import { getMyChildren, type Child } from '@/lib/api';
import { resolveBusId, formatDistance, formatEta } from '@/lib/tracking';
import { useBusLocation } from '@/hooks/useBusLocation';
import { useEta } from '@/hooks/useEta';
import { useHasPermission } from '@/context/BrandingContext';
import { useTheme } from '@/theme/ThemeProvider';
import { useT } from '@/lib/i18n';
import { getPref } from '@/lib/secureStore';
import BusMap from '@/components/BusMap';
import { AppText, Loader, EmptyState, Card } from '@/components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Tracking() {
    const t = useTheme();
    const insets = useSafeAreaInsets();
    const tr = useT();
    const canTrack = useHasPermission('gps_tracking');

    const { data: children = [], isLoading } = useQuery({ queryKey: ['children'], queryFn: getMyChildren });
    const [activeId, setActiveId] = useState<string | null>(null);
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

    useEffect(() => {
        getPref('active_child_id').then((v) => v && setActiveId(v));
    }, []);

    // Best-effort device location to orient the user (optional — core works without it).
    useEffect(() => {
        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') return;
                const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                setUserLocation([pos.coords.latitude, pos.coords.longitude]);
            } catch {
                /* denied — fine */
            }
        })();
    }, []);

    const child: Child | undefined = children.find((c) => c.id === activeId) || children[0];
    const busId = child ? resolveBusId(child) : null;
    const stop = child?.stop;
    const stopPos: [number, number] | null =
        stop?.latitude != null && stop?.longitude != null ? [stop.latitude, stop.longitude] : null;
    const driverPhone = child?.route?.bus?.drivers?.[0]?.user?.phone;

    const { position: busPosition, tripStarted } = useBusLocation(busId);
    const eta = useEta(busPosition, stopPos, tripStarted);

    if (isLoading) return <Loader />;

    if (!canTrack) {
        return (
            <EmptyState
                icon={<Feather name="map-pin" size={40} color={t.color.textMuted} />}
                title={tr('Tracking disabled', 'கண்காணிப்பு முடக்கப்பட்டது')}
                description={tr('Live tracking is disabled by your school.', 'உங்கள் பள்ளியால் நேரடி கண்காணிப்பு முடக்கப்பட்டுள்ளது.')}
            />
        );
    }

    if (!busId || !stopPos) {
        return (
            <EmptyState
                icon={<Feather name="map-pin" size={40} color={t.color.textMuted} />}
                title={tr('Tracking not available', 'கண்காணிப்பு கிடைக்கவில்லை')}
                description={tr("This child's bus or stop isn't set up yet. Please contact your school.", 'இந்த குழந்தையின் பேருந்து அல்லது நிறுத்தம் இன்னும் அமைக்கப்படவில்லை. பள்ளியைத் தொடர்பு கொள்ளவும்.')}
            />
        );
    }

    const center: [number, number] = tripStarted && busPosition ? busPosition : (userLocation || stopPos);

    const callDriver = () => {
        if (!driverPhone) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Linking.openURL(`tel:${driverPhone}`);
    };

    return (
        <View style={{ flex: 1, backgroundColor: t.color.bg }}>
            {/* Map */}
            <View style={{ flex: 1 }}>
                <BusMap
                    center={center}
                    busPosition={tripStarted ? busPosition : null}
                    stop={stopPos ? { latitude: stopPos[0], longitude: stopPos[1], name: stop?.name } : null}
                    userLocation={userLocation}
                />
            </View>

            {/* Status chip top */}
            <View style={{ position: 'absolute', top: insets.top + 8, left: 12, right: 12 }}>
                <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 }}>
                    <View
                        style={{
                            width: 38,
                            height: 38,
                            borderRadius: 12,
                            backgroundColor: t.color.brand,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Feather name="truck" size={18} color={t.color.brandText} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <AppText weight="800" numberOfLines={1}>
                            {child?.route?.bus?.bus_number ? `Bus ${child.route.bus.bus_number}` : child?.name}
                        </AppText>
                        <AppText size="sm" muted>
                            {tripStarted ? tr('Live · en route', 'நேரடி · வழியில்') : tr("Bus hasn't started yet", 'பேருந்து தொடங்கவில்லை')}
                        </AppText>
                    </View>
                    {driverPhone ? (
                        <Pressable
                            onPress={callDriver}
                            accessibilityRole="button"
                            accessibilityLabel={tr('Call driver', 'ஓட்டுநரை அழை')}
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                                backgroundColor: t.color.success,
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Feather name="phone" size={18} color="#fff" />
                        </Pressable>
                    ) : null}
                </Card>
            </View>

            {/* Bottom ETA / status panel */}
            <View style={{ position: 'absolute', bottom: insets.bottom + 12, left: 12, right: 12 }}>
                <Card style={{ gap: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Feather name="map-pin" size={14} color={t.color.warning} />
                        <AppText weight="700" numberOfLines={1} style={{ flex: 1 }}>
                            {stop?.name || tr('Your stop', 'உங்கள் நிறுத்தம்')}
                        </AppText>
                    </View>

                    {tripStarted ? (
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <Metric
                                icon={<Feather name="activity" size={16} color={t.color.brand} />}
                                label={tr('Distance', 'தூரம்')}
                                value={eta ? formatDistance(eta.distanceM) : '…'}
                            />
                            <Metric
                                icon={<Feather name="clock" size={16} color={t.color.brand} />}
                                label={tr('Arriving in', 'வரும் நேரம்')}
                                value={eta ? formatEta(eta.durationS, eta.source) : '…'}
                            />
                        </View>
                    ) : (
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 8,
                                backgroundColor: t.color.warning + '1c',
                                padding: 12,
                                borderRadius: t.radius.md,
                            }}
                        >
                            <Feather name="clock" size={15} color={t.color.warning} />
                            <AppText size="sm" weight="600" color={t.color.warning} style={{ flex: 1 }}>
                                {tr(
                                    "Bus hasn't started yet. Live distance and arrival time will appear once the trip begins.",
                                    'பேருந்து தொடங்கவில்லை. பயணம் தொடங்கியதும் நேரடி தூரம் மற்றும் வரும் நேரம் காட்டப்படும்.',
                                )}
                            </AppText>
                        </View>
                    )}
                </Card>
            </View>
        </View>
    );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    const t = useTheme();
    return (
        <View
            style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                backgroundColor: t.color.surfaceAlt,
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: t.radius.md,
            }}
        >
            {icon}
            <View>
                <AppText size="sm" muted style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                    {label}
                </AppText>
                <AppText weight="800" size="sm">
                    {value}
                </AppText>
            </View>
        </View>
    );
}
