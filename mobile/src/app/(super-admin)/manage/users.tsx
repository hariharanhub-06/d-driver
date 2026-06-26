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

// Mirrors GET /users/sa (listSAUsers controller): all super_admin platform accounts.
interface SAUser {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    is_active: boolean;
    is_dev_sa: boolean;
    created_at: string;
    assigned_schools_count?: number;
}

interface FormState { name: string; email: string; phone: string; password: string }
const empty: FormState = { name: '', email: '', phone: '', password: '' };

export default function SaUsersScreen() {
    const tr = useT();
    const t = useTheme();
    const qc = useQueryClient();

    const users = useQuery<SAUser[]>({
        queryKey: ['sa-users'],
        queryFn: async () => {
            const { data } = await api.get('/users/sa');
            return Array.isArray(data) ? data : [];
        },
    });

    const [modal, setModal] = useState(false);
    const [form, setForm] = useState<FormState>(empty);
    const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

    const openCreate = () => { setForm(empty); setModal(true); };

    // Create a new SA (POST /users/sa). Email + password required, password min 8.
    const create = useMutation({
        mutationFn: async () =>
            (await api.post('/users/sa', {
                name: form.name.trim(),
                email: form.email.trim().toLowerCase(),
                phone: form.phone.trim() || undefined,
                password: form.password,
            })).data,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['sa-users'] });
            setModal(false);
        },
        onError: (e: any) =>
            Alert.alert(tr('Error', 'பிழை'), e?.response?.data?.error || tr('Failed to create user', 'உருவாக்க முடியவில்லை')),
    });

    // Toggle active (PATCH /users/:id/active).
    const toggle = useMutation({
        mutationFn: async (id: string) => (await api.patch(`/users/${id}/active`, {})).data,
        onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-users'] }),
        onError: (e: any) =>
            Alert.alert(tr('Error', 'பிழை'), e?.response?.data?.error || tr('Failed to update status', 'நிலையை மாற்ற முடியவில்லை')),
    });

    // Delete (DELETE /users/:id) — SA only; backend blocks self / dev SA.
    const del = useMutation({
        mutationFn: async (id: string) => (await api.delete(`/users/${id}`)).data,
        onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-users'] }),
        onError: (e: any) =>
            Alert.alert(tr('Error', 'பிழை'), e?.response?.data?.error || tr('Failed to delete user', 'நீக்க முடியவில்லை')),
    });

    const header = <Stack.Screen options={{ title: tr('Users', 'பயனர்கள்') }} />;

    if (users.isLoading) {
        return <>{header}<Screen><Loader label={tr('Loading users…', 'ஏற்றுகிறது…')} /></Screen></>;
    }

    const data = users.data ?? [];
    const passwordOk = form.password.length >= 8;
    const required = !!form.name.trim() && !!form.email.trim() && passwordOk;

    return (
        <>
            {header}
            <Screen scroll refreshing={users.isFetching} onRefresh={() => users.refetch()}>
                <AppText size="xl" weight="800">{tr('Platform Users', 'தள பயனர்கள்')}</AppText>
                <AppText muted size="sm">{tr('Manage super admin accounts', 'சூப்பர் அட்மின் கணக்குகளை நிர்வகி')}</AppText>

                <Button
                    title={tr('Add User', 'பயனர் சேர்')}
                    onPress={openCreate}
                    icon={<Feather name="plus" size={18} color={t.color.brandText} />}
                />

                {data.length === 0 ? (
                    <EmptyState
                        title={tr('No users yet', 'பயனர்கள் இல்லை')}
                        description={tr('Tap Add User to create one.', 'சேர்க்க மேலே தட்டவும்.')}
                        icon={<Feather name="users" size={40} color={t.color.textMuted} />}
                    />
                ) : (
                    data.map((u) => {
                        const protectedRow = u.is_dev_sa;
                        const schools = u.is_dev_sa
                            ? tr('All schools', 'அனைத்து பள்ளிகள்')
                            : `${u.assigned_schools_count ?? 0} ${tr('school(s)', 'பள்ளி(கள்)')}`;
                        return (
                            <ListRow
                                key={u.id}
                                leadingIcon="user"
                                title={u.name}
                                subtitle={[u.email, u.phone, schools].filter(Boolean).join(' · ')}
                                right={
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
                                        {u.is_dev_sa ? <Badge label={tr('Dev', 'டெவ்')} tone="neutral" /> : null}
                                        <Badge
                                            label={u.is_active ? tr('Active', 'செயலில்') : tr('Inactive', 'செயலற்ற')}
                                            tone={u.is_active ? 'success' : 'warning'}
                                        />
                                        {!protectedRow && (
                                            <Pressable
                                                hitSlop={8}
                                                onPress={() =>
                                                    confirmDelete(
                                                        tr('Delete this user?', 'இந்த பயனரை நீக்கவா?'),
                                                        () => del.mutate(u.id),
                                                    )
                                                }
                                            >
                                                <Feather name="trash-2" size={18} color={t.color.danger} />
                                            </Pressable>
                                        )}
                                    </View>
                                }
                                onPress={
                                    protectedRow
                                        ? undefined
                                        : () =>
                                              Alert.alert(
                                                  u.name,
                                                  u.email,
                                                  [
                                                      { text: tr('Cancel', 'ரத்து'), style: 'cancel' },
                                                      {
                                                          text: u.is_active
                                                              ? tr('Deactivate', 'செயலிழக்கச் செய்')
                                                              : tr('Activate', 'செயல்படுத்து'),
                                                          onPress: () => toggle.mutate(u.id),
                                                      },
                                                  ],
                                              )
                                }
                            />
                        );
                    })
                )}
            </Screen>

            <FormModal
                visible={modal}
                title={tr('Add Super Admin', 'சூப்பர் அட்மின் சேர்')}
                onClose={() => setModal(false)}
                onSubmit={() => {
                    if (!required) {
                        Alert.alert(
                            tr('Missing fields', 'தகவல் இல்லை'),
                            tr('Name, email and an 8+ character password are required.', 'பெயர், மின்னஞ்சல் மற்றும் 8+ எழுத்து கடவுச்சொல் தேவை.'),
                        );
                        return;
                    }
                    create.mutate();
                }}
                submitting={create.isPending}
                submitLabel={tr('Create', 'உருவாக்கு')}
            >
                <Field label={tr('Name', 'பெயர்')} value={form.name} onChangeText={(v) => set('name', v)} placeholder={tr('Full name', 'முழு பெயர்')} autoCapitalize="words" />
                <Field label={tr('Email', 'மின்னஞ்சல்')} value={form.email} onChangeText={(v) => set('email', v)} placeholder="admin@example.com" keyboardType="email-address" />
                <Field label={tr('Phone', 'தொலைபேசி')} value={form.phone} onChangeText={(v) => set('phone', v)} placeholder="+91…" keyboardType="phone-pad" />
                <Field label={tr('Password', 'கடவுச்சொல்')} value={form.password} onChangeText={(v) => set('password', v)} placeholder={tr('min. 8 characters', 'குறைந்தது 8 எழுத்துகள்')} secureTextEntry />
                <AppText size="sm" muted>{tr('The new admin must change this password on first login.', 'புதிய நிர்வாகி முதல் உள்நுழைவில் கடவுச்சொல்லை மாற்ற வேண்டும்.')}</AppText>
            </FormModal>
        </>
    );
}
