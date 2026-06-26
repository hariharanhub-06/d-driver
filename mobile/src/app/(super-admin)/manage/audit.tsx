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

// Mirrors backend GET /audit/logs → { logs, total, page, limit }.
// Backend query params: action, targetType, schoolId, date_from, date_to, page, limit.
interface AuditLog {
    id: string;
    actor_id: string;
    actor_name?: string;
    actor_email?: string | null;
    actor_role?: string;
    action: string;
    target_type?: string | null;
    target_id?: string | null;
    school_id?: string | null;
    ip_address?: string | null;
    created_at: string;
}

interface ApiResponse {
    logs: AuditLog[];
    total: number;
    page: number;
    limit: number;
}

// Backend stores exact action strings; common ones offered as quick filters.
type ActionFilter = 'all' | 'login' | 'create' | 'update' | 'delete';

function actionTone(action: string): 'success' | 'warning' | 'neutral' {
    const a = (action || '').toLowerCase();
    if (a.startsWith('create')) return 'success';
    if (a.startsWith('delete') || a.startsWith('remove')) return 'warning';
    return 'neutral';
}

function formatTime(iso: string): string {
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

export default function AuditScreen() {
    const tr = useT();
    const t = useTheme();
    const [action, setAction] = React.useState<ActionFilter>('all');

    const { data, isLoading, refetch, isRefetching, isError } = useQuery<ApiResponse>({
        queryKey: ['sa-audit', action],
        queryFn: async () => {
            const params: Record<string, string | number> = { page: 1, limit: 50 };
            if (action !== 'all') params.action = action;
            const res = await api.get('/audit/logs', { params });
            return res.data as ApiResponse;
        },
    });

    const logs = data?.logs ?? [];

    return (
        <>
            <Stack.Screen options={{ title: tr('Audit Trail', 'தணிக்கை பதிவு') }} />
            <Screen scroll refreshing={isRefetching} onRefresh={refetch}>
                <View style={{ gap: t.spacing.md }}>
                    <Select<ActionFilter>
                        label={tr('Filter by action', 'செயல் வாரியாக வடிகட்டு')}
                        value={action}
                        onChange={setAction}
                        options={[
                            { label: tr('All', 'அனைத்தும்'), value: 'all' },
                            { label: tr('Login', 'நுழைவு'), value: 'login' },
                            { label: tr('Create', 'உருவாக்கு'), value: 'create' },
                            { label: tr('Update', 'புதுப்பி'), value: 'update' },
                            { label: tr('Delete', 'நீக்கு'), value: 'delete' },
                        ]}
                    />

                    {isLoading ? (
                        <Loader label={tr('Loading audit log…', 'தணிக்கை பதிவு ஏற்றுகிறது…')} />
                    ) : isError ? (
                        <EmptyState
                            icon={<Feather name="shield" size={28} color={t.color.textMuted} />}
                            title={tr('Could not load audit log', 'தணிக்கை பதிவை ஏற்ற முடியவில்லை')}
                        />
                    ) : logs.length === 0 ? (
                        <EmptyState
                            icon={<Feather name="shield" size={28} color={t.color.textMuted} />}
                            title={tr('No audit events found', 'தணிக்கை நிகழ்வுகள் இல்லை')}
                            description={tr('Try adjusting your filter.', 'வடிகட்டியை சரிசெய்யவும்.')}
                        />
                    ) : (
                        <View style={{ gap: t.spacing.sm }}>
                            {logs.map((log) => (
                                <Card key={log.id} style={{ gap: 6 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: t.spacing.sm }}>
                                        <AppText weight="700" numberOfLines={1} style={{ flex: 1 }}>
                                            {log.actor_name || log.actor_id}
                                        </AppText>
                                        <Badge label={log.action} tone={actionTone(log.action)} />
                                    </View>
                                    {log.actor_email ? (
                                        <AppText size="sm" muted numberOfLines={1}>{log.actor_email}</AppText>
                                    ) : null}
                                    {log.target_type || log.target_id ? (
                                        <AppText size="sm" muted numberOfLines={1}>
                                            {tr('Target', 'இலக்கு')}: {log.target_type || '—'}
                                            {log.target_id ? ` · ${log.target_id}` : ''}
                                        </AppText>
                                    ) : null}
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: t.spacing.sm }}>
                                        <AppText size="sm" muted numberOfLines={1}>
                                            {log.ip_address ? `IP ${log.ip_address}` : (log.school_id ? tr('School', 'பள்ளி') : tr('Platform', 'தளம்'))}
                                        </AppText>
                                        <AppText size="sm" muted>{formatTime(log.created_at)}</AppText>
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
