import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import { getSchools } from '@/lib/api';
import { useTheme } from '@/theme/ThemeProvider';
import { useT } from '@/lib/i18n';
import { Screen, AppText, Loader, EmptyState, Badge } from '@/components/ui';
import { ListRow } from '@/components/form';

export default function SuperAdminSchools() {
    const t = useTheme();
    const tr = useT();
    const router = useRouter();
    const q = useQuery({ queryKey: ['sa-schools'], queryFn: getSchools });

    if (q.isLoading) return <Loader />;
    const schools = q.data || [];

    return (
        <Screen scroll refreshing={q.isRefetching} onRefresh={() => q.refetch()}>
            <AppText size="xl" weight="800">{tr('Schools', 'பள்ளிகள்')}</AppText>
            <AppText muted size="sm">{tr('Tap a school to drill in', 'விவரங்களுக்கு தட்டவும்')}</AppText>

            {schools.length === 0 ? (
                <EmptyState icon={<Feather name="home" size={28} color={t.color.textMuted} />} title={tr('No schools yet', 'பள்ளிகள் இல்லை')} />
            ) : (
                <View style={{ gap: 10, marginTop: t.spacing.md }}>
                    {schools.map((sc) => {
                        const active = (sc.status || 'active') === 'active';
                        const c = sc._count || {};
                        const bits = [
                            c.students != null ? `${c.students} ${tr('students', 'மாணவர்கள்')}` : null,
                            c.buses != null ? `${c.buses} ${tr('buses', 'பேருந்துகள்')}` : null,
                        ].filter(Boolean).join(' · ');
                        return (
                            <ListRow
                                key={sc.id}
                                leadingIcon="home"
                                title={sc.name}
                                subtitle={bits || sc.city || undefined}
                                right={<Badge tone={active ? 'success' : 'neutral'} label={active ? tr('Active', 'செயலில்') : (sc.status || tr('Inactive', 'செயலற்ற'))} />}
                                onPress={() => router.push(`/(super-admin)/schools/${sc.id}` as any)}
                            />
                        );
                    })}
                </View>
            )}
        </Screen>
    );
}
