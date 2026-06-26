import React from 'react';
import { View, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import api from '@/lib/api';
import { useTheme } from '@/theme/ThemeProvider';
import { useT } from '@/lib/i18n';
import { Screen, AppText, Card, Button, Loader, EmptyState, Badge } from '@/components/ui';

interface Invoice {
    id: string;
    school?: { id: string; name: string };
    billing_month: string;
    total_amount: number;
    status: string;
    paid_at?: string | null;
}

function statusTone(status?: string): 'success' | 'warning' | 'neutral' {
    switch ((status || '').toLowerCase()) {
        case 'paid': return 'success';
        case 'overdue': return 'warning';
        default: return 'neutral';
    }
}

export default function SaBilling() {
    const t = useTheme();
    const tr = useT();
    const qc = useQueryClient();

    const q = useQuery<Invoice[]>({
        queryKey: ['sa-invoices'],
        queryFn: async () => {
            const { data } = await api.get('/billing/invoices');
            return Array.isArray(data) ? data : [];
        },
    });

    const payMut = useMutation({
        mutationFn: (id: string) => api.post(`/billing/invoices/${id}/pay-cash`, {}),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-invoices'] }),
        onError: (e: any) => Alert.alert(tr('Error', 'பிழை'), e?.response?.data?.error || tr('Failed to record payment', 'பணம் பதிவு தோல்வி')),
    });

    const markPaid = (inv: Invoice) => {
        Alert.alert(
            tr('Mark as Paid', 'செலுத்தியதாக குறி'),
            tr('Mark this invoice as paid (cash)?', 'இந்த விலைப்பட்டியலை செலுத்தியதாக குறிக்கவா?'),
            [
                { text: tr('Cancel', 'ரத்து'), style: 'cancel' },
                { text: tr('Confirm', 'உறுதி'), onPress: () => payMut.mutate(inv.id) },
            ],
        );
    };

    const invoices = q.data || [];
    const labelFor = (s?: string) => {
        switch ((s || '').toLowerCase()) {
            case 'paid': return tr('Paid', 'செலுத்தப்பட்டது');
            case 'overdue': return tr('Overdue', 'தாமதமானது');
            default: return tr('Pending', 'நிலுவையில்');
        }
    };

    if (q.isLoading) return <Loader />;

    const totalBilled = invoices.reduce((s, i) => s + (i.total_amount || 0), 0);
    const totalPaid = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + (i.total_amount || 0), 0);

    return (
        <>
            <Stack.Screen options={{ title: tr('Billing', 'பில்லிங்') }} />
            <Screen scroll refreshing={q.isRefetching} onRefresh={() => q.refetch()}>
                <AppText size="xl" weight="800">{tr('Billing', 'பில்லிங்')}</AppText>
                <AppText muted size="sm">{tr('Invoices & payments', 'விலைப்பட்டியல் & கட்டணங்கள்')}</AppText>

                <View style={{ flexDirection: 'row', gap: 12, marginTop: t.spacing.md }}>
                    <Card style={{ flex: 1, gap: 4 }}>
                        <AppText size="sm" muted weight="600">{tr('Total Billed', 'மொத்த பில்')}</AppText>
                        <AppText size="lg" weight="800">{`₹${totalBilled.toLocaleString('en-IN')}`}</AppText>
                    </Card>
                    <Card style={{ flex: 1, gap: 4 }}>
                        <AppText size="sm" muted weight="600">{tr('Collected', 'வசூலித்தது')}</AppText>
                        <AppText size="lg" weight="800" color={t.color.success}>{`₹${totalPaid.toLocaleString('en-IN')}`}</AppText>
                    </Card>
                </View>

                <AppText size="lg" weight="800" style={{ marginTop: t.spacing.lg }}>{tr('Invoices', 'விலைப்பட்டியல்கள்')}</AppText>
                {invoices.length === 0 ? (
                    <EmptyState icon="file-text" title={tr('No invoices', 'விலைப்பட்டியல் இல்லை')} />
                ) : (
                    <View style={{ gap: 10, marginTop: t.spacing.sm }}>
                        {invoices.map((inv) => (
                            <Card key={inv.id} style={{ gap: 10 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                    <View style={{ flex: 1 }}>
                                        <AppText weight="700" numberOfLines={1}>{inv.school?.name || '—'}</AppText>
                                        <AppText size="sm" muted>{inv.billing_month}</AppText>
                                    </View>
                                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                                        <AppText weight="800">{`₹${(inv.total_amount || 0).toLocaleString('en-IN')}`}</AppText>
                                        <Badge tone={statusTone(inv.status)} label={labelFor(inv.status)} />
                                    </View>
                                </View>
                                {inv.status !== 'paid' && (
                                    <Button
                                        title={tr('Mark as Paid', 'செலுத்தியதாக குறி')}
                                        variant="secondary"
                                        icon={<Feather name="check" size={16} color={t.color.text} />}
                                        loading={payMut.isPending && payMut.variables === inv.id}
                                        onPress={() => markPaid(inv)}
                                    />
                                )}
                            </Card>
                        ))}
                    </View>
                )}
            </Screen>
        </>
    );
}
