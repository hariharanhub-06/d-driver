import React from 'react';
import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import { getPlatformLanding } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/theme/ThemeProvider';
import { useT } from '@/lib/i18n';
import { Screen, AppText, Card, Loader } from '@/components/ui';

export default function SuperAdminDashboard() {
    const t = useTheme();
    const tr = useT();
    const { user } = useAuth();
    const landing = useQuery({ queryKey: ['platform-landing'], queryFn: getPlatformLanding, refetchInterval: 30000 });

    if (landing.isLoading) return <Loader />;

    const s = landing.data?.stats || ({} as any);
    const stats = [
        { icon: 'home', label: tr('Schools', 'பள்ளிகள்'), value: s.schools ?? 0, color: t.color.brand },
        { icon: 'navigation', label: tr('Buses live', 'நேரடி பேருந்துகள்'), value: s.buses_live ?? 0, color: t.color.success },
        { icon: 'users', label: tr('Parents', 'பெற்றோர்கள்'), value: s.parents ?? 0, color: t.color.warning },
        { icon: 'truck', label: tr('Drivers', 'ஓட்டுநர்கள்'), value: s.drivers ?? 0, color: t.color.brand },
        { icon: 'briefcase', label: tr('Staff & admins', 'ஊழியர்கள்'), value: s.staff_admins ?? 0, color: t.color.success },
    ] as { icon: any; label: string; value: number; color: string }[];

    return (
        <Screen scroll refreshing={landing.isRefetching} onRefresh={() => landing.refetch()}>
            <AppText size="xl" weight="800">{tr('Platform', 'தளம்')}</AppText>
            <AppText muted size="sm">
                {tr('Welcome', 'வரவேற்பு')}{user?.name ? `, ${user.name}` : ''}
            </AppText>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: t.spacing.md }}>
                {stats.map((st, i) => (
                    <Card key={i} style={{ width: '47%', gap: 8 }}>
                        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: st.color + '22', alignItems: 'center', justifyContent: 'center' }}>
                            <Feather name={st.icon} size={18} color={st.color} />
                        </View>
                        <AppText size="xxl" weight="800">{st.value}</AppText>
                        <AppText size="sm" muted>{st.label}</AppText>
                    </Card>
                ))}
            </View>
        </Screen>
    );
}
