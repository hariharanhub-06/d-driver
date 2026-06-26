import React, { useMemo, useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { getMyChildren, type Child } from '@/lib/api';
import { useT } from '@/lib/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen, AppText, Card, Loader, EmptyState, Badge } from '@/components/ui';

interface AttendanceRecord {
    date: string;
    status: 'present' | 'absent' | 'holiday';
    note?: string;
    marked_at?: string;
    stop_name?: string;
}

const monthStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export default function ParentAttendanceScreen() {
    const tr = useT();
    const t = useTheme();
    const month = monthStr(new Date());

    const childrenQ = useQuery({ queryKey: ['children'], queryFn: getMyChildren });
    const children = Array.isArray(childrenQ.data) ? childrenQ.data : [];

    const [activeId, setActiveId] = useState<string | null>(null);
    const child: Child | undefined = children.find((c) => c.id === activeId) || children[0];

    const attQ = useQuery({
        queryKey: ['parent-attendance', child?.id, month],
        queryFn: async () => (await api.get(`/attendance?student_id=${child!.id}&month=${month}`)).data as AttendanceRecord[],
        enabled: !!child?.id,
    });

    const records = useMemo(() => {
        const r = Array.isArray(attQ.data) ? attQ.data : [];
        return [...r].sort((a, b) => +new Date(b.date) - +new Date(a.date));
    }, [attQ.data]);

    const stats = useMemo(() => {
        const present = records.filter((r) => r.status === 'present').length;
        const absent = records.filter((r) => r.status === 'absent').length;
        const total = present + absent;
        const pct = total > 0 ? Math.round((present / total) * 100) : 0;
        return { present, absent, total, pct };
    }, [records]);

    if (childrenQ.isLoading) {
        return (
            <>
                <Stack.Screen options={{ title: tr('Attendance', 'வருகை') }} />
                <Screen><Loader label={tr('Loading…', 'ஏற்றுகிறது…')} /></Screen>
            </>
        );
    }

    if (children.length === 0) {
        return (
            <>
                <Stack.Screen options={{ title: tr('Attendance', 'வருகை') }} />
                <Screen>
                    <EmptyState
                        icon={<Feather name="users" size={40} color={t.color.textMuted} />}
                        title={tr('No children linked', 'குழந்தைகள் இணைக்கப்படவில்லை')}
                    />
                </Screen>
            </>
        );
    }

    return (
        <>
            <Stack.Screen options={{ title: tr('Attendance', 'வருகை') }} />
            <Screen scroll refreshing={attQ.isFetching} onRefresh={() => attQ.refetch()}>
                {children.length > 1 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                        {children.map((c) => {
                            const active = c.id === child?.id;
                            return (
                                <Pressable
                                    key={c.id}
                                    onPress={() => setActiveId(c.id)}
                                    style={{
                                        paddingHorizontal: 16,
                                        paddingVertical: 9,
                                        borderRadius: t.radius.pill,
                                        backgroundColor: active ? t.color.brand : t.color.surface,
                                        borderWidth: 1,
                                        borderColor: active ? t.color.brand : t.color.border,
                                    }}
                                >
                                    <AppText weight="700" size="sm" color={active ? t.color.brandText : t.color.text}>{c.name}</AppText>
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                ) : null}

                <Card style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' }}>
                    <View style={{ alignItems: 'center', gap: 2 }}>
                        <AppText size="xl" weight="800" color={t.color.success}>{stats.present}</AppText>
                        <AppText size="sm" muted>{tr('Present', 'வந்தது')}</AppText>
                    </View>
                    <View style={{ alignItems: 'center', gap: 2 }}>
                        <AppText size="xl" weight="800" color={t.color.danger}>{stats.absent}</AppText>
                        <AppText size="sm" muted>{tr('Absent', 'வரவில்லை')}</AppText>
                    </View>
                    <View style={{ alignItems: 'center', gap: 2 }}>
                        <AppText size="xl" weight="800" color={t.color.brand}>{stats.pct}%</AppText>
                        <AppText size="sm" muted>{tr('Rate', 'விகிதம்')}</AppText>
                    </View>
                </Card>

                {attQ.isLoading ? (
                    <Loader />
                ) : records.length === 0 ? (
                    <EmptyState
                        icon={<Feather name="check-square" size={40} color={t.color.textMuted} />}
                        title={tr('No attendance yet', 'வருகை பதிவு இல்லை')}
                        description={tr('Records for this month will appear here.', 'இந்த மாத பதிவுகள் இங்கே தோன்றும்.')}
                    />
                ) : (
                    records.map((r, i) => {
                        const present = r.status === 'present';
                        const absent = r.status === 'absent';
                        return (
                            <Card key={`${r.date}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.md }}>
                                <Feather
                                    name={present ? 'check-circle' : absent ? 'x-circle' : 'minus-circle'}
                                    size={20}
                                    color={present ? t.color.success : absent ? t.color.danger : t.color.textMuted}
                                />
                                <View style={{ flex: 1 }}>
                                    <AppText weight="700">
                                        {new Date(r.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                                    </AppText>
                                    {(r.stop_name || r.note) ? (
                                        <AppText size="sm" muted numberOfLines={1}>
                                            {[r.stop_name, r.note].filter(Boolean).join(' · ')}
                                        </AppText>
                                    ) : null}
                                </View>
                                <Badge
                                    label={tr(present ? 'Present' : absent ? 'Absent' : 'Holiday', present ? 'வந்தது' : absent ? 'வரவில்லை' : 'விடுமுறை')}
                                    tone={present ? 'success' : absent ? 'warning' : 'neutral'}
                                />
                            </Card>
                        );
                    })
                )}
            </Screen>
        </>
    );
}
