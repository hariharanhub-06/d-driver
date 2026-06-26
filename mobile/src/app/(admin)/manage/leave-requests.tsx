import React from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useT } from '@/lib/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen, AppText, Card, Loader, EmptyState, Badge, InfoRow } from '@/components/ui';

interface Absence {
    id: string;
    date: string;
    reason?: string | null;
    student?: { id?: string; name?: string; grade?: string | null };
}

function fmtDate(d?: string) {
    if (!d) return '—';
    try {
        return new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
        return d;
    }
}

export default function LeaveRequestsScreen() {
    const tr = useT();
    const t = useTheme();

    const { data, isLoading, refetch, isRefetching } = useQuery<Absence[]>({
        queryKey: ['absence', 'upcoming'],
        queryFn: async () => {
            const { data } = await api.get('/absence', { params: { upcoming: true } });
            return Array.isArray(data?.absences) ? data.absences : [];
        },
    });

    const absences = data ?? [];

    return (
        <>
            <Stack.Screen options={{ title: tr('Leave Requests', 'விடுப்பு கோரிக்கைகள்') }} />
            <Screen scroll refreshing={isRefetching} onRefresh={refetch}>
                <AppText muted size="sm">
                    {tr(
                        'Upcoming absences reported by parents. Students are auto-marked absent on these dates.',
                        'பெற்றோர்கள் தெரிவித்த வரவிருக்கும் விடுப்புகள். இந்த தேதிகளில் மாணவர்கள் தானாக வராதவராக குறிக்கப்படுவர்.',
                    )}
                </AppText>

                {isLoading ? (
                    <Loader label={tr('Loading leave requests…', 'விடுப்பு கோரிக்கைகளை ஏற்றுகிறது…')} />
                ) : absences.length === 0 ? (
                    <EmptyState
                        icon={<Feather name="calendar" size={40} color={t.color.textMuted} />}
                        title={tr('No leave requests', 'விடுப்பு கோரிக்கைகள் இல்லை')}
                        description={tr('Parent-reported absences will appear here.', 'பெற்றோர் தெரிவித்த விடுப்புகள் இங்கே தோன்றும்.')}
                    />
                ) : (
                    absences.map((a) => (
                        <Card key={a.id} style={{ gap: t.spacing.xs }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: t.spacing.sm }}>
                                <AppText size="lg" weight="800" numberOfLines={1} style={{ flex: 1 }}>
                                    {a.student?.name || tr('Student', 'மாணவர்')}
                                </AppText>
                                <Badge label={tr('Absent', 'வராதவர்')} tone="warning" />
                            </View>
                            {a.student?.grade ? (
                                <AppText size="sm" muted>
                                    {tr('Grade', 'வகுப்பு')} {a.student.grade}
                                </AppText>
                            ) : null}
                            <InfoRow icon={<Feather name="calendar" size={16} color={t.color.textMuted} />} label={tr('Date', 'தேதி')} value={fmtDate(a.date)} />
                            <InfoRow icon={<Feather name="message-square" size={16} color={t.color.textMuted} />} label={tr('Reason', 'காரணம்')} value={a.reason || '—'} />
                        </Card>
                    ))
                )}
            </Screen>
        </>
    );
}
