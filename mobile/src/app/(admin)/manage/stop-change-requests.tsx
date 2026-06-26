import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useT } from '@/lib/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen, AppText, Card, Button, Loader, EmptyState, Badge, InfoRow } from '@/components/ui';
import { Field } from '@/components/form';

type Status = 'pending' | 'approved' | 'rejected';

interface StopChangeRequest {
    id: string;
    student?: { name?: string; grade?: string | null };
    currentStop?: { name?: string };
    requestedStop?: { name?: string };
    change_type?: string;
    effective_date?: string;
    reason?: string | null;
    status: Status;
    created_at?: string;
}

const toneFor = (s: Status) => (s === 'approved' ? 'success' : s === 'rejected' ? 'warning' : 'neutral');

function fmtDate(d?: string) {
    if (!d) return '—';
    try {
        return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
        return d;
    }
}

export default function StopChangeRequestsScreen() {
    const tr = useT();
    const t = useTheme();
    const qc = useQueryClient();
    const [notes, setNotes] = useState<Record<string, string>>({});

    const { data, isLoading, refetch, isRefetching } = useQuery<StopChangeRequest[]>({
        queryKey: ['stop-change'],
        queryFn: async () => {
            const { data } = await api.get('/stop-change');
            return Array.isArray(data?.requests) ? data.requests : [];
        },
    });

    const decide = useMutation({
        mutationFn: async ({ id, action, admin_note }: { id: string; action: 'approve' | 'reject'; admin_note?: string }) => {
            await api.put(`/stop-change/${id}/${action}`, { admin_note: admin_note || undefined });
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['stop-change'] }),
        onError: (e: any) =>
            Alert.alert(tr('Error', 'பிழை'), e?.response?.data?.details || e?.response?.data?.error || tr('Action failed', 'செயல் தோல்வியடைந்தது')),
    });

    const requests = data ?? [];

    return (
        <>
            <Stack.Screen options={{ title: tr('Stop Change Requests', 'நிறுத்த மாற்ற கோரிக்கைகள்') }} />
            <Screen scroll refreshing={isRefetching} onRefresh={refetch}>
                {isLoading ? (
                    <Loader label={tr('Loading requests…', 'கோரிக்கைகளை ஏற்றுகிறது…')} />
                ) : requests.length === 0 ? (
                    <EmptyState
                        icon={<Feather name="map-pin" size={40} color={t.color.textMuted} />}
                        title={tr('No stop change requests', 'நிறுத்த மாற்ற கோரிக்கைகள் இல்லை')}
                        description={tr('Parent stop change requests will appear here.', 'பெற்றோர் கோரிக்கைகள் இங்கே தோன்றும்.')}
                    />
                ) : (
                    requests.map((r) => {
                        const pending = r.status === 'pending';
                        return (
                            <Card key={r.id} style={{ gap: t.spacing.xs }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: t.spacing.sm }}>
                                    <AppText size="lg" weight="800" numberOfLines={1} style={{ flex: 1 }}>
                                        {r.student?.name || tr('Student', 'மாணவர்')}
                                    </AppText>
                                    <Badge label={r.status} tone={toneFor(r.status)} />
                                </View>
                                <InfoRow icon={<Feather name="map-pin" size={16} color={t.color.textMuted} />} label={tr('Current Stop', 'தற்போதைய நிறுத்தம்')} value={r.currentStop?.name || '—'} />
                                <InfoRow icon={<Feather name="navigation" size={16} color={t.color.brand} />} label={tr('Requested Stop', 'கோரப்பட்ட நிறுத்தம்')} value={r.requestedStop?.name || '—'} />
                                <InfoRow icon={<Feather name="repeat" size={16} color={t.color.textMuted} />} label={tr('Type', 'வகை')} value={r.change_type || '—'} />
                                <InfoRow icon={<Feather name="calendar" size={16} color={t.color.textMuted} />} label={tr('Effective Date', 'அமல் தேதி')} value={fmtDate(r.effective_date)} />
                                <InfoRow icon={<Feather name="message-square" size={16} color={t.color.textMuted} />} label={tr('Reason', 'காரணம்')} value={r.reason || '—'} />

                                {pending && (
                                    <View style={{ gap: t.spacing.sm, marginTop: t.spacing.sm }}>
                                        <Field
                                            label={tr('Admin Note (optional)', 'நிர்வாக குறிப்பு (விருப்பம்)')}
                                            value={notes[r.id] || ''}
                                            onChangeText={(v) => setNotes((p) => ({ ...p, [r.id]: v }))}
                                            placeholder={tr('Add a note…', 'குறிப்பு சேர்…')}
                                            multiline
                                            autoCapitalize="sentences"
                                        />
                                        <View style={{ flexDirection: 'row', gap: t.spacing.sm }}>
                                            <Button
                                                title={tr('Approve', 'ஒப்புதல்')}
                                                style={{ flex: 1 }}
                                                loading={decide.isPending && decide.variables?.id === r.id && decide.variables?.action === 'approve'}
                                                onPress={() => decide.mutate({ id: r.id, action: 'approve', admin_note: notes[r.id] })}
                                            />
                                            <Button
                                                title={tr('Reject', 'நிராகரி')}
                                                variant="danger"
                                                style={{ flex: 1 }}
                                                loading={decide.isPending && decide.variables?.id === r.id && decide.variables?.action === 'reject'}
                                                onPress={() => decide.mutate({ id: r.id, action: 'reject', admin_note: notes[r.id] })}
                                            />
                                        </View>
                                    </View>
                                )}
                            </Card>
                        );
                    })
                )}
            </Screen>
        </>
    );
}
