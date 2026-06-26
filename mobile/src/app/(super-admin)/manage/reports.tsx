import React from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useT } from '@/lib/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen, AppText, Card, Loader, EmptyState } from '@/components/ui';

// Mirrors backend GET /dashboard/stats — fields: students, buses, drivers,
// routes, active_trips, today_absences, pending_fees.
interface DashboardStats {
    students?: number;
    buses?: number;
    drivers?: number;
    routes?: number;
    active_trips?: number;
    today_absences?: number;
    pending_fees?: number;
}

export default function ReportsScreen() {
    const tr = useT();
    const t = useTheme();

    const { data, isLoading, refetch, isRefetching, isError } = useQuery<DashboardStats>({
        queryKey: ['sa-reports', 'dashboard-stats'],
        queryFn: async () => {
            const res = await api.get('/dashboard/stats');
            return res.data as DashboardStats;
        },
    });

    const metrics: { label: string; value: string; icon: any }[] = [
        { label: tr('Total Students', 'மொத்த மாணவர்கள்'), value: String(data?.students ?? 0), icon: 'users' },
        { label: tr('Total Buses', 'மொத்த பேருந்துகள்'), value: String(data?.buses ?? 0), icon: 'truck' },
        { label: tr('Total Drivers', 'மொத்த ஓட்டுநர்கள்'), value: String(data?.drivers ?? 0), icon: 'user' },
        { label: tr('Active Routes', 'செயலில் உள்ள வழிகள்'), value: String(data?.routes ?? 0), icon: 'map' },
        { label: tr('Active Trips', 'செயலில் உள்ள பயணங்கள்'), value: String(data?.active_trips ?? 0), icon: 'navigation' },
        { label: tr("Today's Absences", 'இன்றைய வராதவர்கள்'), value: String(data?.today_absences ?? 0), icon: 'user-x' },
        { label: tr('Pending Fees', 'நிலுவை கட்டணம்'), value: `₹${Number(data?.pending_fees ?? 0).toLocaleString('en-IN')}`, icon: 'credit-card' },
    ];

    return (
        <>
            <Stack.Screen options={{ title: tr('Reports', 'அறிக்கைகள்') }} />
            <Screen scroll refreshing={isRefetching} onRefresh={refetch}>
                {isLoading ? (
                    <Loader label={tr('Loading reports…', 'அறிக்கைகள் ஏற்றுகிறது…')} />
                ) : isError ? (
                    <EmptyState
                        icon={<Feather name="bar-chart-2" size={28} color={t.color.textMuted} />}
                        title={tr('No data available', 'தரவு இல்லை')}
                        description={tr('Could not load platform reports.', 'தள அறிக்கைகளை ஏற்ற முடியவில்லை.')}
                    />
                ) : (
                    <View style={{ gap: t.spacing.md }}>
                        <AppText size="sm" muted>
                            {tr('Platform analytics overview', 'தள பகுப்பாய்வு சுருக்கம்')}
                        </AppText>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.md }}>
                            {metrics.map((m) => (
                                <Card key={m.label} style={{ flexGrow: 1, flexBasis: '46%', gap: t.spacing.sm }}>
                                    <View
                                        style={{
                                            width: 38,
                                            height: 38,
                                            borderRadius: t.radius.md,
                                            backgroundColor: t.color.brand + '22',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <Feather name={m.icon} size={18} color={t.color.brand} />
                                    </View>
                                    <AppText size="xl" weight="800">{m.value}</AppText>
                                    <AppText size="sm" muted numberOfLines={2}>{m.label}</AppText>
                                </Card>
                            ))}
                        </View>
                    </View>
                )}
            </Screen>
        </>
    );
}
