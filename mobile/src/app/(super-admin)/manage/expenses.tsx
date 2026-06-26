import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';

import api from '@/lib/api';
import { useTheme } from '@/theme/ThemeProvider';
import { useT } from '@/lib/i18n';
import { Screen, AppText, Card, Button, Loader, EmptyState, Badge } from '@/components/ui';
import { Field, Select, FormModal, confirmDelete } from '@/components/form';

interface ManualExpense {
    id: string;
    label: string;
    category: string;
    amount: number;
    month: string;
    notes?: string | null;
    created_at?: string;
}

type Category = 'hosting' | 'storage' | 'email' | 'payment' | 'misc';

const CATEGORY_LABEL: Record<string, string> = {
    hosting: 'Hosting',
    storage: 'Storage',
    email: 'Email',
    payment: 'Payment',
    misc: 'Misc',
};

const thisMonth = () => new Date().toISOString().slice(0, 7);
const emptyForm = () => ({ label: '', category: 'misc' as Category, amount: '', month: thisMonth(), notes: '' });

export default function SaExpenses() {
    const t = useTheme();
    const tr = useT();
    const qc = useQueryClient();

    const [open, setOpen] = useState(false);
    const [form, setForm] = useState(emptyForm());

    const q = useQuery<ManualExpense[]>({
        queryKey: ['sa-expenses'],
        queryFn: async () => {
            const { data } = await api.get('/billing/manual-expenses');
            return Array.isArray(data) ? data : [];
        },
    });

    const createMut = useMutation({
        mutationFn: () =>
            api.post('/billing/manual-expenses', {
                label: form.label.trim(),
                category: form.category,
                amount: parseFloat(form.amount),
                month: form.month,
                notes: form.notes.trim() || undefined,
            }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['sa-expenses'] });
            setOpen(false);
            setForm(emptyForm());
        },
        onError: (e: any) => Alert.alert(tr('Error', 'பிழை'), e?.response?.data?.error || tr('Failed to add expense', 'செலவு சேர்க்க தோல்வி')),
    });

    const deleteMut = useMutation({
        mutationFn: (id: string) => api.delete(`/billing/manual-expenses/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-expenses'] }),
        onError: () => Alert.alert(tr('Error', 'பிழை'), tr('Failed to delete expense', 'நீக்க தோல்வி')),
    });

    const submit = () => {
        if (!form.label.trim() || !form.amount || !form.month) {
            Alert.alert(tr('Missing fields', 'தகவல் இல்லை'), tr('Label, amount and month are required.', 'லேபிள், தொகை மற்றும் மாதம் தேவை.'));
            return;
        }
        createMut.mutate();
    };

    if (q.isLoading) return <Loader />;

    const expenses = q.data || [];
    const total = expenses.reduce((s, e) => s + (e.amount || 0), 0);

    return (
        <>
            <Stack.Screen options={{ title: tr('Expenses', 'செலவுகள்') }} />
            <Screen scroll refreshing={q.isRefetching} onRefresh={() => q.refetch()}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <View style={{ flex: 1 }}>
                        <AppText size="xl" weight="800">{tr('Platform Expenses', 'தளச் செலவுகள்')}</AppText>
                        <AppText muted size="sm">{tr('Manual operational costs', 'கைமுறை செயல்பாட்டு செலவுகள்')}</AppText>
                    </View>
                    <Button title={tr('Add', 'சேர்')} icon={<Feather name="plus" size={16} color={t.color.brandText} />} onPress={() => { setForm(emptyForm()); setOpen(true); }} />
                </View>

                <Card style={{ marginTop: t.spacing.md, gap: 4 }}>
                    <AppText size="sm" muted weight="600">{tr('Total Logged', 'மொத்த செலவு')}</AppText>
                    <AppText size="xl" weight="800" color={t.color.danger}>{`₹${total.toLocaleString('en-IN')}`}</AppText>
                </Card>

                {expenses.length === 0 ? (
                    <EmptyState icon="trending-down" title={tr('No expenses recorded', 'செலவுகள் பதிவு இல்லை')} />
                ) : (
                    <View style={{ gap: 10, marginTop: t.spacing.md }}>
                        {expenses.map((e) => (
                            <Card key={e.id} style={{ gap: 8 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                    <View style={{ flex: 1 }}>
                                        <AppText weight="700" numberOfLines={1}>{e.label}</AppText>
                                        <AppText size="sm" muted>{e.month}{e.notes ? ` · ${e.notes}` : ''}</AppText>
                                    </View>
                                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                                        <AppText weight="800">{`₹${(e.amount || 0).toLocaleString('en-IN')}`}</AppText>
                                        <Badge tone="neutral" label={CATEGORY_LABEL[e.category] || e.category} />
                                    </View>
                                </View>
                                <Button
                                    title={tr('Delete', 'நீக்கு')}
                                    variant="danger"
                                    icon={<Feather name="trash-2" size={16} color="#fff" />}
                                    loading={deleteMut.isPending && deleteMut.variables === e.id}
                                    onPress={() => confirmDelete(tr('Delete this expense record?', 'இந்த செலவு பதிவை நீக்கவா?'), () => deleteMut.mutate(e.id))}
                                />
                            </Card>
                        ))}
                    </View>
                )}
            </Screen>

            <FormModal
                visible={open}
                title={tr('Add Expense', 'செலவு சேர்க்கவும்')}
                onClose={() => setOpen(false)}
                onSubmit={submit}
                submitting={createMut.isPending}
                submitLabel={tr('Add Expense', 'செலவு சேர்க்கவும்')}
            >
                <Field
                    label={tr('Label', 'லேபிள்')}
                    value={form.label}
                    onChangeText={(v) => setForm((p) => ({ ...p, label: v }))}
                    placeholder={tr('e.g. Render hosting', 'எ.கா. ஹோஸ்டிங்')}
                    autoCapitalize="sentences"
                />
                <Select<Category>
                    label={tr('Category', 'வகை')}
                    value={form.category}
                    options={(['hosting', 'storage', 'email', 'payment', 'misc'] as Category[]).map((c) => ({ label: CATEGORY_LABEL[c], value: c }))}
                    onChange={(v) => setForm((p) => ({ ...p, category: v }))}
                />
                <Field
                    label={tr('Amount (₹)', 'தொகை (₹)')}
                    value={form.amount}
                    onChangeText={(v) => setForm((p) => ({ ...p, amount: v }))}
                    placeholder="0"
                    keyboardType="decimal-pad"
                />
                <Field
                    label={tr('Month (YYYY-MM)', 'மாதம் (YYYY-MM)')}
                    value={form.month}
                    onChangeText={(v) => setForm((p) => ({ ...p, month: v }))}
                    placeholder="2026-06"
                />
                <Field
                    label={tr('Notes (optional)', 'குறிப்புகள்')}
                    value={form.notes}
                    onChangeText={(v) => setForm((p) => ({ ...p, notes: v }))}
                    placeholder={tr('Any additional details', 'கூடுதல் விவரங்கள்')}
                    autoCapitalize="sentences"
                    multiline
                />
            </FormModal>
        </>
    );
}
