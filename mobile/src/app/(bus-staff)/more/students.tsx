import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import { getActiveTrips, type TripStudent } from '@/lib/api';
import { useTheme } from '@/theme/ThemeProvider';
import { useT } from '@/lib/i18n';
import { Screen, AppText, Card, Loader, EmptyState } from '@/components/ui';

export default function BusStaffStudents() {
    const t = useTheme();
    const tr = useT();

    const trips = useQuery({ queryKey: ['active-trips'], queryFn: getActiveTrips, refetchInterval: 15000 });
    const trip = (trips.data || []).find((x) => x.status === 'running') || (trips.data || [])[0];

    // Map each student to a stop name. Prefer the route-level student list (most complete),
    // falling back to the per-stop nested students.
    const stopName = useMemo(() => {
        const m = new Map<string, string>();
        for (const s of trip?.route?.stops || []) m.set(s.id, s.name);
        return m;
    }, [trip?.route?.stops]);

    const roster: { student: TripStudent; stop: string }[] = useMemo(() => {
        const routeStudents = trip?.route?.students || [];
        if (routeStudents.length > 0) {
            return routeStudents.map((s) => ({
                student: s,
                stop: (s.stop_id && stopName.get(s.stop_id)) || tr('Unassigned', 'ஒதுக்கப்படவில்லை'),
            }));
        }
        // Fallback: flatten per-stop students.
        const out: { student: TripStudent; stop: string }[] = [];
        for (const stop of trip?.route?.stops || []) {
            for (const s of stop.students || []) out.push({ student: s, stop: stop.name });
        }
        return out;
    }, [trip?.route?.students, trip?.route?.stops, stopName, tr]);

    if (trips.isLoading) {
        return (
            <>
                <Stack.Screen options={{ title: tr('Students', 'மாணவர்கள்') }} />
                <Screen><Loader /></Screen>
            </>
        );
    }

    if (!trip) {
        return (
            <>
                <Stack.Screen options={{ title: tr('Students', 'மாணவர்கள்') }} />
                <Screen scroll refreshing={trips.isRefetching} onRefresh={() => trips.refetch()}>
                    <EmptyState
                        icon={<Feather name="users" size={40} color={t.color.textMuted} />}
                        title={tr('No active trip', 'செயலில் பயணம் இல்லை')}
                        description={tr('The roster appears when a trip is running on your bus.', 'உங்கள் பேருந்தில் பயணம் இயங்கும்போது பட்டியல் தோன்றும்.')}
                    />
                </Screen>
            </>
        );
    }

    return (
        <>
            <Stack.Screen options={{ title: tr('Students', 'மாணவர்கள்') }} />
            <Screen scroll refreshing={trips.isRefetching} onRefresh={() => trips.refetch()}>
                <AppText size="xl" weight="800">{tr('Roster', 'மாணவர் பட்டியல்')}</AppText>
                <AppText muted size="sm">
                    {trip.route?.name ? `${trip.route.name} · ` : ''}{roster.length} {tr('students', 'மாணவர்கள்')}
                </AppText>

                {roster.length === 0 ? (
                    <EmptyState
                        icon={<Feather name="users" size={40} color={t.color.textMuted} />}
                        title={tr('No students', 'மாணவர்கள் இல்லை')}
                        description={tr('No students are assigned to this route.', 'இந்த வழித்தடத்திற்கு மாணவர்கள் ஒதுக்கப்படவில்லை.')}
                    />
                ) : (
                    roster.map(({ student, stop }) => (
                        <Card key={student.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: t.color.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                                <AppText weight="800">{student.name.charAt(0).toUpperCase()}</AppText>
                            </View>
                            <View style={{ flex: 1, minWidth: 0 }}>
                                <AppText weight="700" numberOfLines={1}>{student.name}</AppText>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                    {student.grade ? <AppText size="sm" muted>{tr('Grade', 'வகுப்பு')} {student.grade}</AppText> : null}
                                    <Feather name="map-pin" size={12} color={t.color.textMuted} />
                                    <AppText size="sm" muted numberOfLines={1} style={{ flexShrink: 1 }}>{stop}</AppText>
                                </View>
                            </View>
                        </Card>
                    ))
                )}
            </Screen>
        </>
    );
}
