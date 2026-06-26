import React from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import api from '@/lib/api';
import { useTheme } from '@/theme/ThemeProvider';
import { useT } from '@/lib/i18n';
import { Screen, AppText, Card, Loader, EmptyState, Badge } from '@/components/ui';

interface PerSchoolEntry {
    school_id: string;
    name: string;
    plan_name?: string | null;
    bus_count: number;
    student_count: number;
    this_month_amount: number;
    status: string;
}

interface RevenueData {
    total_billed?: number;
    total_collected?: number;
    total_overdue?: number;
    active_schools?: number;
    monthly_revenue?: { month: string; billed: number; collected: number }[];
    per_school?: PerSchoolEntry[];
}

export default function SaRevenue() {
    const t = useTheme();
    const tr = useT();

    const q = useQuery<RevenueData>({
        queryKey: ['sa-revenue'],
        queryFn: async () => {
            const { data } = await api.get('/billing/revenue');
            return data || {};
        },
    });

    if (q.isLoading) return <Loader />;

    const data = q.data || {};
    const mrr = data.total_collected || 0;
    const arr = mrr * 12;
    const overdue = data.total_overdue || 0;
    const perSchool = data.per_school || [];
    const totalStudents = perSchool.reduce((sum, s) => sum + (s.student_count || 0), 0);

    const metrics = [
        { label: tr('MRR', 'மாத வருவாய்'), value: `₹${(mrr / 1000).toFixed(1)}K`, icon: 'dollar-sign' as const, color: t.color.brand },
        { label: tr('ARR Projection', 'ஆண்டு வருவாய்'), value: `₹${(arr / 100000).toFixed(2)}L`, icon: 'trending-up' as const, color: t.color.success },
        { label: tr('Active Schools', 'செயலில் பள்ளிகள்'), value: String(data.active_schools ?? 0), icon: 'home' as const, color: t.color.brand },
        { label: tr('Total Overdue', 'மொத்த தாமதம்'), value: `₹${(overdue / 1000).toFixed(1)}K`, icon: 'alert-circle' as const, color: t.color.danger },
        { label: tr('Total Students', 'மொத்த மாணவர்கள்'), value: totalStudents.toLocaleString('en-IN'), icon: 'users' as const, color: t.color.warning },
    ];

    const months = (data.monthly_revenue || []).filter((m) => m.billed > 0 || m.collected > 0).slice(-6);

    return (
        <>
            <Stack.Screen options={{ title: tr('Revenue', 'வருவாய்') }} />
            <Screen scroll refreshing={q.isRefetching} onRefresh={() => q.refetch()}>
                <AppText size="xl" weight="800">{tr('Revenue Dashboard', 'வருவாய் டாஷ்போர்டு')}</AppText>
                <AppText muted size="sm">{tr('Platform-wide financial overview', 'தளம் முழுவதும் நிதி மேலோட்டம்')}</AppText>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: t.spacing.md }}>
                    {metrics.map((m) => (
                        <Card key={m.label} style={{ width: '47%', flexGrow: 1, gap: 8 }}>
                            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: m.color + '22', alignItems: 'center', justifyContent: 'center' }}>
                                <Feather name={m.icon} size={18} color={m.color} />
                            </View>
                            <AppText size="lg" weight="800">{m.value}</AppText>
                            <AppText size="sm" muted weight="600">{m.label}</AppText>
                        </Card>
                    ))}
                </View>

                {months.length > 0 && (
                    <>
                        <AppText size="lg" weight="800" style={{ marginTop: t.spacing.lg }}>{tr('Monthly Revenue', 'மாத வருவாய்')}</AppText>
                        <View style={{ gap: 8, marginTop: t.spacing.sm }}>
                            {months.map((m) => (
                                <Card key={m.month} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                    <AppText weight="700" style={{ width: 80 }}>{m.month}</AppText>
                                    <View style={{ flex: 1 }}>
                                        <AppText size="sm" muted>{tr('Billed', 'பில்')}: {`₹${(m.billed || 0).toLocaleString('en-IN')}`}</AppText>
                                        <AppText size="sm" color={t.color.success}>{tr('Collected', 'வசூலித்தது')}: {`₹${(m.collected || 0).toLocaleString('en-IN')}`}</AppText>
                                    </View>
                                </Card>
                            ))}
                        </View>
                    </>
                )}

                <AppText size="lg" weight="800" style={{ marginTop: t.spacing.lg }}>{tr('Per-School Breakdown', 'பள்ளி வாரியான பகுப்பாய்வு')}</AppText>
                {perSchool.length === 0 ? (
                    <EmptyState icon="home" title={tr('No school data', 'பள்ளி தரவு இல்லை')} />
                ) : (
                    <View style={{ gap: 10, marginTop: t.spacing.sm }}>
                        {perSchool.map((s) => (
                            <Card key={s.school_id} style={{ gap: 8 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                    <View style={{ flex: 1 }}>
                                        <AppText weight="700" numberOfLines={1}>{s.name}</AppText>
                                        <AppText size="sm" muted>{s.plan_name || 'Basic'}</AppText>
                                    </View>
                                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                                        <AppText weight="800">{s.this_month_amount > 0 ? `₹${s.this_month_amount.toLocaleString('en-IN')}` : '—'}</AppText>
                                        <Badge
                                            tone={s.status === 'paid' ? 'success' : s.status === 'no_invoice' ? 'neutral' : 'warning'}
                                            label={s.status === 'no_invoice' ? tr('No Invoice', 'பில் இல்லை') : s.status}
                                        />
                                    </View>
                                </View>
                                <View style={{ flexDirection: 'row', gap: 16 }}>
                                    <AppText size="sm" muted>{tr('Buses', 'பேருந்துகள்')}: {s.bus_count}</AppText>
                                    <AppText size="sm" muted>{tr('Students', 'மாணவர்கள்')}: {s.student_count}</AppText>
                                </View>
                            </Card>
                        ))}
                    </View>
                )}
            </Screen>
        </>
    );
}
