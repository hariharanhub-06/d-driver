import React, { useMemo, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useT } from '@/lib/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen, AppText, Button, Loader, EmptyState, Badge } from '@/components/ui';
import { Field, Select, FormModal, ListRow, confirmDelete } from '@/components/form';

interface BusLite {
    id: string;
    bus_number?: string;
}
interface StaffUser {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    is_active?: boolean;
    assigned_bus_id?: string | null;
    assignedBus?: { id: string; bus_number: string } | null;
}

const EMPTY = { name: '', email: '', phone: '', password: '', assigned_bus_id: '' };

export default function ManageBusStaffScreen() {
    const tr = useT();
    const t = useTheme();
    const qc = useQueryClient();

    const staffQ = useQuery({
        queryKey: ['admin-bus-staff'],
        queryFn: async () => (await api.get('/users', { params: { role: 'bus_staff' } })).data as StaffUser[],
    });
    const busesQ = useQuery({
        queryKey: ['admin-buses'],
        queryFn: async () => (await api.get('/buses')).data as BusLite[],
    });

    const staff = Array.isArray(staffQ.data) ? staffQ.data : [];
    const buses = Array.isArray(busesQ.data) ? busesQ.data : [];

    const [visible, setVisible] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState({ ...EMPTY });
    const [submitting, setSubmitting] = useState(false);

    const busOptions = useMemo(
        () => [
            { label: tr('No bus', 'பேருந்து இல்லை'), value: '' },
            ...buses.map((b) => ({ label: b.bus_number || '—', value: b.id })),
        ],
        [buses, tr],
    );

    const openCreate = () => {
        setEditingId(null);
        setForm({ ...EMPTY });
        setVisible(true);
    };

    const openEdit = (s: StaffUser) => {
        setEditingId(s.id);
        setForm({
            name: s.name || '',
            email: s.email || '',
            phone: s.phone || '',
            password: '',
            assigned_bus_id: s.assigned_bus_id || s.assignedBus?.id || '',
        });
        setVisible(true);
    };

    const submit = async () => {
        if (!editingId) {
            if (!form.name.trim() || !form.email.trim() || form.password.length < 6) return;
        }
        setSubmitting(true);
        try {
            if (editingId) {
                // Only the bus assignment is editable for existing staff (mirrors web).
                await api.patch(`/users/${editingId}`, { assigned_bus_id: form.assigned_bus_id || null });
            } else {
                await api.post('/users', {
                    name: form.name.trim(),
                    email: form.email.trim(),
                    phone: form.phone.trim() || undefined,
                    password: form.password,
                    role: 'bus_staff',
                    assigned_bus_id: form.assigned_bus_id || undefined,
                });
            }
            qc.invalidateQueries({ queryKey: ['admin-bus-staff'] });
            setVisible(false);
        } catch (e: any) {
            Alert.alert(tr('Error', 'பிழை'), e?.response?.data?.error || tr('Could not save staff.', 'சேமிக்க முடியவில்லை.'));
        } finally {
            setSubmitting(false);
        }
    };

    const del = (s: StaffUser) => {
        confirmDelete(tr('Delete this staff member?', 'இந்த ஊழியரை நீக்கவா?'), async () => {
            try {
                await api.delete(`/users/${s.id}`);
                qc.invalidateQueries({ queryKey: ['admin-bus-staff'] });
            } catch (e: any) {
                Alert.alert(tr('Error', 'பிழை'), e?.response?.data?.error || tr('Could not delete.', 'நீக்க முடியவில்லை.'));
            }
        });
    };

    const createValid = !!form.name.trim() && !!form.email.trim() && form.password.length >= 6;

    if (staffQ.isLoading) {
        return (
            <>
                <Stack.Screen options={{ title: tr('Bus Staff', 'பணியாளர்கள்') }} />
                <Screen><Loader label={tr('Loading staff…', 'ஏற்றுகிறது…')} /></Screen>
            </>
        );
    }

    return (
        <>
            <Stack.Screen options={{ title: tr('Bus Staff', 'பணியாளர்கள்') }} />
            <Screen scroll refreshing={staffQ.isFetching} onRefresh={() => staffQ.refetch()}>
                <Button title={tr('Add Bus Staff', 'பணியாளர் சேர்')} onPress={openCreate} icon={<Feather name="plus" size={18} color={t.color.brandText} />} />

                {staff.length === 0 ? (
                    <EmptyState
                        icon={<Feather name="users" size={40} color={t.color.textMuted} />}
                        title={tr('No bus staff yet', 'பணியாளர்கள் இல்லை')}
                        description={tr('Add attendants who assist on buses.', 'பேருந்தில் உதவும் பணியாளர்களைச் சேர்க்கவும்.')}
                    />
                ) : (
                    staff.map((s) => {
                        const busNo = s.assignedBus?.bus_number || buses.find((b) => b.id === s.assigned_bus_id)?.bus_number;
                        return (
                            <ListRow
                                key={s.id}
                                leadingIcon="user"
                                title={s.name}
                                subtitle={[
                                    s.email || tr('No email', 'மின்னஞ்சல் இல்லை'),
                                    s.phone || null,
                                    busNo ? `${tr('Bus', 'பேருந்து')} ${busNo}` : tr('No bus', 'பேருந்து இல்லை'),
                                ].filter(Boolean).join(' · ')}
                                onPress={() => openEdit(s)}
                                right={
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
                                        <Badge label={s.is_active === false ? tr('Inactive', 'செயலற்றது') : tr('Active', 'செயலில்')} tone={s.is_active === false ? 'warning' : 'success'} />
                                        <Pressable hitSlop={8} onPress={() => del(s)}>
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
                visible={visible}
                title={editingId ? tr('Edit Staff', 'பணியாளரை திருத்து') : tr('Add Bus Staff', 'பணியாளர் சேர்')}
                onClose={() => setVisible(false)}
                onSubmit={submit}
                submitting={submitting}
                submitLabel={editingId ? tr('Save', 'சேமி') : tr('Create', 'உருவாக்கு')}
            >
                <Field label={tr('Full Name', 'முழு பெயர்')} value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} autoCapitalize="words" editable={!editingId} placeholder="Ravi Kumar" />
                <Field label={tr('Email', 'மின்னஞ்சல்')} value={form.email} onChangeText={(v) => setForm((f) => ({ ...f, email: v }))} keyboardType="email-address" editable={!editingId} placeholder="ravi@school.com" />
                <Field label={tr('Phone', 'தொலைபேசி')} value={form.phone} onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))} keyboardType="phone-pad" editable={!editingId} placeholder="9876543210" />
                {!editingId ? (
                    <Field label={tr('Temporary Password', 'தற்காலிக கடவுச்சொல்')} value={form.password} onChangeText={(v) => setForm((f) => ({ ...f, password: v }))} placeholder={tr('Min. 6 characters', 'குறைந்தது 6 எழுத்துகள்')} />
                ) : null}
                <Select label={tr('Assigned Bus', 'ஒதுக்கப்பட்ட பேருந்து')} value={form.assigned_bus_id} options={busOptions} onChange={(v) => setForm((f) => ({ ...f, assigned_bus_id: v }))} />
                {!editingId && !createValid ? (
                    <AppText size="sm" muted>{tr('Name, email and a 6+ char password are required.', 'பெயர், மின்னஞ்சல் மற்றும் 6 எழுத்து கடவுச்சொல் தேவை.')}</AppText>
                ) : null}
                {editingId ? (
                    <AppText size="sm" muted>{tr('Only the bus assignment can be changed here.', 'பேருந்து ஒதுக்கீட்டை மட்டுமே மாற்ற முடியும்.')}</AppText>
                ) : null}
            </FormModal>
        </>
    );
}
