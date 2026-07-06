import React from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import { getMySubscription } from '@/lib/api';
import { PLAN_FEATURES, planAllows } from '@/lib/planFeatures';
import { useTheme } from '@/theme/ThemeProvider';
import { useT } from '@/lib/i18n';
import { Screen, AppText, Card, Loader, EmptyState } from '@/components/ui';

export default function ParentSubscription() {
    const t = useTheme();
    const tr = useT();
    const q = useQuery({ queryKey: ['my-subscription'], queryFn: getMySubscription });

    return (
        <>
            <Stack.Screen options={{ title: tr('My Subscription', 'எனது சந்தா') }} />
            {q.isLoading ? (
                <Loader />
            ) : (
                <Screen scroll refreshing={q.isRefetching} onRefresh={() => q.refetch()}>
                    {(!q.data || q.data.length === 0) ? (
                        <EmptyState
                            icon={<Feather name="package" size={40} color={t.color.textMuted} />}
                            title={tr('No individual plan', 'தனிப்பட்ட திட்டம் இல்லை')}
                            description={tr('Your transport is billed through your school.', 'உங்கள் போக்குவரத்து பள்ளி மூலம் கட்டணமிடப்படுகிறது.')}
                        />
                    ) : (
                        q.data.map(s => {
                            const perms = s.plan?.permissions;
                            return (
                                <Card key={s.student_id} style={{ gap: 12 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                        <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: t.color.brand + '22', alignItems: 'center', justifyContent: 'center' }}>
                                            <Feather name="award" size={22} color={t.color.brand} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <AppText weight="800" size="lg" numberOfLines={1}>{s.plan?.name}</AppText>
                                            <AppText muted size="sm" numberOfLines={1}>{s.student_name}</AppText>
                                        </View>
                                    </View>
                                    {s.plan?.description ? <AppText muted size="sm">{s.plan.description}</AppText> : null}
                                    <View style={{ gap: 8 }}>
                                        {PLAN_FEATURES.map(f => {
                                            const included = planAllows(perms, f.key);
                                            return (
                                                <View key={f.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, opacity: included ? 1 : 0.4 }}>
                                                    <Feather name={included ? 'check-circle' : 'x-circle'} size={16} color={included ? t.color.success : t.color.textMuted} />
                                                    <AppText size="sm" weight="600">{f.label}</AppText>
                                                </View>
                                            );
                                        })}
                                    </View>
                                </Card>
                            );
                        })
                    )}
                </Screen>
            )}
        </>
    );
}
