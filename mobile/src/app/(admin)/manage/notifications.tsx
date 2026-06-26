import React, { useMemo } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useT } from '@/lib/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen, AppText, Button, Card, Loader, EmptyState, Badge } from '@/components/ui';
import { ListRow } from '@/components/form';

// NOTE: the backend exposes no admin "send/broadcast" endpoint — notificationRoutes
// only supports reading the current user's notifications and marking them read.
// (System events such as fee reminders are emitted by other actions, e.g. the
// "Remind All" button on the Fees screen.) This screen therefore shows the
// notification history with read/mark-read controls, mirroring the web admin page.
interface Notification {
    id: string;
    type?: 'alert' | 'info' | 'success';
    title?: string;
    message: string;
    is_read: boolean;
    created_at: string;
}

function timeAgo(ts: string): string {
    const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
}

export default function ManageNotificationsScreen() {
    const tr = useT();
    const t = useTheme();
    const qc = useQueryClient();

    const notifQ = useQuery({
        queryKey: ['admin-notifications'],
        queryFn: async () => (await api.get('/notifications')).data as Notification[],
    });

    const items = Array.isArray(notifQ.data) ? notifQ.data : [];
    const unread = useMemo(() => items.filter((n) => !n.is_read).length, [items]);

    const markRead = async (id: string) => {
        try {
            await api.put(`/notifications/${id}/read`);
            qc.invalidateQueries({ queryKey: ['admin-notifications'] });
        } catch {
            // optimistic-ish — ignore failure
        }
    };

    const markAllRead = async () => {
        try {
            await api.post('/notifications/mark-all-read');
            qc.invalidateQueries({ queryKey: ['admin-notifications'] });
        } catch (e: any) {
            Alert.alert(tr('Error', 'பிழை'), e?.response?.data?.error || tr('Could not mark all read.', 'முடியவில்லை.'));
        }
    };

    const toneFor = (type?: string): 'success' | 'warning' | 'neutral' =>
        type === 'success' ? 'success' : type === 'alert' ? 'warning' : 'neutral';
    const iconFor = (type?: string): any =>
        type === 'success' ? 'check-circle' : type === 'alert' ? 'alert-circle' : 'info';

    if (notifQ.isLoading) {
        return (
            <>
                <Stack.Screen options={{ title: tr('Notifications', 'அறிவிப்புகள்') }} />
                <Screen><Loader label={tr('Loading…', 'ஏற்றுகிறது…')} /></Screen>
            </>
        );
    }

    return (
        <>
            <Stack.Screen options={{ title: tr('Notifications', 'அறிவிப்புகள்') }} />
            <Screen scroll refreshing={notifQ.isFetching} onRefresh={() => notifQ.refetch()}>
                {unread > 0 ? (
                    <Button
                        title={tr(`Mark all read (${unread})`, `அனைத்தையும் படித்ததாக (${unread})`)}
                        onPress={markAllRead}
                        variant="secondary"
                        icon={<Feather name="check" size={16} color={t.color.text} />}
                    />
                ) : null}

                {items.length === 0 ? (
                    <EmptyState
                        icon={<Feather name="bell" size={40} color={t.color.textMuted} />}
                        title={tr('No notifications yet', 'அறிவிப்புகள் இல்லை')}
                        description={tr('System alerts and updates appear here.', 'கணினி அறிவிப்புகள் இங்கே தோன்றும்.')}
                    />
                ) : (
                    items.map((n) => (
                        <Card key={n.id} style={{ gap: t.spacing.xs, borderLeftWidth: n.is_read ? 0 : 3, borderLeftColor: t.color.brand }}>
                            <ListRow
                                leadingIcon={iconFor(n.type)}
                                title={n.title || n.message}
                                subtitle={n.title ? n.message : undefined}
                                right={
                                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                                        <AppText size="sm" muted>{timeAgo(n.created_at)}</AppText>
                                        {n.type ? <Badge label={n.type} tone={toneFor(n.type)} /> : null}
                                    </View>
                                }
                            />
                            {!n.is_read ? (
                                <Pressable onPress={() => markRead(n.id)} hitSlop={6} style={{ alignSelf: 'flex-start' }}>
                                    <AppText size="sm" weight="700" color={t.color.brand}>{tr('Mark as read', 'படித்ததாக குறி')}</AppText>
                                </Pressable>
                            ) : null}
                        </Card>
                    ))
                )}
            </Screen>
        </>
    );
}
