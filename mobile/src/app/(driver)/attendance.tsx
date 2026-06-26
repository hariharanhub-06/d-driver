import React, { useEffect, useMemo, useState } from 'react';
import { View, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';

import { getActiveTrips, markAttendance, type TripStudent } from '@/lib/api';
import { useTheme } from '@/theme/ThemeProvider';
import { useT } from '@/lib/i18n';
import { getPref } from '@/lib/secureStore';
import { Screen, AppText, Card, Loader, EmptyState } from '@/components/ui';

export default function DriverAttendance() {
    const t = useTheme();
    const tr = useT();
    const [isEvening, setIsEvening] = useState(false);
    const [marks, setMarks] = useState<Record<string, 'present' | 'absent'>>({});

    useEffect(() => { getPref('driver_trip_type').then(v => setIsEvening(v === 'evening')); }, []);

    const trips = useQuery({ queryKey: ['active-trips'], queryFn: getActiveTrips, refetchInterval: 10000 });
    const trip = (trips.data || []).find(x => x.status === 'running') || (trips.data || [])[0];

    const stops = useMemo(() => {
        const raw = trip?.route?.stops || [];
        const ordered = isEvening ? [...raw].reverse() : raw;
        return ordered;
    }, [trip?.route?.stops, isEvening]);

    const allStudents = trip?.route?.students || [];

    if (trips.isLoading) return <Loader />;

    if (!trip) {
        return (
            <Screen>
                <EmptyState
                    icon={<Feather name="check-square" size={40} color={t.color.textMuted} />}
                    title={tr('No active trip', 'செயலில் பயணம் இல்லை')}
                    description={tr('Start a trip to mark attendance.', 'வருகை பதிவு செய்ய பயணம் தொடங்குங்கள்.')}
                />
            </Screen>
        );
    }

    const toggle = async (s: TripStudent) => {
        const next = marks[s.id] === 'present' ? 'absent' : 'present';
        setMarks(prev => ({ ...prev, [s.id]: next }));
        Haptics.selectionAsync();
        try { await markAttendance({ student_id: s.id, status: next, trip_id: trip.id, attendance_type: isEvening ? 'dropoff' : 'pickup' }); } catch { /* idempotent */ }
    };

    return (
        <Screen scroll refreshing={trips.isRefetching} onRefresh={() => trips.refetch()}>
            <AppText size="xl" weight="800">{tr('Attendance', 'வருகை')}</AppText>
            <AppText muted size="sm">{trip.route?.name} · {isEvening ? tr('Evening', 'மாலை') : tr('Morning', 'காலை')}</AppText>

            {stops.map(stop => {
                const byStop = allStudents.filter(s => s.stop_id === stop.id);
                const studs = byStop.length > 0 ? byStop : (stop.students || []);
                if (studs.length === 0) return null;
                return (
                    <Card key={stop.id} style={{ gap: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Feather name="map-pin" size={14} color={t.color.brand} />
                            <AppText weight="800" style={{ flex: 1 }} numberOfLines={1}>{stop.name}</AppText>
                            <AppText size="sm" muted>{studs.length}</AppText>
                        </View>
                        {studs.map(s => {
                            const present = (marks[s.id] || 'present') === 'present';
                            return (
                                <Pressable key={s.id} onPress={() => toggle(s)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
                                    <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: t.color.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                                        <AppText weight="800">{s.name.charAt(0).toUpperCase()}</AppText>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <AppText weight="600" numberOfLines={1}>{s.name}</AppText>
                                        {s.grade ? <AppText size="sm" muted>{tr('Grade', 'வகுப்பு')} {s.grade}</AppText> : null}
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: (present ? t.color.success : t.color.danger) + '22', paddingHorizontal: 12, paddingVertical: 7, borderRadius: t.radius.pill }}>
                                        <Feather name={present ? 'check' : 'x'} size={14} color={present ? t.color.success : t.color.danger} />
                                        <AppText size="sm" weight="700" color={present ? t.color.success : t.color.danger}>{present ? tr('Present', 'வந்தது') : tr('Absent', 'வரவில்லை')}</AppText>
                                    </View>
                                </Pressable>
                            );
                        })}
                    </Card>
                );
            })}
        </Screen>
    );
}
