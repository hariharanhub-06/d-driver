import React, { useMemo, useState } from 'react';
import { Pressable, Alert, View } from 'react-native';
import { Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useT } from '@/lib/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen, AppText, Button, Loader, EmptyState, Badge } from '@/components/ui';
import { Field, Select, FormModal, ListRow, confirmDelete } from '@/components/form';

interface Ref { id: string; name: string }
interface Stop {
    id: string;
    name: string;
    route_id?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    sequence?: number | null;
    pickup_time?: string | null;
    route?: Ref | null;
}

interface FormState {
    name: string;
    route_id: string;
    latitude: string;
    longitude: string;
    pickup_time: string;
    sequence: string;
}
const empty: FormState = { name: '', route_id: '', latitude: '', longitude: '', pickup_time: '', sequence: '' };

export default function StopsScreen() {
    const tr = useT();
    const t = useTheme();
    const qc = useQueryClient();

    const stops = useQuery<Stop[]>({
        queryKey: ['admin-stops'],
        queryFn: async () => (await api.get('/stops')).data,
    });
    const routes = useQuery<Ref[]>({
        queryKey: ['admin-routes'],
        queryFn: async () => (await api.get('/routes')).data,
    });

    const [modal, setModal] = useState(false);
    const [editing, setEditing] = useState<Stop | null>(null);
    const [form, setForm] = useState<FormState>(empty);

    const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

    const openCreate = () => { setEditing(null); setForm(empty); setModal(true); };
    const openEdit = (s: Stop) => {
        setEditing(s);
        setForm({
            name: s.name ?? '',
            route_id: s.route_id ?? s.route?.id ?? '',
            latitude: s.latitude != null ? String(s.latitude) : '',
            longitude: s.longitude != null ? String(s.longitude) : '',
            pickup_time: s.pickup_time ?? '',
            sequence: s.sequence != null ? String(s.sequence) : '',
        });
        setModal(true);
    };

    const save = useMutation({
        mutationFn: async () => {
            // Latitude/longitude are optional in the form. When left blank we keep the
            // stop's existing coordinates on edit, and fall back to 0 only when creating.
            const latBlank = !form.latitude.trim();
            const lngBlank = !form.longitude.trim();
            const payload = {
                name: form.name.trim(),
                route_id: form.route_id,
                latitude: latBlank ? (editing?.latitude ?? 0) : parseFloat(form.latitude),
                longitude: lngBlank ? (editing?.longitude ?? 0) : parseFloat(form.longitude),
                pickup_time: form.pickup_time.trim() || null,
                sequence: form.sequence.trim() ? parseInt(form.sequence, 10) : 0,
            };
            if (editing) return (await api.put(`/stops/${editing.id}`, payload)).data;
            return (await api.post('/stops', payload)).data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['admin-stops'] });
            setModal(false);
        },
        onError: (e: any) => Alert.alert(tr('Error', 'பிழை'), e?.response?.data?.error || tr('Failed to save stop', 'சேமிக்க முடியவில்லை')),
    });

    const del = useMutation({
        mutationFn: async (id: string) => (await api.delete(`/stops/${id}`)).data,
        onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-stops'] }),
        onError: (e: any) => Alert.alert(tr('Error', 'பிழை'), e?.response?.data?.error || tr('Failed to delete', 'நீக்க முடியவில்லை')),
    });

    const routeOpts = useMemo(
        () => (routes.data ?? []).map((r) => ({ label: r.name, value: r.id })),
        [routes.data],
    );

    const header = <Stack.Screen options={{ title: tr('Stops', 'நிறுத்தங்கள்') }} />;

    if (stops.isLoading) {
        return <>{header}<Screen><Loader label={tr('Loading stops…', 'ஏற்றுகிறது…')} /></Screen></>;
    }

    const data = stops.data ?? [];
    const required = !!form.name.trim() && !!form.route_id;

    return (
        <>
            {header}
            <Screen scroll refreshing={stops.isFetching} onRefresh={() => stops.refetch()}>
                <Button title={tr('Add Stop', 'நிறுத்தத்தைச் சேர்')} onPress={openCreate} icon={<Feather name="plus" size={18} color={t.color.brandText} />} />
                {data.length === 0 ? (
                    <EmptyState
                        title={tr('No stops yet', 'நிறுத்தங்கள் இல்லை')}
                        description={tr('Tap Add Stop to create one.', 'சேர்க்க மேலே தட்டவும்.')}
                        icon={<Feather name="map-pin" size={40} color={t.color.textMuted} />}
                    />
                ) : (
                    data.map((s) => (
                        <ListRow
                            key={s.id}
                            leadingIcon="map-pin"
                            title={s.name}
                            subtitle={[
                                s.route?.name,
                                s.pickup_time && `${tr('Pickup', 'ஏற்றம்')} ${s.pickup_time}`,
                                (s.latitude != null && s.longitude != null) ? `${s.latitude.toFixed(4)}, ${s.longitude.toFixed(4)}` : null,
                            ].filter(Boolean).join(' · ') || tr('No route', 'வழி இல்லை')}
                            onPress={() => openEdit(s)}
                            right={
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
                                    <Badge label={`#${s.sequence ?? 0}`} tone="neutral" />
                                    <Pressable hitSlop={8} onPress={() => confirmDelete(tr('Delete this stop?', 'இந்த நிறுத்தத்தை நீக்கவா?'), () => del.mutate(s.id))}>
                                        <Feather name="trash-2" size={18} color={t.color.danger} />
                                    </Pressable>
                                </View>
                            }
                        />
                    ))
                )}
            </Screen>

            <FormModal
                visible={modal}
                title={editing ? tr('Edit Stop', 'திருத்து') : tr('Add Stop', 'நிறுத்தத்தைச் சேர்')}
                onClose={() => setModal(false)}
                onSubmit={() => { if (required) save.mutate(); }}
                submitting={save.isPending}
                submitLabel={editing ? tr('Save', 'சேமி') : tr('Create', 'உருவாக்கு')}
            >
                <Field label={tr('Name', 'பெயர்')} value={form.name} onChangeText={(v) => set('name', v)} placeholder={tr('Stop name', 'நிறுத்த பெயர்')} autoCapitalize="words" />
                {routeOpts.length === 0 ? (
                    <AppText size="sm" muted>{tr('Create a route first to assign this stop.', 'முதலில் ஒரு வழியை உருவாக்கவும்.')}</AppText>
                ) : (
                    <Select label={tr('Route', 'வழி')} value={form.route_id} options={routeOpts} onChange={(v) => set('route_id', v)} />
                )}
                <Field label={tr('Latitude (optional)', 'அட்சரேகை (விருப்பம்)')} value={form.latitude} onChangeText={(v) => set('latitude', v)} placeholder="13.0827" keyboardType="decimal-pad" />
                <Field label={tr('Longitude (optional)', 'தீர்க்கரேகை (விருப்பம்)')} value={form.longitude} onChangeText={(v) => set('longitude', v)} placeholder="80.2707" keyboardType="decimal-pad" />
                <Field label={tr('Pickup Time', 'ஏற்றும் நேரம்')} value={form.pickup_time} onChangeText={(v) => set('pickup_time', v)} placeholder="07:30" />
                <Field label={tr('Sequence', 'வரிசை')} value={form.sequence} onChangeText={(v) => set('sequence', v)} placeholder="1" keyboardType="numeric" />
            </FormModal>
        </>
    );
}
