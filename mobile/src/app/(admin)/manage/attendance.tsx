import React from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useT } from '@/lib/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen, AppText, Card, Loader, EmptyState, Badge } from '@/components/ui';

interface AttendanceRecord {
    id?: string;
    student?: { id?: string; name?: string; grade?: string | null; stop?: { name?: string } };
    status: 'present' | 'absent' | 'missed' | null;
    stop?: { name?: string };
    marked_at?: string;
    note?: string | null;
}

function fmtTime(d?: string) {
    if (!d) return '—';
    try {
        return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
        return '—';
    }
}

export default function AttendanceScreen() {
    const tr = useT();
    const t = useTheme();
    const today = new Date().toLocaleDateString('en-CA');

    const { data, isLoading, refetch, isRefetching } = useQuery<AttendanceRecord[]>({
        queryKey: ['attendance', today],
        queryFn: async () => {
            const { data } = await api.get('/attendance', { params: { date: today } });
            return Array.isArray(data) ? data : [];
        },
    });

    const records = data ?? [];
    const present = records.filter((r) => r.status === 'present').length;
    const absent = records.filter((r) => r.status === 'absent' || r.status === 'missed').length;

    const toneFor = (s: AttendanceRecord['status']) => (s === 'present' ? 'success' : s ? 'warning' : 'neutral');
    const statusLabel = (s: AttendanceRecord['status']) =>
        s === 'present' ? tr('Present', 'வந்தார்') : s === 'absent' ? tr('Absent', 'வரவில்லை') : s === 'missed' ? tr('Missed', 'தவறவிட்டது') : tr('Not Marked', 'குறிக்கப்படவில்லை');

    return (
        <>
            <Stack.Screen options={{ title: tr('Attendance', 'வருகை') }} />
            <Screen scroll refreshing={isRefetching} onRefresh={refetch}>
                <AppText muted size="sm">
                    {new Date(today).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </AppText>

                {isLoading ? (
                    <Loader label={tr('Loading attendance…', 'வருகையை ஏற்றுகிறது…')} />
                ) : (
                    <>
                        <View style={{ flexDirection: 'row', gap: t.spacing.md }}>
                            <Card style={{ flex: 1, alignItems: 'center', gap: 2 }}>
                                <AppText size="xxl" weight="800" color={t.color.success}>{present}</AppText>
                                <AppText size="sm" muted>{tr('Present', 'வந்தவர்')}</AppText>
                            </Card>
                            <Card style={{ flex: 1, alignItems: 'center', gap: 2 }}>
                                <AppText size="xxl" weight="800" color={t.color.danger}>{absent}</AppText>
                                <AppText size="sm" muted>{tr('Absent', 'வராதவர்')}</AppText>
                            </Card>
                            <Card style={{ flex: 1, alignItems: 'center', gap: 2 }}>
                                <AppText size="xxl" weight="800">{records.length}</AppText>
                                <AppText size="sm" muted>{tr('Total', 'மொத்தம்')}</AppText>
                            </Card>
                        </View>

                        {records.length === 0 ? (
                            <EmptyState
                                icon={<Feather name="check-square" size={40} color={t.color.textMuted} />}
                                title={tr('No attendance records', 'வருகை பதிவுகள் இல்லை')}
                                description={tr('Records for today will appear here.', 'இன்றைய பதிவுகள் இங்கே தோன்றும்.')}
                            />
                        ) : (
                            records.map((r, i) => (
                                <Card key={r.id || i} style={{ gap: 4 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: t.spacing.sm }}>
                                        <View style={{ flex: 1, minWidth: 0 }}>
                                            <AppText weight="700" numberOfLines={1}>{r.student?.name || '—'}</AppText>
                                            <AppText size="sm" muted numberOfLines={1}>
                                                {(r.student?.grade ? `${tr('Grade', 'வகுப்பு')} ${r.student.grade} · ` : '')}
                                                {r.stop?.name || r.student?.stop?.name || tr('No stop', 'நிறுத்தம் இல்லை')}
                                            </AppText>
                                        </View>
                                        <View style={{ alignItems: 'flex-end', gap: 4 }}>
                                            <Badge label={statusLabel(r.status)} tone={toneFor(r.status)} />
                                            <AppText size="sm" muted>{fmtTime(r.marked_at)}</AppText>
                                        </View>
                                    </View>
                                    {r.note ? (
                                        <AppText size="sm" muted numberOfLines={2}>{r.note}</AppText>
                                    ) : null}
                                </Card>
                            ))
                        )}
                    </>
                )}
            </Screen>
        </>
    );
}
