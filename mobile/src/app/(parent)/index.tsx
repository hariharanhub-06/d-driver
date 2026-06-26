import React, { useEffect, useState } from 'react';
import { View, Pressable, ScrollView, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';

import { getMyChildren, type Child } from '@/lib/api';
import { resolveBusId } from '@/lib/tracking';
import { useAuth } from '@/context/AuthContext';
import { useHasPermission } from '@/context/BrandingContext';
import { useTheme } from '@/theme/ThemeProvider';
import { useT } from '@/lib/i18n';
import { getPref, setPref } from '@/lib/secureStore';
import { Screen, AppText, Card, Button, InfoRow, Loader, EmptyState, Badge } from '@/components/ui';

const ACTIVE_CHILD_KEY = 'active_child_id';

export default function Dashboard() {
    const { user } = useAuth();
    const t = useTheme();
    const tr = useT();
    const router = useRouter();
    const canTrack = useHasPermission('gps_tracking');

    const { data: children = [], isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: ['children'],
        queryFn: getMyChildren,
    });

    const [activeId, setActiveId] = useState<string | null>(null);

    useEffect(() => {
        getPref(ACTIVE_CHILD_KEY).then((v) => v && setActiveId(v));
    }, []);

    const selectChild = (id: string) => {
        setActiveId(id);
        setPref(ACTIVE_CHILD_KEY, id);
        Haptics.selectionAsync();
    };

    if (isLoading) return <Loader label={tr('Loading…', 'ஏற்றுகிறது…')} />;

    if (isError) {
        return (
            <Screen>
                <EmptyState
                    icon={<Feather name="wifi-off" size={40} color={t.color.textMuted} />}
                    title={tr('Could not load', 'ஏற்ற முடியவில்லை')}
                    description={tr('Please check your connection and try again.', 'உங்கள் இணைப்பைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்.')}
                    action={<Button title={tr('Retry', 'மீண்டும்')} onPress={() => refetch()} style={{ minWidth: 160 }} />}
                />
            </Screen>
        );
    }

    if (children.length === 0) {
        return (
            <Screen>
                <EmptyState
                    icon={<Feather name="users" size={40} color={t.color.textMuted} />}
                    title={tr('No children linked', 'குழந்தைகள் இணைக்கப்படவில்லை')}
                    description={tr('No students are linked to your account yet. Please contact your school.', 'உங்கள் கணக்கில் மாணவர்கள் இணைக்கப்படவில்லை. பள்ளியைத் தொடர்பு கொள்ளவும்.')}
                />
            </Screen>
        );
    }

    const child: Child = children.find((c) => c.id === activeId) || children[0];
    const driver = child.route?.bus?.drivers?.[0]?.user;
    const busNumber = child.route?.bus?.bus_number;
    const routeName = child.route?.name;
    const stopName = child.stop?.name;
    const hasBus = !!resolveBusId(child);

    const callDriver = () => {
        if (!driver?.phone) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Linking.openURL(`tel:${driver.phone}`);
    };

    return (
        <Screen scroll refreshing={isRefetching} onRefresh={refetch}>
            {/* Greeting */}
            <View style={{ gap: 2 }}>
                <AppText muted size="sm">
                    {tr('Hello', 'வணக்கம்')},
                </AppText>
                <AppText size="xl" weight="800">
                    {user?.name?.split(' ')[0] || tr('Parent', 'பெற்றோர்')} 👋
                </AppText>
            </View>

            {/* Child switcher */}
            {children.length > 1 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {children.map((c) => {
                        const active = c.id === child.id;
                        return (
                            <Pressable
                                key={c.id}
                                onPress={() => selectChild(c.id)}
                                style={{
                                    paddingHorizontal: 16,
                                    paddingVertical: 9,
                                    borderRadius: t.radius.pill,
                                    backgroundColor: active ? t.color.brand : t.color.surface,
                                    borderWidth: 1,
                                    borderColor: active ? t.color.brand : t.color.border,
                                }}
                            >
                                <AppText weight="700" size="sm" color={active ? t.color.brandText : t.color.text}>
                                    {c.name}
                                </AppText>
                            </Pressable>
                        );
                    })}
                </ScrollView>
            ) : null}

            {/* Trip details card */}
            <Card style={{ gap: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <AppText size="lg" weight="800">
                        {tr('Trip Details', 'பயண விவரங்கள்')}
                    </AppText>
                    {canTrack && hasBus ? (
                        <Pressable onPress={() => router.push('/(parent)/tracking' as any)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Feather name="navigation" size={13} color={t.color.brand} />
                            <AppText size="sm" weight="700" color={t.color.brand}>
                                {tr('Live Track', 'நேரடி')}
                            </AppText>
                        </Pressable>
                    ) : null}
                </View>

                <InfoRow icon={<Feather name="user" size={16} color={t.color.textMuted} />} label={tr('Parent', 'பெற்றோர்')} value={user?.name || '—'} />
                <InfoRow
                    icon={<Feather name="award" size={16} color={t.color.textMuted} />}
                    label={tr('Student', 'மாணவர்')}
                    value={child.name + (child.grade ? ` · ${child.grade}${child.section ? '-' + child.section : ''}` : '')}
                />
                <InfoRow icon={<Feather name="truck" size={16} color={t.color.textMuted} />} label={tr('Bus No', 'பேருந்து எண்')} value={busNumber || tr('Not assigned', 'ஒதுக்கப்படவில்லை')} />
                <InfoRow icon={<Feather name="navigation-2" size={16} color={t.color.textMuted} />} label={tr('Route', 'வழி')} value={routeName || '—'} />
                <InfoRow
                    icon={<Feather name="map-pin" size={16} color={t.color.textMuted} />}
                    label={tr('Stop', 'நிறுத்தம்')}
                    value={stopName ? stopName + (child.stop?.pickup_time ? ` · ${child.stop.pickup_time}` : '') : '—'}
                />
                <InfoRow
                    icon={<Feather name="phone" size={16} color={t.color.textMuted} />}
                    label={tr('Driver', 'ஓட்டுநர்')}
                    value={driver?.name || tr('Not assigned', 'ஒதுக்கப்படவில்லை')}
                    action={
                        driver?.phone ? (
                            <Pressable
                                onPress={callDriver}
                                accessibilityRole="button"
                                accessibilityLabel={tr('Call driver', 'ஓட்டுநரை அழை')}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 5,
                                    backgroundColor: t.color.success + '1e',
                                    paddingHorizontal: 12,
                                    paddingVertical: 8,
                                    borderRadius: t.radius.md,
                                }}
                            >
                                <Feather name="phone" size={13} color={t.color.success} />
                                <AppText size="sm" weight="700" color={t.color.success}>
                                    {tr('Call', 'அழை')}
                                </AppText>
                            </Pressable>
                        ) : undefined
                    }
                />
            </Card>

            {/* Track CTA */}
            {canTrack && hasBus ? (
                <Button
                    title={tr('Track bus live', 'பேருந்தை நேரடியாக கண்காணி')}
                    icon={<Feather name="navigation" size={16} color={t.color.brandText} />}
                    onPress={() => router.push('/(parent)/tracking' as any)}
                />
            ) : !canTrack ? (
                <Card>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Feather name="info" size={16} color={t.color.textMuted} />
                        <AppText muted size="sm" style={{ flex: 1 }}>
                            {tr('Live tracking is disabled by your school.', 'உங்கள் பள்ளியால் நேரடி கண்காணிப்பு முடக்கப்பட்டுள்ளது.')}
                        </AppText>
                    </View>
                </Card>
            ) : null}
        </Screen>
    );
}
