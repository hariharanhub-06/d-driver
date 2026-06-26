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

interface MaintenanceItem {
    part?: string;
    cost?: number;
}
interface MaintenanceRecord {
    id: string;
    description?: string;
    total_cost?: number;
    status?: string;
    admin_note?: string;
    date?: string;
    items?: MaintenanceItem[];
    driver_name?: string;
    bus_number?: string;
}

type Filter = 'all' | 'pending' | 'approved' | 'rejected';
type Action = 'approved' | 'rejected';

const toneFor = (s?: string): 'success' | 'warning' | 'neutral' =>
    s === 'approved' ? 'success' : s === 'rejected' ? 'neutral' : 'warning';

export default function ManageMaintenanceScreen() {
    const tr = useT();
    const t = useTheme();
    const qc = useQueryClient();

    const recordsQ = useQuery({
        queryKey: ['admin-maintenance'],
        queryFn: async () => (await api.get('/maintenance')).data as MaintenanceRecord[],
    });

    const records = Array.isArray(recordsQ.data) ? recordsQ.data : [];

    const [filter, setFilter] = useState<Filter>('all');
    const [action, setAction] = useState<{ record: MaintenanceRecord; type: Action } | null>(null);
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const filtered = useMemo(
        () => (filter === 'all' ? records : records.filter((r) => r.status === filter)),
        [records, filter],
    );

    const filterOptions: { label: string; value: Filter }[] = [
        { label: tr('All', 'அனைத்தும்'), value: 'all' },
        { label: tr('Pending', 'நிலுவையில்'), value: 'pending' },
        { label: tr('Approved', 'அனுமதிக்கப்பட்டது'), value: 'approved' },
        { label: tr('Rejected', 'நிராகரிக்கப்பட்டது'), value: 'rejected' },
    ];

    const submitAction = async () => {
        if (!action) return;
        setSubmitting(true);
        try {
            await api.put(`/maintenance/${action.record.id}`, {
                status: action.type,
                admin_note: note.trim() || undefined,
            });
            qc.invalidateQueries({ queryKey: ['admin-maintenance'] });
            setAction(null);
            setNote('');
        } catch (e: any) {
            Alert.alert(tr('Error', 'பிழை'), e?.response?.data?.error || tr('Could not update record.', 'புதுப்பிக்க முடியவில்லை.'));
        } finally {
            setSubmitting(false);
        }
    };

    if (recordsQ.isLoading) {
        return (
            <>
                <Stack.Screen options={{ title: tr('Maintenance', 'பராமரிப்பு') }} />
                <Screen><Loader label={tr('Loading records…', 'ஏற்றுகிறது…')} /></Screen>
            </>
        );
    }

    return (
        <>
            <Stack.Screen options={{ title: tr('Maintenance', 'பராமரிப்பு') }} />
            <Screen scroll refreshing={recordsQ.isFetching} onRefresh={() => recordsQ.refetch()}>
                <Select label={tr('Filter', 'வடிகட்டு')} value={filter} options={filterOptions} onChange={setFilter} />

                {filtered.length === 0 ? (
                    <EmptyState
                        icon={<Feather name="tool" size={40} color={t.color.textMuted} />}
                        title={tr('No maintenance records', 'பதிவுகள் இல்லை')}
                        description={tr('Driver-submitted maintenance logs appear here.', 'ஓட்டுநர் பதிவுகள் இங்கே தோன்றும்.')}
                    />
                ) : (
                    filtered.map((r) => (
                        <Card key={r.id} style={{ gap: t.spacing.sm }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: t.spacing.sm }}>
                                <AppText weight="700" numberOfLines={2} style={{ flex: 1 }}>{r.description || tr('Maintenance', 'பராமரிப்பு')}</AppText>
                                <Badge label={r.status || 'pending'} tone={toneFor(r.status)} />
                            </View>
                            <AppText weight="800" size="lg">{`₹${(r.total_cost ?? 0).toLocaleString('en-IN')}`}</AppText>
                            <AppText size="sm" muted>
                                {[
                                    r.bus_number ? `${tr('Bus', 'பேருந்து')} ${r.bus_number}` : null,
                                    r.driver_name,
                                    r.date ? new Date(r.date).toLocaleDateString() : null,
                                ].filter(Boolean).join(' · ')}
                            </AppText>
                            {Array.isArray(r.items) && r.items.length > 0 ? (
                                <View style={{ gap: 2 }}>
                                    {r.items.map((it, i) => (
                                        <AppText key={i} size="sm" muted>
                                            {`• ${it.part || tr('Item', 'பொருள்')} — ₹${(it.cost ?? 0).toLocaleString('en-IN')}`}
                                        </AppText>
                                    ))}
                                </View>
                            ) : null}
                            {r.admin_note ? <AppText size="sm" muted>{tr('Note', 'குறிப்பு')}: {r.admin_note}</AppText> : null}

                            {r.status === 'pending' ? (
                                <View style={{ flexDirection: 'row', gap: t.spacing.sm, marginTop: t.spacing.xs }}>
                                    <Button title={tr('Approve', 'அனுமதி')} onPress={() => { setAction({ record: r, type: 'approved' }); setNote(''); }} style={{ flex: 1 }} />
                                    <Button title={tr('Reject', 'நிராகரி')} variant="danger" onPress={() => { setAction({ record: r, type: 'rejected' }); setNote(''); }} style={{ flex: 1 }} />
                                </View>
                            ) : null}
                        </Card>
                    ))
                )}
            </Screen>

            <FormModal
                visible={!!action}
                title={action?.type === 'rejected' ? tr('Reject Record', 'பதிவை நிராகரி') : tr('Approve Record', 'பதிவை அனுமதி')}
                onClose={() => { setAction(null); setNote(''); }}
                onSubmit={submitAction}
                submitting={submitting}
                submitLabel={action?.type === 'rejected' ? tr('Reject', 'நிராகரி') : tr('Approve', 'அனுமதி')}
            >
                {action ? (
                    <AppText muted>
                        {`${action.record.description || ''} · ₹${(action.record.total_cost ?? 0).toLocaleString('en-IN')}`}
                    </AppText>
                ) : null}
                <Field label={tr('Admin Note (optional)', 'நிர்வாக குறிப்பு')} value={note} onChangeText={setNote} multiline autoCapitalize="sentences" placeholder={tr('Reason or remark', 'காரணம்')} />
            </FormModal>
        </>
    );
}
