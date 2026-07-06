import React, { useMemo, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useT } from '@/lib/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen, AppText, Button, Card, Loader, EmptyState, Badge } from '@/components/ui';
import { Field, Select, FormModal, ListRow, confirmDelete } from '@/components/form';

interface BusLite {
    id: string;
    bus_number?: string;
}
interface Driver {
    id: string;
    license_no?: string | null;
    license_expiry?: string | null;
    assigned_bus_id?: string | null;
    phone?: string | null;
    user?: { id?: string; name?: string; email?: string; phone?: string; is_active?: boolean };
    bus?: BusLite | null;
}

const EMPTY = { name: '', email: '', phone: '', license_no: '', license_expiry: '', password: '', assigned_bus_id: '' };

export default function ManageDriversScreen() {
    const tr = useT();
    const t = useTheme();
    const qc = useQueryClient();

    const driversQ = useQuery({
        queryKey: ['admin-drivers'],
        queryFn: async () => (await api.get('/drivers')).data as Driver[],
    });
    const busesQ = useQuery({
        queryKey: ['admin-buses'],
        queryFn: async () => (await api.get('/buses')).data as BusLite[],
    });

    const drivers = Array.isArray(driversQ.data) ? driversQ.data : [];
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

    const openEdit = (d: Driver) => {
        setEditingId(d.id);
        setForm({
            name: d.user?.name || '',
            email: d.user?.email || '',
            phone: d.user?.phone || d.phone || '',
            license_no: d.license_no || '',
            license_expiry: d.license_expiry ? String(d.license_expiry).slice(0, 10) : '',
            password: '',
            assigned_bus_id: d.assigned_bus_id || d.bus?.id || '',
        });
        setVisible(true);
    };

    const submit = async () => {
        if (!form.name.trim() || !form.email.trim()) return;
        setSubmitting(true);
        try {
            if (editingId) {
                await api.put(`/drivers/${editingId}`, {
                    license_no: form.license_no.trim() || null,
                    license_expiry: form.license_expiry.trim() || null,
                    assigned_bus_id: form.assigned_bus_id || null,
                });
                // Name/phone live on the user account.
                qc.invalidateQueries({ queryKey: ['admin-drivers'] });
                qc.invalidateQueries({ queryKey: ['admin-buses'] });
                setVisible(false);
            } else {
                const { data } = await api.post('/drivers', {
                    name: form.name.trim(),
                    email: form.email.trim(),
                    phone: form.phone.trim() || undefined,
                    license_no: form.license_no.trim() || undefined,
                    license_expiry: form.license_expiry.trim() || undefined,
                    assigned_bus_id: form.assigned_bus_id || undefined,
                    ...(form.password ? { password: form.password } : {}),
                });
                qc.invalidateQueries({ queryKey: ['admin-drivers'] });
                setVisible(false);
                if (data?.temp_password) {
                    Alert.alert(
                        tr('Driver Created', 'ஓட்டுநர் உருவாக்கப்பட்டார்'),
                        `${tr('Temporary password', 'தற்காலிக கடவுச்சொல்')}: ${data.temp_password}`,
                    );
                }
            }
        } catch (e: any) {
            Alert.alert(tr('Error', 'பிழை'), e?.response?.data?.error || tr('Could not save driver.', 'சேமிக்க முடியவில்லை.'));
        } finally {
            setSubmitting(false);
        }
    };

    const del = (d: Driver) => {
        confirmDelete(tr('Delete this driver and their login?', 'இந்த ஓட்டுநரை நீக்கவா?'), async () => {
            try {
                await api.delete(`/drivers/${d.id}`);
                qc.invalidateQueries({ queryKey: ['admin-drivers'] });
            } catch (e: any) {
                Alert.alert(tr('Error', 'பிழை'), e?.response?.data?.error || tr('Could not delete.', 'நீக்க முடியவில்லை.'));
            }
        });
    };

    if (driversQ.isLoading) {
        return (
            <>
                <Stack.Screen options={{ title: tr('Drivers', 'ஓட்டுநர்கள்') }} />
                <Screen><Loader label={tr('Loading drivers…', 'ஏற்றுகிறது…')} /></Screen>
            </>
        );
    }

    return (
        <>
            <Stack.Screen options={{ title: tr('Drivers', 'ஓட்டுநர்கள்') }} />
            <Screen scroll refreshing={driversQ.isFetching} onRefresh={() => driversQ.refetch()}>
                <Button title={tr('Add Driver', 'ஓட்டுநர் சேர்')} onPress={openCreate} icon={<Feather name="plus" size={18} color={t.color.brandText} />} />

                {drivers.length === 0 ? (
                    <EmptyState
                        icon={<Feather name="user" size={40} color={t.color.textMuted} />}
                        title={tr('No drivers yet', 'ஓட்டுநர்கள் இல்லை')}
                        description={tr('Add a driver to create their login.', 'ஓட்டுநரைச் சேர்க்கவும்.')}
                    />
                ) : (
                    drivers.map((d) => (
                        <ListRow
                            key={d.id}
                            leadingIcon="user"
                            title={d.user?.name || tr('Unknown', 'தெரியாதது')}
                            subtitle={[
                                d.user?.phone || d.phone || tr('No phone', 'தொலைபேசி இல்லை'),
                                d.license_no ? `${tr('Lic', 'உரிமம்')}: ${d.license_no}` : null,
                                d.bus?.bus_number ? `${tr('Bus', 'பேருந்து')} ${d.bus.bus_number}` : tr('No bus', 'பேருந்து இல்லை'),
                            ].filter(Boolean).join(' · ')}
                            onPress={() => openEdit(d)}
                            right={
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
                                    <Badge label={d.user?.is_active === false ? tr('Inactive', 'செயலற்றது') : tr('Active', 'செயலில்')} tone={d.user?.is_active === false ? 'warning' : 'success'} />
                                    <Pressable hitSlop={8} onPress={() => del(d)}>
                                        <Feather name="trash-2" size={18} color={t.color.danger} />
                                    </Pressable>
                                </View>
                            }
                        />
                    ))
                )}
            </Screen>

            <FormModal
                visible={visible}
                title={editingId ? tr('Edit Driver', 'ஓட்டுநரை திருத்து') : tr('Add Driver', 'ஓட்டுநர் சேர்')}
                onClose={() => setVisible(false)}
                onSubmit={submit}
                submitting={submitting}
                submitLabel={editingId ? tr('Save', 'சேமி') : tr('Create', 'உருவாக்கு')}
            >
                <Field label={tr('Full Name', 'முழு பெயர்')} value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} autoCapitalize="words" editable={!editingId} placeholder="Ravi Kumar" />
                <Field label={tr('Email', 'மின்னஞ்சல்')} value={form.email} onChangeText={(v) => setForm((f) => ({ ...f, email: v }))} keyboardType="email-address" editable={!editingId} placeholder="ravi@school.com" />
                <Field label={tr('Phone', 'தொலைபேசி')} value={form.phone} onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))} keyboardType="phone-pad" editable={!editingId} placeholder="9876543210" />
                <Field label={tr('License No.', 'உரிம எண்')} value={form.license_no} onChangeText={(v) => setForm((f) => ({ ...f, license_no: v }))} autoCapitalize="characters" placeholder="TN-1234" />
                <Field label={tr('License Expiry (YYYY-MM-DD)', 'உரிமம் முடிவு (YYYY-MM-DD)')} value={form.license_expiry} onChangeText={(v) => setForm((f) => ({ ...f, license_expiry: v }))} placeholder="2027-05-20" />
                {!editingId ? (
                    <Field label={tr('Temporary Password (optional)', 'தற்காலிக கடவுச்சொல்')} value={form.password} onChangeText={(v) => setForm((f) => ({ ...f, password: v }))} placeholder={tr('Auto-generated if blank', 'வெறுமையாக இருந்தால் தானாக')} />
                ) : null}
                <Select label={tr('Assigned Bus', 'ஒதுக்கப்பட்ட பேருந்து')} value={form.assigned_bus_id} options={busOptions} onChange={(v) => setForm((f) => ({ ...f, assigned_bus_id: v }))} />
                {editingId ? (
                    <AppText size="sm" muted>{tr('Name, email and phone are managed on the user account.', 'பெயர், மின்னஞ்சல், தொலைபேசி கணக்கில் நிர்வகிக்கப்படும்.')}</AppText>
                ) : null}
            </FormModal>
        </>
    );
}
