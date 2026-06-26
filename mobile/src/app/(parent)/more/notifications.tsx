import React from 'react';
import { View, Pressable } from 'react-native';
import { Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useT } from '@/lib/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen, AppText, Card, Button, Loader, EmptyState } from '@/components/ui';

interface Notif {
    id: string;
    message: string;
    type?: 'alert' | 'info' | 'success' | string;
    is_read: boolean;
    created_at: string;
}

const iconFor = (type?: string): any => {
    if (type === 'success') return 'check-circle';
    if (type === 'alert') return 'alert-triangle';
    return 'info';
};

export default function ParentNotificationsScreen() {
    const tr = useT();
    const t = useTheme();
    const qc = useQueryClient();

    const notifQ = useQuery({
        queryKey: ['parent-notifications'],
        queryFn: async () => {
            const { data } = await api.get('/notifications');
            return (Array.isArray(data) ? data : data?.notifications || []) as Notif[];
        },
    });

    const notifications = Array.isArray(notifQ.data) ? notifQ.data : [];
    const unread = notifications.filter((n) => !n.is_read).length;

    const markRead = async (id: string) => {
        try {
            await api.put(`/notifications/${id}/read`);
            qc.invalidateQueries({ queryKey: ['parent-notifications'] });
        } catch { /* best effort */ }
    };

    const markAllRead = async () => {
        try {
            await api.post('/notifications/mark-all-read');
            qc.invalidateQueries({ queryKey: ['parent-notifications'] });
        } catch { /* best effort */ }
    };

    const fmt = (ts: string) => {
        try {
            return new Date(ts).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
        } catch {
            return '';
        }
    };

    const toneColor = (type?: string) =>
        type === 'success' ? t.color.success : type === 'alert' ? t.color.danger : t.color.brand;

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
                        variant="secondary"
                        onPress={markAllRead}
                        icon={<Feather name="check" size={15} color={t.color.text} />}
                    />
                ) : null}

                {notifications.length === 0 ? (
                    <EmptyState
                        icon={<Feather name="bell-off" size={40} color={t.color.textMuted} />}
                        title={tr('No notifications', 'அறிவிப்புகள் இல்லை')}
                        description={tr('Bus updates and alerts will appear here.', 'பேருந்து புதுப்பிப்புகள் இங்கே தோன்றும்.')}
                    />
                ) : (
                    notifications.map((n) => (
                        <Pressable key={n.id} onPress={() => !n.is_read && markRead(n.id)} disabled={n.is_read}>
                            <Card
                                style={{
                                    flexDirection: 'row',
                                    gap: t.spacing.md,
                                    opacity: n.is_read ? 0.65 : 1,
                                    borderLeftWidth: n.is_read ? 0 : 3,
                                    borderLeftColor: toneColor(n.type),
                                }}
                            >
                                <Feather name={iconFor(n.type)} size={18} color={toneColor(n.type)} style={{ marginTop: 2 }} />
                                <View style={{ flex: 1, gap: 4 }}>
                                    <AppText weight={n.is_read ? '600' : '700'}>{n.message}</AppText>
                                    <AppText size="sm" muted>{fmt(n.created_at)}</AppText>
                                </View>
                                {!n.is_read ? (
                                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.color.brand, marginTop: 6 }} />
                                ) : null}
                            </Card>
                        </Pressable>
                    ))
                )}
            </Screen>
        </>
    );
}
