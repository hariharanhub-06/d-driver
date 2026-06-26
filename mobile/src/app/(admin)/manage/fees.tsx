import React, { useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useT } from '@/lib/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen, AppText, Button, Card, Loader, EmptyState, Badge } from '@/components/ui';
import { Field, Select, FormModal, ListRow } from '@/components/form';

interface Payment { id: string; amount: number; payment_date?: string; payment_method?: string }
interface Fee {
    id: string;
    student?: { id: string; name: string };
    total_amount: number;
    due_amount: number;
    amount?: number;
    due_date?: string;
    status?: 'pending' | 'paid' | 'overdue';
    payment_method?: string;
    payments?: Payment[];
}
interface DelayRequest {
    id: string;
    fee_id: string;
    reason?: string;
    requested_date: string;
    status: string;
    admin_note?: string;
    student_name?: string;
    fee_amount?: number;
    current_due_date?: string;
    fee?: { total_amount?: number; due_date?: string; student?: { name?: string } };
}

type Tab = 'all' | 'pending' | 'paid' | 'overdue' | 'delay';

const inr = (n: number) => `₹${(n || 0).toLocaleString('en-IN')}`;

const deriveStatus = (f: Fee): 'pending' | 'paid' | 'overdue' => {
    if (f.status) return f.status;
    const due = f.due_amount ?? f.total_amount ?? 0;
    if (due === 0) return 'paid';
    if (f.due_date && new Date(f.due_date) < new Date()) return 'overdue';
    return 'pending';
};

export default function ManageFeesScreen() {
    const tr = useT();
    const t = useTheme();
    const qc = useQueryClient();

    const [tab, setTab] = useState<Tab>('all');
    const [payFee, setPayFee] = useState<Fee | null>(null);
    const [payAmount, setPayAmount] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [busy, setBusy] = useState(false);
    const [delayAction, setDelayAction] = useState<{ req: DelayRequest; approve: boolean } | null>(null);
    const [delayDate, setDelayDate] = useState('');
    const [delayNote, setDelayNote] = useState('');

    const feesQ = useQuery({
        queryKey: ['admin-fees'],
        queryFn: async () => (await api.get('/finance/fees')).data as Fee[],
    });
    const delayQ = useQuery({
        queryKey: ['admin-fee-delay'],
        queryFn: async () => (await api.get('/finance/fee-delay')).data as DelayRequest[],
        enabled: tab === 'delay',
    });

    const fees = Array.isArray(feesQ.data) ? feesQ.data : [];
    const delays = Array.isArray(delayQ.data) ? delayQ.data : [];

    const stats = useMemo(() => {
        const outstanding = fees.filter((f) => deriveStatus(f) !== 'paid').reduce((s, f) => s + (f.total_amount || f.amount || 0), 0);
        const collected = fees.reduce((s, f) => s + Math.max(0, (f.total_amount || 0) - (f.due_amount || 0)), 0);
        const overdue = fees.filter((f) => deriveStatus(f) === 'overdue').length;
        return { outstanding, collected, overdue };
    }, [fees]);

    const filtered = useMemo(() => {
        if (tab === 'all' || tab === 'delay') return fees;
        return fees.filter((f) => deriveStatus(f) === tab);
    }, [fees, tab]);

    const openPay = (f: Fee) => {
        setPayFee(f);
        setPayAmount(String(f.due_amount || f.total_amount || f.amount || ''));
    };

    const recordPayment = async () => {
        if (!payFee) return;
        const amt = parseFloat(payAmount);
        if (!amt || amt <= 0) {
            Alert.alert(tr('Invalid amount', 'தவறான தொகை'));
            return;
        }
        setSubmitting(true);
        try {
            await api.post('/finance/payment/manual', { fee_id: payFee.id, amount: amt });
            qc.invalidateQueries({ queryKey: ['admin-fees'] });
            setPayFee(null);
        } catch (e: any) {
            Alert.alert(tr('Error', 'பிழை'), e?.response?.data?.error || tr('Could not record payment.', 'பதிவு செய்ய முடியவில்லை.'));
        } finally {
            setSubmitting(false);
        }
    };

    const generate = async () => {
        setBusy(true);
        try {
            const { data } = await api.post('/finance/fees/generate');
            qc.invalidateQueries({ queryKey: ['admin-fees'] });
            Alert.alert(tr('Done', 'முடிந்தது'), tr(`Generated ${data?.generated ?? 0} fees.`, `${data?.generated ?? 0} கட்டணங்கள் உருவாக்கப்பட்டன.`));
        } catch (e: any) {
            Alert.alert(tr('Error', 'பிழை'), e?.response?.data?.error || tr('Generation failed.', 'உருவாக்கம் தோல்வி.'));
        } finally {
            setBusy(false);
        }
    };

    const remindAll = async () => {
        setBusy(true);
        try {
            const { data } = await api.post('/finance/fees/remind-all');
            Alert.alert(tr('Reminders sent', 'நினைவூட்டல்கள் அனுப்பப்பட்டன'), tr(`Sent to ${data?.sent ?? data?.reminded ?? 0} parents.`, `${data?.sent ?? data?.reminded ?? 0} பெற்றோருக்கு அனுப்பப்பட்டது.`));
        } catch (e: any) {
            Alert.alert(tr('Error', 'பிழை'), e?.response?.data?.error || tr('Could not send reminders.', 'அனுப்ப முடியவில்லை.'));
        } finally {
            setBusy(false);
        }
    };

    const submitDelay = async () => {
        if (!delayAction) return;
        setSubmitting(true);
        try {
            await api.put(`/finance/fee-delay/${delayAction.req.id}`, {
                status: delayAction.approve ? 'approved' : 'rejected',
                approved_due_date: delayAction.approve ? delayDate : undefined,
                admin_note: delayNote || undefined,
            });
            qc.invalidateQueries({ queryKey: ['admin-fee-delay'] });
            qc.invalidateQueries({ queryKey: ['admin-fees'] });
            setDelayAction(null);
        } catch (e: any) {
            Alert.alert(tr('Error', 'பிழை'), e?.response?.data?.error || tr('Action failed.', 'செயல் தோல்வி.'));
        } finally {
            setSubmitting(false);
        }
    };

    const tabs: { key: Tab; label: string }[] = [
        { key: 'all', label: tr('All', 'அனைத்தும்') },
        { key: 'pending', label: tr('Pending', 'நிலுவையில்') },
        { key: 'paid', label: tr('Paid', 'செலுத்தப்பட்டது') },
        { key: 'overdue', label: tr('Overdue', 'தாமதமானது') },
        { key: 'delay', label: tr('Delay', 'தாமதம்') },
    ];

    if (feesQ.isLoading) {
        return (
            <>
                <Stack.Screen options={{ title: tr('Fees', 'கட்டணம்') }} />
                <Screen><Loader label={tr('Loading fees…', 'ஏற்றுகிறது…')} /></Screen>
            </>
        );
    }

    return (
        <>
            <Stack.Screen options={{ title: tr('Fees', 'கட்டணம்') }} />
            <Screen scroll refreshing={feesQ.isFetching} onRefresh={() => feesQ.refetch()}>
                <View style={{ flexDirection: 'row', gap: t.spacing.sm }}>
                    <Button
                        title={tr('Generate', 'உருவாக்கு')}
                        onPress={generate}
                        loading={busy}
                        style={{ flex: 1 }}
                        icon={<Feather name="refresh-cw" size={16} color={t.color.brandText} />}
                    />
                    <Button
                        title={tr('Remind All', 'நினைவூட்டு')}
                        onPress={remindAll}
                        loading={busy}
                        variant="secondary"
                        style={{ flex: 1 }}
                        icon={<Feather name="bell" size={16} color={t.color.text} />}
                    />
                </View>

                <View style={{ flexDirection: 'row', gap: t.spacing.sm }}>
                    <Card style={{ flex: 1, gap: 4 }}>
                        <AppText size="sm" muted>{tr('Outstanding', 'நிலுவை')}</AppText>
                        <AppText size="lg" weight="800">{inr(stats.outstanding)}</AppText>
                    </Card>
                    <Card style={{ flex: 1, gap: 4 }}>
                        <AppText size="sm" muted>{tr('Collected', 'வசூல்')}</AppText>
                        <AppText size="lg" weight="800" color={t.color.success}>{inr(stats.collected)}</AppText>
                    </Card>
                    <Card style={{ flex: 1, gap: 4 }}>
                        <AppText size="sm" muted>{tr('Overdue', 'தாமதம்')}</AppText>
                        <AppText size="lg" weight="800" color={t.color.danger}>{stats.overdue}</AppText>
                    </Card>
                </View>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {tabs.map((tb) => (
                        <Button
                            key={tb.key}
                            title={tb.label}
                            onPress={() => setTab(tb.key)}
                            variant={tab === tb.key ? 'primary' : 'secondary'}
                            style={{ paddingHorizontal: t.spacing.md, minHeight: 38 }}
                        />
                    ))}
                </View>

                {tab === 'delay' ? (
                    delayQ.isLoading ? (
                        <Loader />
                    ) : delays.length === 0 ? (
                        <EmptyState
                            icon={<Feather name="calendar" size={40} color={t.color.textMuted} />}
                            title={tr('No delay requests', 'தாமத கோரிக்கைகள் இல்லை')}
                        />
                    ) : (
                        delays.map((r) => {
                            const name = r.student_name || r.fee?.student?.name || '—';
                            const amt = r.fee_amount ?? r.fee?.total_amount ?? 0;
                            return (
                                <Card key={r.id} style={{ gap: t.spacing.sm }}>
                                    <ListRow
                                        leadingIcon="clock"
                                        title={name}
                                        subtitle={`${inr(amt)} · ${tr('New date', 'புதிய தேதி')}: ${new Date(r.requested_date).toLocaleDateString('en-IN')}`}
                                        right={<Badge label={r.status} tone={r.status === 'approved' ? 'success' : r.status === 'rejected' ? 'warning' : 'neutral'} />}
                                    />
                                    {r.reason ? <AppText size="sm" muted>"{r.reason}"</AppText> : null}
                                    {r.status === 'pending' ? (
                                        <View style={{ flexDirection: 'row', gap: t.spacing.sm }}>
                                            <Button
                                                title={tr('Approve', 'அனுமதி')}
                                                onPress={() => { setDelayAction({ req: r, approve: true }); setDelayDate(r.requested_date.slice(0, 10)); setDelayNote(''); }}
                                                style={{ flex: 1, minHeight: 40 }}
                                            />
                                            <Button
                                                title={tr('Reject', 'நிராகரி')}
                                                variant="danger"
                                                onPress={() => { setDelayAction({ req: r, approve: false }); setDelayDate(''); setDelayNote(''); }}
                                                style={{ flex: 1, minHeight: 40 }}
                                            />
                                        </View>
                                    ) : null}
                                    {r.admin_note ? <AppText size="sm" muted>{tr('Note', 'குறிப்பு')}: {r.admin_note}</AppText> : null}
                                </Card>
                            );
                        })
                    )
                ) : filtered.length === 0 ? (
                    <EmptyState
                        icon={<Feather name="dollar-sign" size={40} color={t.color.textMuted} />}
                        title={tr('No fees found', 'கட்டணங்கள் இல்லை')}
                    />
                ) : (
                    filtered.map((f) => {
                        const st = deriveStatus(f);
                        return (
                            <Card key={f.id} style={{ gap: t.spacing.sm }}>
                                <ListRow
                                    leadingIcon="user"
                                    title={f.student?.name || '—'}
                                    subtitle={[
                                        inr(f.total_amount || f.amount || 0),
                                        f.due_date ? new Date(f.due_date).toLocaleDateString('en-IN') : null,
                                        f.due_amount ? `${tr('Due', 'நிலுவை')} ${inr(f.due_amount)}` : null,
                                    ].filter(Boolean).join(' · ')}
                                    right={<Badge label={st} tone={st === 'paid' ? 'success' : st === 'overdue' ? 'warning' : 'neutral'} />}
                                />
                                {st !== 'paid' ? (
                                    <Button title={tr('Record Cash', 'பணம் பதிவு')} variant="secondary" onPress={() => openPay(f)} style={{ minHeight: 40 }} />
                                ) : null}
                            </Card>
                        );
                    })
                )}
            </Screen>

            <FormModal
                visible={!!payFee}
                title={tr('Record Cash Payment', 'பண கொடுப்பனவு பதிவு')}
                onClose={() => setPayFee(null)}
                onSubmit={recordPayment}
                submitting={submitting}
                submitLabel={tr('Confirm', 'உறுதிப்படுத்து')}
            >
                <AppText weight="700">{payFee?.student?.name}</AppText>
                <Field label={tr('Amount (₹)', 'தொகை (₹)')} value={payAmount} onChangeText={setPayAmount} keyboardType="decimal-pad" placeholder="0" />
            </FormModal>

            <FormModal
                visible={!!delayAction}
                title={delayAction?.approve ? tr('Approve Delay', 'தாமதம் அனுமதி') : tr('Reject Delay', 'தாமதம் நிராகரி')}
                onClose={() => setDelayAction(null)}
                onSubmit={submitDelay}
                submitting={submitting}
                submitLabel={tr('Confirm', 'உறுதிப்படுத்து')}
            >
                {delayAction?.approve ? (
                    <Field label={tr('New Due Date (YYYY-MM-DD)', 'புதிய தேதி')} value={delayDate} onChangeText={setDelayDate} placeholder="2026-07-05" />
                ) : null}
                <Field label={tr('Admin Note (optional)', 'குறிப்பு (விருப்பம்)')} value={delayNote} onChangeText={setDelayNote} placeholder={tr('Optional note to parent…', 'பெற்றோருக்கு குறிப்பு…')} autoCapitalize="sentences" />
            </FormModal>
        </>
    );
}
