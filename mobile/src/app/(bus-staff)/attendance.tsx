import React, { useEffect, useMemo, useState } from 'react';
import { View, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';

import { getActiveTrips, markAttendance, type TripStudent } from '@/lib/api';
import { connectSocket, getSocket, joinSchoolRoom } from '@/lib/socket';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/theme/ThemeProvider';
import { useT } from '@/lib/i18n';
import { Screen, AppText, Card, Loader, EmptyState } from '@/components/ui';

export default function BusStaffAttendance() {
    const t = useTheme();
    const tr = useT();
    const { user } = useAuth();
    const [marks, setMarks] = useState<Record<string, 'present' | 'absent'>>({});

    const trips = useQuery({ queryKey: ['active-trips'], queryFn: getActiveTrips, refetchInterval: 30000 });

    // Live sync: join school room, refetch on trip-started, refetch (lock) on trip-completed.
    useEffect(() => {
        if (!user?.school_id) return;
        let active = true;
        const onChange = () => { if (active) trips.refetch(); };
        (async () => {
            await connectSocket();
            joinSchoolRoom(user.school_id!);
            const s = getSocket();
            s?.on('trip-started', onChange);
            s?.on('trip-completed', onChange);
        })();
        return () => {
            active = false;
            const s = getSocket();
            s?.off('trip-started', onChange);
            s?.off('trip-completed', onChange);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.school_id]);

    const trip = (trips.data || []).find(x => x.status === 'running') || (trips.data || [])[0];
    const isEvening = (trip?.route?.route_type || '') === 'evening' || (trip?.route?.route_type || '') === 'afternoon';
    const stops = useMemo(() => {
        const raw = trip?.route?.stops || [];
        return isEvening ? [...raw].reverse() : raw;
    }, [trip?.route?.stops, isEvening]);
    const allStudents = trip?.route?.students || [];

    if (trips.isLoading) return <Loader />;

    if (!trip || trip.status !== 'running') {
        return (
            <Screen>
                <EmptyState
                    icon={<Feather name="lock" size={40} color={t.color.textMuted} />}
                    title={tr('Trip not started', 'பயணம் தொடங்கவில்லை')}
                    description={tr("Attendance unlocks when the driver starts the ride. You'll see students appear automatically.", 'ஓட்டுநர் பயணத்தைத் தொடங்கியதும் வருகை திறக்கும். மாணவர்கள் தானாக தோன்றுவர்.')}
                />
            </Screen>
        );
    }

    const toggle = async (s: TripStudent) => {
        const next = marks[s.id] === 'present' ? 'absent' : 'present';
        setMarks(prev => ({ ...prev, [s.id]: next }));
        Haptics.selectionAsync();
        try {
            await markAttendance({ student_id: s.id, status: next, trip_id: trip.id, attendance_type: isEvening ? 'dropoff' : 'pickup' });
        } catch {
            // server rejects if the trip has ended — refetch to lock the screen
            trips.refetch();
        }
    };

    return (
        <Screen scroll refreshing={trips.isRefetching} onRefresh={() => trips.refetch()}>
            <AppText size="xl" weight="800">{tr('Attendance', 'வருகை')}</AppText>
            <AppText muted size="sm">{trip.route?.name} · {trip.bus?.bus_number || ''}</AppText>

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
