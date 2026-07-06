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

interface DriverLite {
    id: string;
    user?: { id?: string; name?: string };
}
interface Bus {
    id: string;
    bus_number: string;
    capacity?: number;
    registration_no?: string | null;
    mileage?: number | null;
    fuel_liters?: number | null;
    insurance_expiry?: string | null;
    rc_expiry?: string | null;
    current_status?: string | null;
    drivers?: DriverLite[];
}
interface DriverRow {
    id: string;
    assigned_bus_id?: string | null;
    user?: { id?: string; name?: string };
    bus?: { id?: string } | null;
}

const EMPTY = { bus_number: '', capacity: '', registration_no: '', mileage: '', initial_fuel_liters: '', insurance_expiry: '', rc_expiry: '' };

export default function ManageBusesScreen() {
    const tr = useT();
    const t = useTheme();
    const qc = useQueryClient();

    const busesQ = useQuery({
        queryKey: ['admin-buses'],
        queryFn: async () => (await api.get('/buses')).data as Bus[],
    });
    const driversQ = useQuery({
        queryKey: ['admin-drivers'],
        queryFn: async () => (await api.get('/drivers')).data as DriverRow[],
    });

    const buses = Array.isArray(busesQ.data) ? busesQ.data : [];
    const drivers = Array.isArray(driversQ.data) ? driversQ.data : [];

    const [visible, setVisible] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState({ ...EMPTY });
    const [submitting, setSubmitting] = useState(false);

    const driverOptions = useMemo(
        () => [
            { label: tr('Unassigned', 'ஒதுக்கப்படவில்லை'), value: '' },
            ...drivers.map((d) => ({ label: d.user?.name || tr('Driver', 'ஓட்டுநர்'), value: d.id })),
        ],
        [drivers, tr],
    );

    const openCreate = () => {
        setEditingId(null);
        setForm({ ...EMPTY });
        setVisible(true);
    };

    const openEdit = (b: Bus) => {
        setEditingId(b.id);
        setForm({
            bus_number: b.bus_number || '',
            capacity: b.capacity != null ? String(b.capacity) : '',
            registration_no: b.registration_no || '',
            mileage: b.mileage != null ? String(b.mileage) : '',
            initial_fuel_liters: b.fuel_liters != null ? String(b.fuel_liters) : '',
            insurance_expiry: b.insurance_expiry ? String(b.insurance_expiry).slice(0, 10) : '',
            rc_expiry: b.rc_expiry ? String(b.rc_expiry).slice(0, 10) : '',
        });
        setVisible(true);
    };

    const submit = async () => {
        if (!form.bus_number.trim() || !form.capacity.trim()) return;
        setSubmitting(true);
        try {
            const payload: Record<string, any> = {
                bus_number: form.bus_number.trim(),
                capacity: parseInt(form.capacity, 10),
            };
            if (form.registration_no.trim()) payload.registration_no = form.registration_no.trim();
            if (form.mileage.trim()) payload.mileage = parseFloat(form.mileage);
            payload.insurance_expiry = form.insurance_expiry.trim() || null;
            payload.rc_expiry = form.rc_expiry.trim() || null;
            if (editingId) {
                if (form.initial_fuel_liters.trim()) payload.fuel_liters = parseFloat(form.initial_fuel_liters);
                await api.put(`/buses/${editingId}`, payload);
            } else {
                if (form.initial_fuel_liters.trim()) payload.initial_fuel_liters = parseFloat(form.initial_fuel_liters);
                await api.post('/buses', payload);
            }
            qc.invalidateQueries({ queryKey: ['admin-buses'] });
            setVisible(false);
        } catch (e: any) {
            Alert.alert(tr('Error', 'பிழை'), e?.response?.data?.error || tr('Could not save bus.', 'பேருந்தை சேமிக்க முடியவில்லை.'));
        } finally {
            setSubmitting(false);
        }
    };

    const del = (b: Bus) => {
        confirmDelete(tr('Delete this bus?', 'இந்த பேருந்தை நீக்கவா?'), async () => {
            try {
                await api.delete(`/buses/${b.id}`);
                qc.invalidateQueries({ queryKey: ['admin-buses'] });
            } catch (e: any) {
                Alert.alert(tr('Error', 'பிழை'), e?.response?.data?.error || tr('Could not delete bus.', 'நீக்க முடியவில்லை.'));
            }
        });
    };

    const assignMut = useMutation({
        mutationFn: async ({ busId, driverId }: { busId: string; driverId: string }) => {
            // Clear any driver currently on this bus, then assign the new one.
            const prev = drivers.find((d) => d.bus?.id === busId || d.assigned_bus_id === busId);
            if (prev && prev.id !== driverId) await api.put(`/drivers/${prev.id}`, { assigned_bus_id: null });
            if (driverId) await api.put(`/drivers/${driverId}`, { assigned_bus_id: busId });
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['admin-buses'] });
            qc.invalidateQueries({ queryKey: ['admin-drivers'] });
        },
        onError: (e: any) => Alert.alert(tr('Error', 'பிழை'), e?.response?.data?.error || tr('Could not assign driver.', 'ஒதுக்க முடியவில்லை.')),
    });

    if (busesQ.isLoading) {
        return (
            <>
                <Stack.Screen options={{ title: tr('Buses', 'பேருந்துகள்') }} />
                <Screen><Loader label={tr('Loading buses…', 'ஏற்றுகிறது…')} /></Screen>
            </>
        );
    }

    return (
        <>
            <Stack.Screen options={{ title: tr('Buses', 'பேருந்துகள்') }} />
            <Screen scroll refreshing={busesQ.isFetching} onRefresh={() => busesQ.refetch()}>
                <Button title={tr('Add Bus', 'பேருந்து சேர்')} onPress={openCreate} icon={<Feather name="plus" size={18} color={t.color.brandText} />} />

                {buses.length === 0 ? (
                    <EmptyState
                        icon={<Feather name="truck" size={40} color={t.color.textMuted} />}
                        title={tr('No buses yet', 'பேருந்துகள் இல்லை')}
                        description={tr('Add your first fleet vehicle.', 'முதல் வாகனத்தைச் சேர்க்கவும்.')}
                    />
                ) : (
                    buses.map((b) => {
                        const assignedDriverId = b.drivers?.[0]?.id || drivers.find((d) => d.bus?.id === b.id || d.assigned_bus_id === b.id)?.id || '';
                        const driverName = b.drivers?.[0]?.user?.name;
                        return (
                            <Card key={b.id} style={{ gap: t.spacing.sm }}>
                                <ListRow
                                    leadingIcon="truck"
                                    title={b.bus_number}
                                    subtitle={[
                                        b.registration_no || tr('No reg.', 'பதிவு இல்லை'),
                                        `${tr('Cap', 'இடம்')} ${b.capacity ?? '—'}`,
                                        b.mileage ? `${b.mileage} km/L` : null,
                                    ].filter(Boolean).join(' · ')}
                                    onPress={() => openEdit(b)}
                                    right={
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
                                            <Badge label={(b.current_status || 'active')} tone={b.current_status === 'inactive' ? 'warning' : 'success'} />
                                            <Pressable hitSlop={8} onPress={() => del(b)}>
                                                <Feather name="trash-2" size={18} color={t.color.danger} />
                                            </Pressable>
                                        </View>
                                    }
                                />
                                <Select
                                    label={tr('Assigned Driver', 'ஒதுக்கப்பட்ட ஓட்டுநர்') + (driverName ? `: ${driverName}` : '')}
                                    value={assignedDriverId}
                                    options={driverOptions}
                                    onChange={(driverId) => assignMut.mutate({ busId: b.id, driverId })}
                                />
                            </Card>
                        );
                    })
                )}
            </Screen>

            <FormModal
                visible={visible}
                title={editingId ? tr('Edit Bus', 'பேருந்தை திருத்து') : tr('Add Bus', 'பேருந்து சேர்')}
                onClose={() => setVisible(false)}
                onSubmit={submit}
                submitting={submitting}
                submitLabel={editingId ? tr('Save', 'சேமி') : tr('Create', 'உருவாக்கு')}
            >
                <Field label={tr('Bus Number', 'பேருந்து எண்')} value={form.bus_number} onChangeText={(v) => setForm((f) => ({ ...f, bus_number: v }))} placeholder="TN-01-AB-1234" autoCapitalize="characters" />
                <Field label={tr('Capacity', 'இடவசதி')} value={form.capacity} onChangeText={(v) => setForm((f) => ({ ...f, capacity: v }))} keyboardType="numeric" placeholder="40" />
                <Field label={tr('Registration No.', 'பதிவு எண்')} value={form.registration_no} onChangeText={(v) => setForm((f) => ({ ...f, registration_no: v }))} autoCapitalize="characters" placeholder="TN01AB1234" />
                <Field label={tr('Mileage (km/L)', 'மைலேஜ்')} value={form.mileage} onChangeText={(v) => setForm((f) => ({ ...f, mileage: v }))} keyboardType="decimal-pad" placeholder="12.5" />
                <Field label={editingId ? tr('Fuel (L)', 'எரிபொருள் (L)') : tr('Initial Fuel (L)', 'தொடக்க எரிபொருள் (L)')} value={form.initial_fuel_liters} onChangeText={(v) => setForm((f) => ({ ...f, initial_fuel_liters: v }))} keyboardType="decimal-pad" placeholder="0" />
                <Field label={tr('Insurance Expiry (YYYY-MM-DD)', 'காப்பீடு முடிவு (YYYY-MM-DD)')} value={form.insurance_expiry} onChangeText={(v) => setForm((f) => ({ ...f, insurance_expiry: v }))} placeholder="2026-07-31" />
                <Field label={tr('RC Expiry (YYYY-MM-DD)', 'RC முடிவு (YYYY-MM-DD)')} value={form.rc_expiry} onChangeText={(v) => setForm((f) => ({ ...f, rc_expiry: v }))} placeholder="2027-03-15" />
            </FormModal>
        </>
    );
}
