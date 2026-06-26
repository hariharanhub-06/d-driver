import React, { useState } from 'react';
import { Pressable, Alert, View } from 'react-native';
import { Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useT } from '@/lib/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen, AppText, Button, Loader, EmptyState, Badge } from '@/components/ui';
import { Field, FormModal, ListRow, confirmDelete } from '@/components/form';

interface Child { id: string; name: string; grade?: string | null; route?: { name?: string } | null }
interface Parent {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    is_active?: boolean;
    is_first_login?: boolean;
    children?: Child[];
}

interface FormState { name: string; email: string; phone: string }
const empty: FormState = { name: '', email: '', phone: '' };

export default function ParentsScreen() {
    const tr = useT();
    const t = useTheme();
    const qc = useQueryClient();

    const parents = useQuery<Parent[]>({
        queryKey: ['admin-parents'],
        queryFn: async () => (await api.get('/parents')).data,
    });

    const [modal, setModal] = useState(false);
    const [editing, setEditing] = useState<Parent | null>(null);
    const [form, setForm] = useState<FormState>(empty);

    const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

    const openCreate = () => { setEditing(null); setForm(empty); setModal(true); };
    const openEdit = (p: Parent) => {
        setEditing(p);
        setForm({ name: p.name ?? '', email: p.email ?? '', phone: p.phone ?? '' });
        setModal(true);
    };

    const save = useMutation({
        mutationFn: async () => {
            if (editing) {
                // Update via legacy user endpoint (name/phone; email immutable here)
                return (await api.put(`/users/${editing.id}`, { name: form.name.trim(), phone: form.phone.trim() || null })).data;
            }
            return (await api.post('/users', {
                name: form.name.trim(),
                email: form.email.trim().toLowerCase(),
                phone: form.phone.trim() || null,
                role: 'parent',
            })).data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['admin-parents'] });
            setModal(false);
        },
        onError: (e: any) => Alert.alert(tr('Error', 'பிழை'), e?.response?.data?.error || tr('Failed to save parent', 'சேமிக்க முடியவில்லை')),
    });

    const del = useMutation({
        mutationFn: async (id: string) => (await api.delete(`/users/${id}`)).data,
        onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-parents'] }),
        onError: (e: any) => Alert.alert(tr('Error', 'பிழை'), e?.response?.data?.error || tr('Failed to delete (super admin only)', 'நீக்க முடியவில்லை')),
    });

    const header = <Stack.Screen options={{ title: tr('Parents', 'பெற்றோர்கள்') }} />;

    if (parents.isLoading) {
        return <>{header}<Screen><Loader label={tr('Loading parents…', 'ஏற்றுகிறது…')} /></Screen></>;
    }

    const data = parents.data ?? [];
    const required = editing ? !!form.name.trim() : !!form.name.trim() && !!form.email.trim();

    return (
        <>
            {header}
            <Screen scroll refreshing={parents.isFetching} onRefresh={() => parents.refetch()}>
                <Button title={tr('Add Parent', 'பெற்றோரைச் சேர்')} onPress={openCreate} icon={<Feather name="plus" size={18} color={t.color.brandText} />} />
                {data.length === 0 ? (
                    <EmptyState
                        title={tr('No parents yet', 'பெற்றோர் இல்லை')}
                        description={tr('Tap Add Parent to create one.', 'சேர்க்க மேலே தட்டவும்.')}
                        icon={<Feather name="users" size={40} color={t.color.textMuted} />}
                    />
                ) : (
                    data.map((p) => {
                        const childNames = (p.children ?? []).map((c) => c.name).join(', ');
                        return (
                            <ListRow
                                key={p.id}
                                leadingIcon="user"
                                title={p.name}
                                subtitle={[p.email, p.phone, childNames && `${tr('Children', 'குழந்தைகள்')}: ${childNames}`].filter(Boolean).join(' · ')}
                                onPress={() => openEdit(p)}
                                right={
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
                                        <Badge label={p.is_active === false ? tr('Inactive', 'செயலற்ற') : tr('Active', 'செயலில்')} tone={p.is_active === false ? 'warning' : 'success'} />
                                        <Pressable hitSlop={8} onPress={() => confirmDelete(tr('Delete this parent?', 'இந்த பெற்றோரை நீக்கவா?'), () => del.mutate(p.id))}>
                                            <Feather name="trash-2" size={18} color={t.color.danger} />
                                        </Pressable>
                                    </View>
                                }
                            />
                        );
                    })
                )}
            </Screen>

            <FormModal
                visible={modal}
                title={editing ? tr('Edit Parent', 'திருத்து') : tr('Add Parent', 'பெற்றோரைச் சேர்')}
                onClose={() => setModal(false)}
                onSubmit={() => { if (required) save.mutate(); }}
                submitting={save.isPending}
                submitLabel={editing ? tr('Save', 'சேமி') : tr('Create', 'உருவாக்கு')}
            >
                <Field label={tr('Name', 'பெயர்')} value={form.name} onChangeText={(v) => set('name', v)} placeholder={tr('Parent name', 'பெற்றோர் பெயர்')} autoCapitalize="words" />
                <Field label={tr('Email', 'மின்னஞ்சல்')} value={form.email} onChangeText={(v) => set('email', v)} placeholder="parent@example.com" keyboardType="email-address" editable={!editing} />
                <Field label={tr('Phone', 'தொலைபேசி')} value={form.phone} onChangeText={(v) => set('phone', v)} placeholder="+91…" keyboardType="phone-pad" />
                {editing ? (
                    <AppText size="sm" muted>{tr('Email cannot be changed here. Children are linked from the Students screen.', 'மின்னஞ்சல் மாற்ற முடியாது. குழந்தைகள் மாணவர் திரையில் இணைக்கப்படுகின்றன.')}</AppText>
                ) : (
                    <AppText size="sm" muted>{tr('A temporary password is generated; the parent changes it on first login.', 'தற்காலிக கடவுச்சொல் உருவாக்கப்படும்.')}</AppText>
                )}
            </FormModal>
        </>
    );
}
