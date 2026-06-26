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

type RouteType = 'morning' | 'evening' | 'both';

interface Bus { id: string; bus_number: string }
interface RouteItem {
    id: string;
    name: string;
    route_type?: RouteType | string | null;
    bus_id?: string | null;
    start_point?: string | null;
    end_point?: string | null;
    is_active?: boolean;
    bus?: { id: string; bus_number?: string } | null;
    stops?: { id: string }[];
}

interface FormState {
    name: string;
    route_type: RouteType;
    bus_id: string;
    start_point: string;
    end_point: string;
}
const empty: FormState = { name: '', route_type: 'morning', bus_id: '', start_point: '', end_point: '' };

export default function RoutesScreen() {
    const tr = useT();
    const t = useTheme();
    const qc = useQueryClient();

    const routes = useQuery<RouteItem[]>({
        queryKey: ['admin-routes'],
        queryFn: async () => (await api.get('/routes')).data,
    });
    const buses = useQuery<Bus[]>({
        queryKey: ['admin-buses'],
        queryFn: async () => (await api.get('/buses')).data,
    });

    const [modal, setModal] = useState(false);
    const [editing, setEditing] = useState<RouteItem | null>(null);
    const [form, setForm] = useState<FormState>(empty);

    const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v as any }));

    const openCreate = () => { setEditing(null); setForm(empty); setModal(true); };
    const openEdit = (r: RouteItem) => {
        setEditing(r);
        setForm({
            name: r.name ?? '',
            route_type: (r.route_type as RouteType) || 'morning',
            bus_id: r.bus_id ?? r.bus?.id ?? '',
            start_point: r.start_point ?? '',
            end_point: r.end_point ?? '',
        });
        setModal(true);
    };

    const save = useMutation({
        mutationFn: async () => {
            const payload = {
                name: form.name.trim(),
                route_type: form.route_type,
                bus_id: form.bus_id || null,
                start_point: form.start_point.trim() || null,
                end_point: form.end_point.trim() || null,
            };
            if (editing) return (await api.put(`/routes/${editing.id}`, payload)).data;
            return (await api.post('/routes', payload)).data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['admin-routes'] });
            setModal(false);
        },
        onError: (e: any) => Alert.alert(tr('Error', 'பிழை'), e?.response?.data?.error || tr('Failed to save route', 'சேமிக்க முடியவில்லை')),
    });

    const del = useMutation({
        mutationFn: async (id: string) => (await api.delete(`/routes/${id}`)).data,
        onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-routes'] }),
        onError: (e: any) => Alert.alert(tr('Error', 'பிழை'), e?.response?.data?.error || tr('Failed to delete', 'நீக்க முடியவில்லை')),
    });

    const busOpts = useMemo(
        () => [{ label: tr('No bus', 'பேருந்து இல்லை'), value: '' }, ...(buses.data ?? []).map((b) => ({ label: b.bus_number, value: b.id }))],
        [buses.data, tr],
    );
    const typeOpts: { label: string; value: RouteType }[] = [
        { label: tr('Morning', 'காலை'), value: 'morning' },
        { label: tr('Evening', 'மாலை'), value: 'evening' },
        { label: tr('Both', 'இரண்டும்'), value: 'both' },
    ];

    const header = <Stack.Screen options={{ title: tr('Routes', 'வழித்தடங்கள்') }} />;

    if (routes.isLoading) {
        return <>{header}<Screen><Loader label={tr('Loading routes…', 'ஏற்றுகிறது…')} /></Screen></>;
    }

    const data = routes.data ?? [];

    return (
        <>
            {header}
            <Screen scroll refreshing={routes.isFetching} onRefresh={() => routes.refetch()}>
                <Button title={tr('Add Route', 'வழியைச் சேர்')} onPress={openCreate} icon={<Feather name="plus" size={18} color={t.color.brandText} />} />
                {data.length === 0 ? (
                    <EmptyState
                        title={tr('No routes yet', 'வழிகள் இல்லை')}
                        description={tr('Tap Add Route to create one.', 'சேர்க்க மேலே தட்டவும்.')}
                        icon={<Feather name="git-branch" size={40} color={t.color.textMuted} />}
                    />
                ) : (
                    data.map((r) => (
                        <ListRow
                            key={r.id}
                            leadingIcon="git-branch"
                            title={r.name}
                            subtitle={[
                                r.bus?.bus_number ? `${tr('Bus', 'பேருந்து')} ${r.bus.bus_number}` : tr('No bus', 'பேருந்து இல்லை'),
                                `${r.stops?.length ?? 0} ${tr('stops', 'நிறுத்தங்கள்')}`,
                            ].join(' · ')}
                            onPress={() => openEdit(r)}
                            right={
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
                                    <Badge label={String(r.route_type ?? 'morning')} tone="neutral" />
                                    <Pressable hitSlop={8} onPress={() => confirmDelete(tr('Delete this route?', 'இந்த வழியை நீக்கவா?'), () => del.mutate(r.id))}>
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
                title={editing ? tr('Edit Route', 'திருத்து') : tr('Add Route', 'வழியைச் சேர்')}
                onClose={() => setModal(false)}
                onSubmit={() => { if (form.name.trim()) save.mutate(); }}
                submitting={save.isPending}
                submitLabel={editing ? tr('Save', 'சேமி') : tr('Create', 'உருவாக்கு')}
            >
                <Field label={tr('Name', 'பெயர்')} value={form.name} onChangeText={(v) => set('name', v)} placeholder={tr('Route name', 'வழி பெயர்')} autoCapitalize="words" />
                <Select label={tr('Type', 'வகை')} value={form.route_type} options={typeOpts} onChange={(v) => set('route_type', v)} />
                <Select label={tr('Assigned Bus', 'பேருந்து')} value={form.bus_id} options={busOpts} onChange={(v) => set('bus_id', v)} />
                <Field label={tr('Start Point', 'தொடக்கம்')} value={form.start_point} onChangeText={(v) => set('start_point', v)} placeholder={tr('Optional', 'விருப்பம்')} autoCapitalize="words" />
                <Field label={tr('End Point', 'முடிவு')} value={form.end_point} onChangeText={(v) => set('end_point', v)} placeholder={tr('Optional', 'விருப்பம்')} autoCapitalize="words" />
            </FormModal>
        </>
    );
}
