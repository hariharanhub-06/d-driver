import React, { useEffect, useMemo, useState } from 'react';
import { View, Pressable, Modal, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { getDriverMe, getActiveTrips, completeTrip, updateStopIndex, markAttendance, type TripStudent } from '@/lib/api';
import { connectSocket, joinDriverRoom } from '@/lib/socket';
import { useAuth } from '@/context/AuthContext';
import { useRideTracking } from '@/hooks/useRideTracking';
import { haversineMeters, formatDistance } from '@/lib/tracking';
import { useTheme } from '@/theme/ThemeProvider';
import { useT } from '@/lib/i18n';
import { getPref } from '@/lib/secureStore';
import DriverRideMap from '@/components/DriverRideMap';
import { AppText, Button, Loader, EmptyState } from '@/components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Ride() {
    const t = useTheme();
    const insets = useSafeAreaInsets();
    const tr = useT();
    const router = useRouter();
    const qc = useQueryClient();
    const { user } = useAuth();
    const [tripType, setTripType] = useState<'morning' | 'evening'>('morning');
    const [sheetOpen, setSheetOpen] = useState(false);
    const [marks, setMarks] = useState<Record<string, 'present' | 'absent'>>({});
    const [ending, setEnding] = useState(false);

    const me = useQuery({ queryKey: ['driver-me'], queryFn: getDriverMe });
    const trips = useQuery({ queryKey: ['active-trips'], queryFn: getActiveTrips, refetchInterval: 8000 });

    const busId = me.data?.bus?.id || me.data?.assigned_bus_id || null;

    useEffect(() => { getPref('driver_trip_type').then(v => { if (v === 'evening') setTripType('evening'); }); }, []);

    // Connect socket + join the driver room (keyed by the user id) for this session.
    useEffect(() => {
        (async () => {
            await connectSocket();
            if (user?.id) joinDriverRoom(user.id);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    const trip = (trips.data || []).find(x => x.status === 'running') || (trips.data || [])[0];
    const { position, heading } = useRideTracking(busId, !!trip);

    // Morning forward, evening reversed (mirror web ordering + trip_type filter).
    const isEvening = tripType === 'evening';
    const stops = useMemo(() => {
        const raw = trip?.route?.stops || [];
        const hasSplit = raw.some(s => s.trip_type && s.trip_type !== 'morning');
        const filtered = hasSplit ? raw.filter(s => s.trip_type === (isEvening ? 'evening' : 'morning') || s.trip_type === 'both') : raw;
        const ordered = filtered.length ? filtered : raw;
        return isEvening ? [...ordered].reverse() : ordered;
    }, [trip?.route?.stops, isEvening]);

    const currentStopIndex = trip?.current_stop_index ?? 0;
    const currentStop = stops[currentStopIndex];
    const allStudents = trip?.route?.students || [];

    const distanceToStop = useMemo(() => {
        if (!position || currentStop?.latitude == null || currentStop?.longitude == null) return null;
        return haversineMeters({ lat: position[0], lng: position[1] }, { lat: currentStop.latitude, lng: currentStop.longitude });
    }, [position, currentStop]);

    if (me.isLoading || trips.isLoading) return <Loader />;

    if (!trip) {
        return (
            <View style={{ flex: 1, backgroundColor: t.color.bg }}>
                <EmptyState
                    icon={<Feather name="navigation" size={40} color={t.color.textMuted} />}
                    title={tr('No active trip', 'செயலில் பயணம் இல்லை')}
                    description={tr('Start a trip from the home screen to begin tracking.', 'கண்காணிப்பைத் தொடங்க முகப்பில் இருந்து பயணம் தொடங்குங்கள்.')}
                    action={<Button title={tr('Back', 'பின்')} variant="secondary" onPress={() => router.back()} style={{ minWidth: 160 }} />}
                />
            </View>
        );
    }

    const studentsAtStop: TripStudent[] = currentStop
        ? (allStudents.filter(s => s.stop_id === currentStop.id).length > 0
            ? allStudents.filter(s => s.stop_id === currentStop.id)
            : (currentStop.students || []))
        : [];

    const openSheet = () => {
        const init: Record<string, 'present' | 'absent'> = {};
        studentsAtStop.forEach(s => { init[s.id] = marks[s.id] || 'present'; });
        setMarks(prev => ({ ...prev, ...init }));
        setSheetOpen(true);
    };

    const toggle = async (s: TripStudent) => {
        const next = marks[s.id] === 'present' ? 'absent' : 'present';
        setMarks(prev => ({ ...prev, [s.id]: next }));
        Haptics.selectionAsync();
        try { await markAttendance({ student_id: s.id, status: next, trip_id: trip.id, attendance_type: isEvening ? 'dropoff' : 'pickup' }); } catch { /* idempotent */ }
    };

    const nextStop = async () => {
        if (currentStopIndex >= stops.length - 1) { setSheetOpen(false); return; }
        try { await updateStopIndex(trip.id, currentStopIndex + 1); await trips.refetch(); } catch { /* ignore */ }
        setSheetOpen(false);
    };

    const onEnd = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        Alert.alert(tr('End trip?', 'பயணத்தை முடிக்கவா?'), tr('This completes the trip and stops sharing your location.', 'இது பயணத்தை முடித்து இருப்பிடப் பகிர்வை நிறுத்தும்.'), [
            { text: tr('Cancel', 'ரத்து'), style: 'cancel' },
            {
                text: tr('End', 'முடி'), style: 'destructive', onPress: async () => {
                    setEnding(true);
                    try { await completeTrip(trip.id); } catch { /* ignore */ }
                    qc.invalidateQueries({ queryKey: ['active-trips'] });
                    router.replace('/(driver)/dashboard' as any);
                },
            },
        ]);
    };

    return (
        <View style={{ flex: 1, backgroundColor: t.color.bg }}>
            <View style={{ flex: 1 }}>
                <DriverRideMap driverPos={position} heading={heading} stops={stops} currentStopIndex={currentStopIndex} />
            </View>

            {/* Top bar */}
            <View style={{ position: 'absolute', top: insets.top + 8, left: 12, right: 12, flexDirection: 'row', gap: 8 }}>
                <Pressable onPress={() => router.back()} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: t.color.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.color.border }}>
                    <Feather name="arrow-left" size={20} color={t.color.text} />
                </Pressable>
                <View style={{ flex: 1, backgroundColor: t.color.surface, borderRadius: 12, borderWidth: 1, borderColor: t.color.border, paddingHorizontal: 12, justifyContent: 'center' }}>
                    <AppText weight="800" numberOfLines={1}>{trip.route?.name || tr('Trip', 'பயணம்')}</AppText>
                    <AppText size="sm" muted>{me.data?.bus?.bus_number} · {isEvening ? tr('Evening', 'மாலை') : tr('Morning', 'காலை')}</AppText>
                </View>
            </View>

            {/* Bottom control card */}
            <View style={{ position: 'absolute', bottom: insets.bottom + 12, left: 12, right: 12, backgroundColor: t.color.surface, borderRadius: t.radius.lg, borderWidth: 1, borderColor: t.color.border, padding: 16, gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Feather name="map-pin" size={16} color={t.color.warning} />
                    <View style={{ flex: 1 }}>
                        <AppText size="sm" muted style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                            {tr('Current stop', 'தற்போதைய நிறுத்தம்')} ({Math.min(currentStopIndex + 1, stops.length)}/{stops.length})
                        </AppText>
                        <AppText weight="800" numberOfLines={1}>{currentStop?.name || tr('—', '—')}</AppText>
                    </View>
                    {distanceToStop != null && <AppText weight="700" color={t.color.brand}>{formatDistance(distanceToStop)}</AppText>}
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Button title={tr('Attendance', 'வருகை')} variant="secondary" icon={<Feather name="check-square" size={15} color={t.color.text} />} onPress={openSheet} style={{ flex: 1 }} />
                    <Button title={tr('Next stop', 'அடுத்தது')} icon={<Feather name="chevron-right" size={15} color={t.color.brandText} />} onPress={nextStop} style={{ flex: 1 }} disabled={currentStopIndex >= stops.length - 1} />
                </View>
                <Button title={tr('End trip', 'பயணம் முடி')} variant="danger" loading={ending} onPress={onEnd} />
            </View>

            {/* Attendance sheet */}
            <Modal visible={sheetOpen} animationType="slide" transparent onRequestClose={() => setSheetOpen(false)}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
                    <View style={{ backgroundColor: t.color.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '75%', padding: 16, gap: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <AppText size="lg" weight="800">{currentStop?.name || tr('Attendance', 'வருகை')}</AppText>
                            <Pressable onPress={() => setSheetOpen(false)} hitSlop={12} style={{ padding: 4 }}><Feather name="x" size={22} color={t.color.textMuted} /></Pressable>
                        </View>
                        <ScrollView contentContainerStyle={{ gap: 8 }}>
                            {studentsAtStop.length === 0 ? (
                                <AppText muted style={{ textAlign: 'center', paddingVertical: 24 }}>{tr('No students at this stop.', 'இந்த நிறுத்தத்தில் மாணவர்கள் இல்லை.')}</AppText>
                            ) : studentsAtStop.map(s => {
                                const present = (marks[s.id] || 'present') === 'present';
                                return (
                                    <Pressable key={s.id} onPress={() => toggle(s)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.color.surface, borderRadius: t.radius.md, padding: 12, borderWidth: 1, borderColor: t.color.border }}>
                                        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: t.color.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
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
                        </ScrollView>
                        <Button title={tr('Done · Next stop', 'முடிந்தது · அடுத்தது')} onPress={nextStop} />
                    </View>
                </View>
            </Modal>
        </View>
    );
}
