import React from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useT } from '@/lib/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen, AppText, Card, Loader, EmptyState, Badge, InfoRow } from '@/components/ui';

interface Shift {
    id: string;
    driver?: { user?: { name?: string } };
    bus_number?: string | null;
    date?: string;
    start_time?: string;
    end_time?: string | null;
    total_km?: number | null;
    status?: string;
}

function fmtDate(d?: string) {
    if (!d) return '—';
    try {
        return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
        return d;
    }
}

function fmtTime(d?: string | null) {
    if (!d) return '—';
    try {
        return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
        return '—';
    }
}

function duration(start?: string, end?: string | null) {
    if (!start || !end) return '—';
    try {
        const ms = new Date(end).getTime() - new Date(start).getTime();
        if (ms <= 0) return '—';
        const mins = Math.round(ms / 60000);
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    } catch {
        return '—';
    }
}

const toneFor = (s?: string) => (s === 'completed' ? 'success' : s === 'active' ? 'neutral' : 'warning');

export default function ShiftLogsScreen() {
    const tr = useT();
    const t = useTheme();

    const { data, isLoading, refetch, isRefetching } = useQuery<Shift[]>({
        queryKey: ['shifts'],
        queryFn: async () => {
            const { data } = await api.get('/shifts');
            return Array.isArray(data) ? data : Array.isArray(data?.shifts) ? data.shifts : [];
        },
    });

    const shifts = data ?? [];
    const active = shifts.filter((s) => s.status === 'active').length;
    const completed = shifts.filter((s) => s.status === 'completed').length;

    return (
        <>
            <Stack.Screen options={{ title: tr('Shift Logs', 'பணி நேர பதிவுகள்') }} />
            <Screen scroll refreshing={isRefetching} onRefresh={refetch}>
                {isLoading ? (
                    <Loader label={tr('Loading shifts…', 'ஷிப்ட்களை ஏற்றுகிறது…')} />
                ) : shifts.length === 0 ? (
                    <EmptyState
                        icon={<Feather name="clock" size={40} color={t.color.textMuted} />}
                        title={tr('No shift logs', 'பணி நேர பதிவுகள் இல்லை')}
                        description={tr('Driver shift records will appear here.', 'ஓட்டுநர் ஷிப்ட் பதிவுகள் இங்கே தோன்றும்.')}
                    />
                ) : (
                    <>
                        <View style={{ flexDirection: 'row', gap: t.spacing.md }}>
                            <Card style={{ flex: 1, alignItems: 'center', gap: 2 }}>
                                <AppText size="xxl" weight="800">{shifts.length}</AppText>
                                <AppText size="sm" muted>{tr('Total', 'மொத்தம்')}</AppText>
                            </Card>
                            <Card style={{ flex: 1, alignItems: 'center', gap: 2 }}>
                                <AppText size="xxl" weight="800" color={t.color.brand}>{active}</AppText>
                                <AppText size="sm" muted>{tr('Active', 'செயலில்')}</AppText>
                            </Card>
                            <Card style={{ flex: 1, alignItems: 'center', gap: 2 }}>
                                <AppText size="xxl" weight="800" color={t.color.success}>{completed}</AppText>
                                <AppText size="sm" muted>{tr('Done', 'முடிந்தது')}</AppText>
                            </Card>
                        </View>

                        {shifts.map((s) => (
                            <Card key={s.id} style={{ gap: t.spacing.xs }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: t.spacing.sm }}>
                                    <AppText size="lg" weight="800" numberOfLines={1} style={{ flex: 1 }}>
                                        {s.driver?.user?.name || tr('Driver', 'ஓட்டுநர்')}
                                    </AppText>
                                    <Badge label={s.status || 'unknown'} tone={toneFor(s.status)} />
                                </View>
                                <InfoRow icon={<Feather name="truck" size={16} color={t.color.textMuted} />} label={tr('Bus', 'பேருந்து')} value={s.bus_number || '—'} />
                                <InfoRow icon={<Feather name="calendar" size={16} color={t.color.textMuted} />} label={tr('Date', 'தேதி')} value={fmtDate(s.date)} />
                                <InfoRow icon={<Feather name="log-in" size={16} color={t.color.success} />} label={tr('Start', 'தொடக்கம்')} value={fmtTime(s.start_time)} />
                                <InfoRow icon={<Feather name="log-out" size={16} color={t.color.warning} />} label={tr('End', 'முடிவு')} value={fmtTime(s.end_time)} />
                                <InfoRow icon={<Feather name="watch" size={16} color={t.color.textMuted} />} label={tr('Duration', 'கால அளவு')} value={duration(s.start_time, s.end_time)} />
                                <InfoRow icon={<Feather name="map" size={16} color={t.color.textMuted} />} label={tr('Total KM', 'மொத்த கி.மீ')} value={s.total_km != null ? `${Number(s.total_km).toFixed(1)} km` : '—'} />
                            </Card>
                        ))}
                    </>
                )}
            </Screen>
        </>
    );
}
