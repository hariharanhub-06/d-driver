import React, { useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useT } from '@/lib/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen, AppText, Button, Card, Loader, EmptyState, Badge } from '@/components/ui';
import { Field, Select, FormModal } from '@/components/form';

type FuelStatus = 'pending' | 'approved' | 'rejected' | 'disbursed';

interface FuelRequest {
    id: string;
    status: FuelStatus;
    amount_requested?: number;
    current_km?: number;
    reason?: string;
    admin_note?: string;
    created_at?: string;
    bus?: { bus_number?: string; fuel_liters?: number };
    driver?: { user?: { name?: string } };
}

type Filter = 'all' | FuelStatus;
type Action = 'approved' | 'rejected' | 'disbursed';

const toneFor = (s: FuelStatus): 'success' | 'warning' | 'neutral' =>
    s === 'disbursed' || s === 'approved' ? 'success' : s === 'rejected' ? 'neutral' : 'warning';

export default function ManageFuelRequestsScreen() {
    const tr = useT();
    const t = useTheme();
    const qc = useQueryClient();

    const reqQ = useQuery({
        queryKey: ['admin-fuel-requests'],
        queryFn: async () => {
            const { data } = await api.get('/fuel/requests');
            return (Array.isArray(data) ? data : data?.requests ?? []) as FuelRequest[];
        },
    });

    const requests = Array.isArray(reqQ.data) ? reqQ.data : [];

    const [filter, setFilter] = useState<Filter>('all');
    const [action, setAction] = useState<{ req: FuelRequest; type: Action } | null>(null);
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const filtered = useMemo(
        () => (filter === 'all' ? requests : requests.filter((r) => r.status === filter)),
        [requests, filter],
    );

    const filterOptions: { label: string; value: Filter }[] = [
        { label: tr('All', 'அனைத்தும்'), value: 'all' },
        { label: tr('Pending', 'நிலுவையில்'), value: 'pending' },
        { label: tr('Approved', 'அனுமதிக்கப்பட்டது'), value: 'approved' },
        { label: tr('Disbursed', 'வழங்கப்பட்டது'), value: 'disbursed' },
        { label: tr('Rejected', 'நிராகரிக்கப்பட்டது'), value: 'rejected' },
    ];

    const submitAction = async () => {
        if (!action) return;
        setSubmitting(true);
        try {
            await api.put(`/fuel/requests/${action.req.id}`, {
                status: action.type,
                admin_note: note.trim() || undefined,
            });
            qc.invalidateQueries({ queryKey: ['admin-fuel-requests'] });
            setAction(null);
            setNote('');
        } catch (e: any) {
            Alert.alert(tr('Error', 'பிழை'), e?.response?.data?.error || tr('Could not update request.', 'புதுப்பிக்க முடியவில்லை.'));
        } finally {
            setSubmitting(false);
        }
    };

    if (reqQ.isLoading) {
        return (
            <>
                <Stack.Screen options={{ title: tr('Fuel Requests', 'எரிபொருள் கோரிக்கைகள்') }} />
                <Screen><Loader label={tr('Loading requests…', 'ஏற்றுகிறது…')} /></Screen>
            </>
        );
    }

    return (
        <>
            <Stack.Screen options={{ title: tr('Fuel Requests', 'எரிபொருள் கோரிக்கைகள்') }} />
            <Screen scroll refreshing={reqQ.isFetching} onRefresh={() => reqQ.refetch()}>
                <Select label={tr('Filter', 'வடிகட்டு')} value={filter} options={filterOptions} onChange={setFilter} />

                {filtered.length === 0 ? (
                    <EmptyState
                        icon={<Feather name="droplet" size={40} color={t.color.textMuted} />}
                        title={tr('No fuel requests', 'கோரிக்கைகள் இல்லை')}
                        description={tr('Driver fuel requests will appear here.', 'ஓட்டுநர் கோரிக்கைகள் இங்கே தோன்றும்.')}
                    />
                ) : (
                    filtered.map((r) => (
                        <Card key={r.id} style={{ gap: t.spacing.sm }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <AppText weight="800" size="lg">{`₹${(r.amount_requested ?? 0).toLocaleString('en-IN')}`}</AppText>
                                <Badge label={r.status} tone={toneFor(r.status)} />
                            </View>
                            <AppText size="sm" muted>
                                {[
                                    r.bus?.bus_number ? `${tr('Bus', 'பேருந்து')} ${r.bus.bus_number}` : null,
                                    r.driver?.user?.name,
                                    r.current_km != null ? `${r.current_km} km` : null,
                                ].filter(Boolean).join(' · ')}
                            </AppText>
                            {r.reason ? <AppText size="sm">{r.reason}</AppText> : null}
                            {r.admin_note ? <AppText size="sm" muted>{tr('Note', 'குறிப்பு')}: {r.admin_note}</AppText> : null}

                            {r.status === 'pending' ? (
                                <View style={{ flexDirection: 'row', gap: t.spacing.sm, marginTop: t.spacing.xs }}>
                                    <Button title={tr('Approve', 'அனுமதி')} onPress={() => { setAction({ req: r, type: 'approved' }); setNote(''); }} style={{ flex: 1 }} />
                                    <Button title={tr('Disburse', 'வழங்கு')} variant="secondary" onPress={() => { setAction({ req: r, type: 'disbursed' }); setNote(''); }} style={{ flex: 1 }} />
                                    <Button title={tr('Reject', 'நிராகரி')} variant="danger" onPress={() => { setAction({ req: r, type: 'rejected' }); setNote(''); }} style={{ flex: 1 }} />
                                </View>
                            ) : r.status === 'approved' ? (
                                <Button title={tr('Mark Disbursed', 'வழங்கப்பட்டதாக')} variant="secondary" onPress={() => { setAction({ req: r, type: 'disbursed' }); setNote(''); }} style={{ marginTop: t.spacing.xs }} />
                            ) : null}
                        </Card>
                    ))
                )}
            </Screen>

            <FormModal
                visible={!!action}
                title={
                    action?.type === 'rejected'
                        ? tr('Reject Request', 'கோரிக்கையை நிராகரி')
                        : action?.type === 'disbursed'
                        ? tr('Disburse Funds', 'நிதி வழங்கு')
                        : tr('Approve Request', 'கோரிக்கையை அனுமதி')
                }
                onClose={() => { setAction(null); setNote(''); }}
                onSubmit={submitAction}
                submitting={submitting}
                submitLabel={
                    action?.type === 'rejected'
                        ? tr('Reject', 'நிராகரி')
                        : action?.type === 'disbursed'
                        ? tr('Disburse', 'வழங்கு')
                        : tr('Approve', 'அனுமதி')
                }
            >
                {action ? (
                    <AppText muted>
                        {`₹${(action.req.amount_requested ?? 0).toLocaleString('en-IN')} · ${action.req.driver?.user?.name || ''} · ${action.req.bus?.bus_number ? `${tr('Bus', 'பேருந்து')} ${action.req.bus.bus_number}` : ''}`}
                    </AppText>
                ) : null}
                <Field label={tr('Admin Note (optional)', 'நிர்வாக குறிப்பு')} value={note} onChangeText={setNote} multiline autoCapitalize="sentences" placeholder={tr('Reason or remark', 'காரணம்')} />
            </FormModal>
        </>
    );
}
