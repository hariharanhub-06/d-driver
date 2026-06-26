import React from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import api from '@/lib/api';
import { useTheme } from '@/theme/ThemeProvider';
import { useT } from '@/lib/i18n';
import { Screen, AppText, Card, Loader, EmptyState, Badge } from '@/components/ui';

interface School {
    id: string;
    name: string;
    status?: string;
    subscription_plan?: string | null;
    plan_id?: string | null;
}

const PLAN_PRICE: Record<string, number> = { Basic: 9999, Standard: 19999, Enterprise: 49999 };

export default function SaSubscriptions() {
    const t = useTheme();
    const tr = useT();

    const q = useQuery<School[]>({
        queryKey: ['sa-subscriptions-schools'],
        queryFn: async () => {
            const { data } = await api.get('/schools');
            return Array.isArray(data) ? data : [];
        },
    });

    const schools = q.data || [];
    const planName = (s: School) => s.subscription_plan || 'Basic';

    const plans = [
        { id: 'Basic', name: tr('Basic', 'அடிப்படை'), price: 9999 },
        { id: 'Standard', name: tr('Standard', 'நிலையான'), price: 19999 },
        { id: 'Enterprise', name: tr('Enterprise', 'நிறுவனம்'), price: 49999 },
    ].map((p) => ({
        ...p,
        count: schools.filter((s) => planName(s) === p.id).length,
    }));

    const mrr = schools.reduce((acc, s) => acc + (PLAN_PRICE[planName(s)] || 0), 0);

    if (q.isLoading) return <Loader />;

    return (
        <>
            <Stack.Screen options={{ title: tr('Subscriptions', 'சந்தாக்கள்') }} />
            <Screen scroll refreshing={q.isRefetching} onRefresh={() => q.refetch()}>
                <AppText size="xl" weight="800">{tr('Subscriptions', 'சந்தாக்கள்')}</AppText>
                <AppText muted size="sm">{tr('Manage school subscription plans', 'பள்ளி சந்தா திட்டங்களை நிர்வகிக்கவும்')}</AppText>

                <Card style={{ marginTop: t.spacing.md, backgroundColor: t.color.brand, gap: 4 }}>
                    <AppText size="sm" weight="700" color={t.color.brandText}>{tr('Monthly Recurring Revenue', 'மாதாந்திர வருவாய்')}</AppText>
                    <AppText size="xxl" weight="800" color={t.color.brandText}>{`₹${(mrr / 1000).toFixed(1)}K`}</AppText>
                </Card>

                <View style={{ gap: 12, marginTop: t.spacing.lg }}>
                    {plans.map((p) => (
                        <Card key={p.id} style={{ gap: 8 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: t.color.brand + '22', alignItems: 'center', justifyContent: 'center' }}>
                                    <Feather name="shield" size={18} color={t.color.brand} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <AppText weight="800">{p.name}</AppText>
                                    <AppText size="sm" muted>{`₹${p.price.toLocaleString('en-IN')}/${tr('mo', 'மா')}`}</AppText>
                                </View>
                                <Badge tone="neutral" label={`${p.count} ${tr('schools', 'பள்ளிகள்')}`} />
                            </View>
                        </Card>
                    ))}
                </View>

                <AppText size="lg" weight="800" style={{ marginTop: t.spacing.lg }}>{tr('Schools', 'பள்ளிகள்')}</AppText>
                {schools.length === 0 ? (
                    <EmptyState icon="home" title={tr('No schools yet', 'பள்ளிகள் இல்லை')} />
                ) : (
                    <View style={{ gap: 10, marginTop: t.spacing.sm }}>
                        {schools.map((s) => {
                            const active = (s.status || 'active') === 'active';
                            return (
                                <Card key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                    <View style={{ flex: 1 }}>
                                        <AppText weight="700" numberOfLines={1}>{s.name}</AppText>
                                        <AppText size="sm" muted>{planName(s)}</AppText>
                                    </View>
                                    <Badge tone={active ? 'success' : 'neutral'} label={active ? tr('Active', 'செயலில்') : (s.status || tr('Inactive', 'செயலற்ற'))} />
                                </Card>
                            );
                        })}
                    </View>
                )}
            </Screen>
        </>
    );
}
