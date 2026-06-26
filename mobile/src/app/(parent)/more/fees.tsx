import React, { useMemo, useState } from 'react';
import { View, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useT } from '@/lib/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen, AppText, Card, Button, Loader, EmptyState, Badge } from '@/components/ui';
import { Field, FormModal, ListRow } from '@/components/form';

interface Fee {
    id: string;
    amount?: number;
    total_amount?: number;
    due_amount?: number;
    student_name?: string;
    due_date?: string;
    paid_date?: string;
    status?: 'pending' | 'paid' | 'overdue';
    description?: string;
}

const inr = (n: number) => `₹${(n || 0).toLocaleString('en-IN')}`;

const deriveStatus = (f: Fee): 'pending' | 'paid' | 'overdue' => {
    if (f.status) return f.status;
    const due = f.due_amount ?? f.total_amount ?? f.amount ?? 0;
    if (due === 0) return 'paid';
    if (f.due_date && new Date(f.due_date) < new Date()) return 'overdue';
    return 'pending';
};

const feeAmount = (f: Fee) => f.amount ?? f.total_amount ?? f.due_amount ?? 0;

function addDays(n: number) {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toLocaleDateString('en-CA');
}

type Tab = 'pending' | 'paid';

export default function ParentFeesScreen() {
    const tr = useT();
    const t = useTheme();
    const qc = useQueryClient();

    const [tab, setTab] = useState<Tab>('pending');
    const [delayFee, setDelayFee] = useState<Fee | null>(null);
    const [delayDate, setDelayDate] = useState('');
    const [delayReason, setDelayReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const feesQ = useQuery({
        queryKey: ['parent-fees'],
        queryFn: async () => (await api.get('/finance/my-fees')).data as Fee[],
    });

    const fees = Array.isArray(feesQ.data) ? feesQ.data : [];

    const pendingTotal = useMemo(
        () => fees.filter((f) => deriveStatus(f) !== 'paid').reduce((s, f) => s + feeAmount(f), 0),
        [fees],
    );

    const filtered = useMemo(
        () => fees.filter((f) => (tab === 'pending' ? deriveStatus(f) !== 'paid' : deriveStatus(f) === 'paid')),
        [fees, tab],
    );

    const openDelay = (f: Fee) => {
        setDelayFee(f);
        setDelayDate(addDays(7));
        setDelayReason('');
    };

    const submitDelay = async () => {
        if (!delayFee || !delayReason.trim()) return;
        setSubmitting(true);
        try {
            await api.post('/finance/fee-delay', {
                fee_id: delayFee.id,
                requested_date: delayDate,
                reason: delayReason.trim(),
            });
            qc.invalidateQueries({ queryKey: ['parent-fees'] });
            setDelayFee(null);
            Alert.alert(
                tr('Request submitted', 'கோரிக்கை சமர்ப்பிக்கப்பட்டது'),
                tr('Admin will review and notify you.', 'நிர்வாகி பரிசீலித்து உங்களுக்கு அறிவிப்பார்.'),
            );
        } catch (e: any) {
            Alert.alert(tr('Error', 'பிழை'), e?.response?.data?.error || tr('Could not submit request.', 'சமர்ப்பிக்க முடியவில்லை.'));
        } finally {
            setSubmitting(false);
        }
    };

    if (feesQ.isLoading) {
        return (
            <>
                <Stack.Screen options={{ title: tr('Fees', 'கட்டணம்') }} />
                <Screen><Loader label={tr('Loading fees…', 'ஏற்றுகிறது…')} /></Screen>
            </>
        );
    }

    const tabs: { key: Tab; label: string }[] = [
        { key: 'pending', label: tr('Pending', 'நிலுவையில்') },
        { key: 'paid', label: tr('Paid', 'செலுத்தப்பட்டது') },
    ];

    return (
        <>
            <Stack.Screen options={{ title: tr('Fees', 'கட்டணம்') }} />
            <Screen scroll refreshing={feesQ.isFetching} onRefresh={() => feesQ.refetch()}>
                {pendingTotal > 0 ? (
                    <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Feather name="alert-circle" size={18} color={t.color.warning} />
                            <AppText weight="700">{tr('Total Due', 'மொத்த நிலுவை')}</AppText>
                        </View>
                        <AppText size="lg" weight="800" color={t.color.warning}>{inr(pendingTotal)}</AppText>
                    </Card>
                ) : null}

                <View style={{ flexDirection: 'row', gap: t.spacing.sm }}>
                    {tabs.map((tb) => (
                        <Button
                            key={tb.key}
                            title={tb.label}
                            onPress={() => setTab(tb.key)}
                            variant={tab === tb.key ? 'primary' : 'secondary'}
                            style={{ flex: 1, minHeight: 40 }}
                        />
                    ))}
                </View>

                {filtered.length === 0 ? (
                    <EmptyState
                        icon={<Feather name="credit-card" size={40} color={t.color.textMuted} />}
                        title={tr('No fees here', 'கட்டணங்கள் இல்லை')}
                        description={tr('Nothing in this category.', 'இந்த பிரிவில் எதுவும் இல்லை.')}
                    />
                ) : (
                    filtered.map((f) => {
                        const st = deriveStatus(f);
                        return (
                            <Card key={f.id} style={{ gap: t.spacing.sm }}>
                                <ListRow
                                    leadingIcon="credit-card"
                                    title={f.description || tr('Transport Fee', 'போக்குவரத்து கட்டணம்')}
                                    subtitle={[
                                        inr(feeAmount(f)),
                                        f.student_name || null,
                                        st !== 'paid' && f.due_date ? `${tr('Due', 'நிலுவை')} ${new Date(f.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : null,
                                        st === 'paid' && f.paid_date ? `${tr('Paid', 'செலுத்தப்பட்டது')} ${new Date(f.paid_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : null,
                                    ].filter(Boolean).join(' · ')}
                                    right={<Badge label={tr(st === 'paid' ? 'Paid' : st === 'overdue' ? 'Overdue' : 'Pending', st === 'paid' ? 'செலுத்தப்பட்டது' : st === 'overdue' ? 'தாமதம்' : 'நிலுவை')} tone={st === 'paid' ? 'success' : st === 'overdue' ? 'warning' : 'neutral'} />}
                                />
                                {st !== 'paid' ? (
                                    <Button
                                        title={tr('Request Delay', 'தாமதம் கோரு')}
                                        variant="secondary"
                                        onPress={() => openDelay(f)}
                                        icon={<Feather name="calendar" size={15} color={t.color.text} />}
                                        style={{ minHeight: 40 }}
                                    />
                                ) : null}
                            </Card>
                        );
                    })
                )}
            </Screen>

            <FormModal
                visible={!!delayFee}
                title={tr('Request Payment Delay', 'கட்டண தாமதம் கோரு')}
                onClose={() => setDelayFee(null)}
                onSubmit={submitDelay}
                submitting={submitting}
                submitLabel={tr('Submit Request', 'சமர்ப்பி')}
            >
                <Card style={{ gap: 2 }}>
                    <AppText weight="700">{delayFee?.description || tr('Transport Fee', 'போக்குவரத்து கட்டணம்')}</AppText>
                    {delayFee?.student_name ? <AppText size="sm" muted>{delayFee.student_name}</AppText> : null}
                    <AppText size="lg" weight="800" color={t.color.brand}>{inr(delayFee ? feeAmount(delayFee) : 0)}</AppText>
                </Card>
                <Field
                    label={tr('New Requested Date (YYYY-MM-DD)', 'புதிய கோரிய தேதி')}
                    value={delayDate}
                    onChangeText={setDelayDate}
                    placeholder={addDays(7)}
                />
                <Field
                    label={tr('Reason (required)', 'காரணம் (கட்டாயம்)')}
                    value={delayReason}
                    onChangeText={setDelayReason}
                    placeholder={tr('e.g. Salary delayed this month…', 'எ.கா. இந்த மாதம் சம்பளம் தாமதம்…')}
                    multiline
                    autoCapitalize="sentences"
                />
                {!delayReason.trim() ? (
                    <AppText size="sm" muted>{tr('Please enter a reason to submit.', 'சமர்ப்பிக்க காரணம் தேவை.')}</AppText>
                ) : null}
            </FormModal>
        </>
    );
}
