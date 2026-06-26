import React from 'react';
import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import { getActiveTrips, getActiveLocations, getPendingCounts, getTodayAttendance } from '@/lib/api';
import { useTheme } from '@/theme/ThemeProvider';
import { useT } from '@/lib/i18n';
import { Screen, AppText, Card, Loader } from '@/components/ui';

function num(v: any): number | null {
    return typeof v === 'number' ? v : null;
}

export default function Today() {
    const t = useTheme();
    const tr = useT();
    const trips = useQuery({ queryKey: ['active-trips'], queryFn: getActiveTrips, refetchInterval: 15000 });
    const locs = useQuery({ queryKey: ['active-locations'], queryFn: getActiveLocations, refetchInterval: 15000 });
    const pending = useQuery({ queryKey: ['pending-counts'], queryFn: getPendingCounts, refetchInterval: 30000 });
    const att = useQuery({ queryKey: ['today-attendance'], queryFn: getTodayAttendance });

    if (trips.isLoading) return <Loader />;

    const running = (trips.data || []).filter(x => x.status === 'running').length;
    const live = (locs.data || []).length;
    const p = pending.data || {};
    const pendingTotal = Object.values(p).reduce((a, b) => a + (b || 0), 0);

    // Best-effort attendance counts (shape varies).
    const a = att.data || {};
    const present = num(a.present) ?? num(a.present_count) ?? null;
    const absent = num(a.absent) ?? num(a.absent_count) ?? null;

    const stats = [
        { icon: 'navigation', label: tr('Running trips', 'இயங்கும் பயணங்கள்'), value: running, color: t.color.brand },
        { icon: 'map-pin', label: tr('Live buses', 'நேரடி பேருந்துகள்'), value: live, color: t.color.success },
        { icon: 'inbox', label: tr('Pending approvals', 'நிலுவை ஒப்புதல்கள்'), value: pendingTotal, color: t.color.warning },
        ...(present != null ? [{ icon: 'check', label: tr('Present today', 'இன்று வந்தவர்கள்'), value: present, color: t.color.success }] : []),
        ...(absent != null ? [{ icon: 'x', label: tr('Absent today', 'இன்று வராதவர்கள்'), value: absent, color: t.color.danger }] : []),
    ] as { icon: any; label: string; value: number; color: string }[];

    return (
        <Screen scroll refreshing={trips.isRefetching} onRefresh={() => { trips.refetch(); locs.refetch(); pending.refetch(); att.refetch(); }}>
            <AppText size="xl" weight="800">{tr('Today', 'இன்று')}</AppText>
            <AppText muted size="sm">{tr('Live overview of your school', 'உங்கள் பள்ளியின் நேரடி கண்ணோட்டம்')}</AppText>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {stats.map((s, i) => (
                    <Card key={i} style={{ width: '47%', gap: 8 }}>
                        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: s.color + '22', alignItems: 'center', justifyContent: 'center' }}>
                            <Feather name={s.icon} size={18} color={s.color} />
                        </View>
                        <AppText size="xxl" weight="800">{s.value}</AppText>
                        <AppText size="sm" muted>{s.label}</AppText>
                    </Card>
                ))}
            </View>
        </Screen>
    );
}
