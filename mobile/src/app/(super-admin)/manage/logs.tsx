import React from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useT } from '@/lib/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen, AppText, Card, Loader, EmptyState, Badge } from '@/components/ui';

// The web System Logs page is a static placeholder with no dedicated endpoint.
// Closest real source is the audit log feed (GET /audit/logs); each entry is
// rendered here as a system log line with a derived severity level Badge.
interface AuditLog {
    id: string;
    actor_id: string;
    actor_name?: string;
    action: string;
    target_type?: string | null;
    created_at: string;
}

interface ApiResponse {
    logs: AuditLog[];
    total: number;
    page: number;
    limit: number;
}

type Level = 'info' | 'warn' | 'error';

function levelFor(action: string): Level {
    const a = (action || '').toLowerCase();
    if (a.startsWith('delete') || a.startsWith('remove')) return 'error';
    if (a.startsWith('update') || a.startsWith('edit')) return 'warn';
    return 'info';
}

const LEVEL_TONE: Record<Level, 'success' | 'warning' | 'neutral'> = {
    info: 'neutral',
    warn: 'warning',
    error: 'warning',
};

const LEVEL_LABEL: Record<Level, string> = {
    info: 'INFO',
    warn: 'WARN',
    error: 'ERROR',
};

function formatTime(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
    });
}

export default function LogsScreen() {
    const tr = useT();
    const t = useTheme();

    const { data, isLoading, refetch, isRefetching, isError } = useQuery<ApiResponse>({
        queryKey: ['sa-logs'],
        queryFn: async () => {
            const res = await api.get('/audit/logs', { params: { page: 1, limit: 50 } });
            return res.data as ApiResponse;
        },
    });

    const logs = data?.logs ?? [];

    return (
        <>
            <Stack.Screen options={{ title: tr('System Logs', 'கணினி பதிவுகள்') }} />
            <Screen scroll refreshing={isRefetching} onRefresh={refetch}>
                {isLoading ? (
                    <Loader label={tr('Loading logs…', 'பதிவுகள் ஏற்றுகிறது…')} />
                ) : isError ? (
                    <EmptyState
                        icon={<Feather name="list" size={28} color={t.color.textMuted} />}
                        title={tr('Could not load logs', 'பதிவுகளை ஏற்ற முடியவில்லை')}
                    />
                ) : logs.length === 0 ? (
                    <EmptyState
                        icon={<Feather name="list" size={28} color={t.color.textMuted} />}
                        title={tr('No logs found', 'பதிவுகள் இல்லை')}
                        description={tr('Fresh platform events will appear here.', 'புதிய நிகழ்வுகள் இங்கே தோன்றும்.')}
                    />
                ) : (
                    <View style={{ gap: t.spacing.sm }}>
                        {logs.map((log) => {
                            const level = levelFor(log.action);
                            return (
                                <Card key={log.id} style={{ gap: 6 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: t.spacing.sm }}>
                                        <Badge label={LEVEL_LABEL[level]} tone={LEVEL_TONE[level]} />
                                        <AppText size="sm" muted>{formatTime(log.created_at)}</AppText>
                                    </View>
                                    <AppText weight="600" numberOfLines={2}>
                                        {log.action}{log.target_type ? ` · ${log.target_type}` : ''}
                                    </AppText>
                                    <AppText size="sm" muted numberOfLines={1}>
                                        {tr('Actor', 'செயல்படுத்தியவர்')}: {log.actor_name || log.actor_id}
                                    </AppText>
                                </Card>
                            );
                        })}
                    </View>
                )}
            </Screen>
        </>
    );
}
