import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';

import { getDriverMe, getActiveTrips, startTrip } from '@/lib/api';
import { useTheme } from '@/theme/ThemeProvider';
import { useT } from '@/lib/i18n';
import { setPref } from '@/lib/secureStore';
import { Screen, AppText, Card, Button, Loader, EmptyState, Badge } from '@/components/ui';

export default function DriverDashboard() {
    const t = useTheme();
    const tr = useT();
    const router = useRouter();
    const [tripType, setTripType] = useState<'morning' | 'evening'>('morning');
    const [starting, setStarting] = useState<string | null>(null);

    const me = useQuery({ queryKey: ['driver-me'], queryFn: getDriverMe });
    const trips = useQuery({ queryKey: ['active-trips'], queryFn: getActiveTrips, refetchInterval: 10000 });

    if (me.isLoading) return <Loader />;

    const bus = me.data?.bus;
    const routes = bus?.routes || [];
    const runningByRoute = new Map((trips.data || []).filter(t => t.status === 'running').map(t => [t.route_id, t]));

    const onStart = async (routeId: string) => {
        setStarting(routeId);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            await setPref('driver_trip_type', tripType);
            const running = runningByRoute.get(routeId);
            if (!running) await startTrip(routeId, tripType);
            router.push('/(driver)/ride' as any);
        } catch {
            // ignore — ride screen will reflect state
            router.push('/(driver)/ride' as any);
        } finally {
            setStarting(null);
        }
    };

    return (
        <Screen scroll refreshing={me.isRefetching} onRefresh={() => { me.refetch(); trips.refetch(); }}>
            <View style={{ gap: 2 }}>
                <AppText muted size="sm">{tr('Welcome back', 'மீண்டும் வரவேற்கிறோம்')},</AppText>
                <AppText size="xl" weight="800">{me.data?.user?.name?.split(' ')[0] || tr('Driver', 'ஓட்டுநர்')} 🚌</AppText>
            </View>

            {/* Bus card */}
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: t.color.brand, alignItems: 'center', justifyContent: 'center' }}>
                    <Feather name="truck" size={22} color={t.color.brandText} />
                </View>
                <View style={{ flex: 1 }}>
                    <AppText weight="800" size="lg">{bus?.bus_number || tr('No bus assigned', 'பேருந்து ஒதுக்கப்படவில்லை')}</AppText>
                    <AppText muted size="sm">{routes.length} {tr('route(s)', 'வழி(கள்)')}</AppText>
                </View>
            </Card>

            {/* Trip type toggle */}
            <View>
                <AppText weight="700" size="sm" muted style={{ marginBottom: 8 }}>{tr('Trip type', 'பயண வகை')}</AppText>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    {(['morning', 'evening'] as const).map(tt => {
                        const active = tripType === tt;
                        return (
                            <Pressable
                                key={tt}
                                onPress={() => { setTripType(tt); Haptics.selectionAsync(); }}
                                style={{
                                    flex: 1, paddingVertical: 12, borderRadius: t.radius.md, alignItems: 'center',
                                    backgroundColor: active ? t.color.brand : t.color.surface,
                                    borderWidth: 1, borderColor: active ? t.color.brand : t.color.border,
                                }}
                            >
                                <AppText weight="700" color={active ? t.color.brandText : t.color.text}>
                                    {tt === 'morning' ? tr('Morning', 'காலை') : tr('Evening', 'மாலை')}
                                </AppText>
                            </Pressable>
                        );
                    })}
                </View>
            </View>

            {/* Routes */}
            <AppText weight="800" size="lg" style={{ marginTop: 4 }}>{tr('Routes', 'வழிகள்')}</AppText>
            {routes.length === 0 ? (
                <Card><AppText muted>{tr('No routes assigned to your bus yet.', 'உங்கள் பேருந்துக்கு வழிகள் இல்லை.')}</AppText></Card>
            ) : (
                routes.map(r => {
                    const running = runningByRoute.get(r.id);
                    return (
                        <Card key={r.id} style={{ gap: 12 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <AppText weight="700" style={{ flex: 1 }} numberOfLines={1}>{r.name || tr('Route', 'வழி')}</AppText>
                                {running ? <Badge label={tr('Running', 'இயங்குகிறது')} tone="success" /> : null}
                            </View>
                            <Button
                                title={running ? tr('Resume ride', 'பயணத்தைத் தொடர்') : tr('Start trip', 'பயணம் தொடங்கு')}
                                icon={<Feather name="play" size={15} color={t.color.brandText} />}
                                loading={starting === r.id}
                                onPress={() => onStart(r.id)}
                            />
                        </Card>
                    );
                })
            )}

            {!bus && (
                <EmptyState
                    icon={<Feather name="truck" size={40} color={t.color.textMuted} />}
                    title={tr('No bus assigned', 'பேருந்து இல்லை')}
                    description={tr('Ask your school admin to assign a bus to start trips.', 'பயணம் தொடங்க பள்ளி நிர்வாகியிடம் பேருந்தை ஒதுக்கச் சொல்லுங்கள்.')}
                />
            )}
        </Screen>
    );
}
