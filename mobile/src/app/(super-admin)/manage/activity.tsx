import React from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useT } from '@/lib/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen, AppText, Card, Loader, EmptyState, Badge } from '@/components/ui';
import { Select } from '@/components/form';

// Mirrors backend GET /audit/login-activity → { logs, total, page, limit }.
// Each log: actor_id, actor_name, actor_email, actor_role, action, ip_address, created_at.
interface LoginLog {
    id: string;
    actor_id: string;
    actor_name?: string;
    actor_email?: string | null;
    actor_role?: string;
    action?: string;
    ip_address?: string | null;
    created_at: string;
    school_id?: string | null;
}

interface ApiResponse {
    logs: LoginLog[];
    total: number;
    page: number;
    limit: number;
}

type RoleFilter = 'all' | 'super_admin' | 'admin' | 'driver' | 'parent';

const ROLE_LABEL: Record<string, string> = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    driver: 'Driver',
    parent: 'Parent',
};

function formatDateTime(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}

export default function ActivityScreen() {
    const tr = useT();
    const t = useTheme();
    const [role, setRole] = React.useState<RoleFilter>('all');

    const { data, isLoading, refetch, isRefetching, isError } = useQuery<ApiResponse>({
        queryKey: ['sa-activity', role],
        queryFn: async () => {
            const params: Record<string, string | number> = { page: 1, limit: 50 };
            if (role !== 'all') params.role = role;
            const res = await api.get('/audit/login-activity', { params });
            return res.data as ApiResponse;
        },
    });

    const logs = data?.logs ?? [];

    return (
        <>
            <Stack.Screen options={{ title: tr('Activity', 'செயல்பாடு') }} />
            <Screen scroll refreshing={isRefetching} onRefresh={refetch}>
                <View style={{ gap: t.spacing.md }}>
                    <Select<RoleFilter>
                        label={tr('Filter by role', 'பணி வாரியாக வடிகட்டு')}
                        value={role}
                        onChange={setRole}
                        options={[
                            { label: tr('All', 'அனைத்தும்'), value: 'all' },
                            { label: tr('Super Admin', 'சூப்பர் அட்மின்'), value: 'super_admin' },
                            { label: tr('Admin', 'அட்மின்'), value: 'admin' },
                            { label: tr('Driver', 'ஓட்டுநர்'), value: 'driver' },
                            { label: tr('Parent', 'பெற்றோர்'), value: 'parent' },
                        ]}
                    />

                    {isLoading ? (
                        <Loader label={tr('Loading activity…', 'செயல்பாடு ஏற்றுகிறது…')} />
                    ) : isError ? (
                        <EmptyState
                            icon={<Feather name="activity" size={28} color={t.color.textMuted} />}
                            title={tr('Could not load activity', 'செயல்பாட்டை ஏற்ற முடியவில்லை')}
                        />
                    ) : logs.length === 0 ? (
                        <EmptyState
                            icon={<Feather name="activity" size={28} color={t.color.textMuted} />}
                            title={tr('No activity yet', 'இன்னும் செயல்பாடு இல்லை')}
                            description={tr('Recent platform logins will appear here.', 'சமீபத்திய நுழைவுகள் இங்கே தோன்றும்.')}
                        />
                    ) : (
                        <View style={{ gap: t.spacing.sm }}>
                            {logs.map((log) => (
                                <Card key={log.id} style={{ gap: 6 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: t.spacing.sm }}>
                                        <AppText weight="700" numberOfLines={1} style={{ flex: 1 }}>
                                            {log.actor_name || log.actor_id}
                                        </AppText>
                                        <Badge label={ROLE_LABEL[log.actor_role ?? ''] ?? (log.actor_role || '—')} tone="neutral" />
                                    </View>
                                    {log.actor_email ? (
                                        <AppText size="sm" muted numberOfLines={1}>{log.actor_email}</AppText>
                                    ) : null}
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: t.spacing.sm }}>
                                        <AppText size="sm" muted numberOfLines={1}>
                                            {log.ip_address ? `IP ${log.ip_address}` : tr('Login', 'நுழைவு')}
                                        </AppText>
                                        <AppText size="sm" muted>{formatDateTime(log.created_at)}</AppText>
                                    </View>
                                </Card>
                            ))}
                        </View>
                    )}
                </View>
            </Screen>
        </>
    );
}
