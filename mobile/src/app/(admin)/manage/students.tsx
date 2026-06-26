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
interface Student {
    id: string;
    name: string;
    grade?: string | null;
    section?: string | null;
    gr_no?: string | null;
    parent_id?: string | null;
    route_id?: string | null;
    stop_id?: string | null;
    photo_url?: string | null;
    parent?: { id?: string; name?: string; email?: string; phone?: string } | null;
    route?: Ref | null;
    stop?: Ref | null;
}
interface ParentOpt { id: string; name: string }

interface FormState {
    name: string;
    grade: string;
    section: string;
    gr_no: string;
    parent_id: string;
    route_id: string;
    stop_id: string;
    photo_url: string;
}

const empty: FormState = { name: '', grade: '', section: '', gr_no: '', parent_id: '', route_id: '', stop_id: '', photo_url: '' };

export default function StudentsScreen() {
    const tr = useT();
    const t = useTheme();
    const qc = useQueryClient();

    const students = useQuery<Student[]>({
        queryKey: ['admin-students'],
        queryFn: async () => (await api.get('/students')).data,
    });
    const routes = useQuery<Ref[]>({
        queryKey: ['admin-routes'],
        queryFn: async () => (await api.get('/routes')).data,
    });
    const stops = useQuery<(Ref & { route_id?: string })[]>({
        queryKey: ['admin-stops'],
        queryFn: async () => (await api.get('/stops')).data,
    });
    const parents = useQuery<ParentOpt[]>({
        queryKey: ['admin-parents'],
        queryFn: async () => (await api.get('/parents')).data,
    });

    const [modal, setModal] = useState(false);
    const [editing, setEditing] = useState<Student | null>(null);
    const [form, setForm] = useState<FormState>(empty);

    const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

    const openCreate = () => { setEditing(null); setForm(empty); setModal(true); };
    const openEdit = (s: Student) => {
        setEditing(s);
        setForm({
            name: s.name ?? '',
            grade: s.grade ?? '',
            section: s.section ?? '',
            gr_no: s.gr_no ?? '',
            parent_id: s.parent_id ?? s.parent?.id ?? '',
            route_id: s.route_id ?? s.route?.id ?? '',
            stop_id: s.stop_id ?? s.stop?.id ?? '',
            photo_url: s.photo_url ?? '',
        });
        setModal(true);
    };

    const save = useMutation({
        mutationFn: async () => {
            const payload = {
                name: form.name.trim(),
                grade: form.grade.trim() || null,
                section: form.section.trim() || null,
                gr_no: form.gr_no.trim() || null,
                parent_id: form.parent_id || null,
                route_id: form.route_id || null,
                stop_id: form.stop_id || null,
                photo_url: form.photo_url.trim() || null,
            };
            if (editing) return (await api.put(`/students/${editing.id}`, payload)).data;
            return (await api.post('/students', payload)).data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['admin-students'] });
            setModal(false);
        },
        onError: (e: any) => Alert.alert(tr('Error', 'பிழை'), e?.response?.data?.error || tr('Failed to save student', 'சேமிக்க முடியவில்லை')),
    });

    const del = useMutation({
        mutationFn: async (id: string) => (await api.delete(`/students/${id}`)).data,
        onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-students'] }),
        onError: (e: any) => Alert.alert(tr('Error', 'பிழை'), e?.response?.data?.error || tr('Failed to delete', 'நீக்க முடியவில்லை')),
    });

    const routeOpts = useMemo(
        () => [{ label: tr('None', 'இல்லை'), value: '' }, ...(routes.data ?? []).map((r) => ({ label: r.name, value: r.id }))],
        [routes.data, tr],
    );
    const stopOpts = useMemo(() => {
        const list = (stops.data ?? []).filter((s) => !form.route_id || s.route_id === form.route_id);
        return [{ label: tr('None', 'இல்லை'), value: '' }, ...list.map((s) => ({ label: s.name, value: s.id }))];
    }, [stops.data, form.route_id, tr]);
    const parentOpts = useMemo(
        () => [{ label: tr('None', 'இல்லை'), value: '' }, ...(parents.data ?? []).map((p) => ({ label: p.name, value: p.id }))],
        [parents.data, tr],
    );

    const header = <Stack.Screen options={{ title: tr('Students', 'மாணவர்கள்') }} />;

    if (students.isLoading) {
        return <>{header}<Screen><Loader label={tr('Loading students…', 'ஏற்றுகிறது…')} /></Screen></>;
    }

    const data = students.data ?? [];

    return (
        <>
            {header}
            <Screen scroll refreshing={students.isFetching} onRefresh={() => students.refetch()}>
                <Button title={tr('Add Student', 'மாணவரைச் சேர்')} onPress={openCreate} icon={<Feather name="plus" size={18} color={t.color.brandText} />} />
                {data.length === 0 ? (
                    <EmptyState
                        title={tr('No students yet', 'மாணவர்கள் இல்லை')}
                        description={tr('Tap Add Student to create one.', 'சேர்க்க மேலே தட்டவும்.')}
                        icon={<Feather name="user-check" size={40} color={t.color.textMuted} />}
                    />
                ) : (
                    data.map((s) => (
                        <ListRow
                            key={s.id}
                            leadingIcon="user-check"
                            title={s.name}
                            subtitle={[s.grade && `${tr('Grade', 'வகுப்பு')} ${s.grade}`, s.section, s.route?.name, s.stop?.name]
                                .filter(Boolean)
                                .join(' · ') || tr('No route', 'வழி இல்லை')}
                            onPress={() => openEdit(s)}
                            right={
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
                                    {s.route ? <Badge label={s.route.name} tone="neutral" /> : <Badge label={tr('Unassigned', 'ஒதுக்கப்படவில்லை')} tone="warning" />}
                                    <Pressable hitSlop={8} onPress={() => confirmDelete(tr('Delete this student?', 'இந்த மாணவரை நீக்கவா?'), () => del.mutate(s.id))}>
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
                title={editing ? tr('Edit Student', 'திருத்து') : tr('Add Student', 'மாணவரைச் சேர்')}
                onClose={() => setModal(false)}
                onSubmit={() => { if (form.name.trim()) save.mutate(); }}
                submitting={save.isPending}
                submitLabel={editing ? tr('Save', 'சேமி') : tr('Create', 'உருவாக்கு')}
            >
                <Field label={tr('Name', 'பெயர்')} value={form.name} onChangeText={(v) => set('name', v)} placeholder={tr('Student name', 'மாணவர் பெயர்')} autoCapitalize="words" />
                <Field label={tr('Grade / Class', 'வகுப்பு')} value={form.grade} onChangeText={(v) => set('grade', v)} placeholder="e.g. 5" />
                <Field label={tr('Section', 'பிரிவு')} value={form.section} onChangeText={(v) => set('section', v)} placeholder="e.g. A" autoCapitalize="characters" />
                <Field label={tr('GR No.', 'பதிவு எண்')} value={form.gr_no} onChangeText={(v) => set('gr_no', v)} placeholder={tr('Admission number', 'சேர்க்கை எண்')} />
                <Select label={tr('Parent', 'பெற்றோர்')} value={form.parent_id} options={parentOpts} onChange={(v) => set('parent_id', v)} />
                <Select label={tr('Route', 'வழி')} value={form.route_id} options={routeOpts} onChange={(v) => { set('route_id', v); set('stop_id', ''); }} />
                <Select label={tr('Stop', 'நிறுத்தம்')} value={form.stop_id} options={stopOpts} onChange={(v) => set('stop_id', v)} />
                <Field label={tr('Photo URL (optional)', 'புகைப்பட URL')} value={form.photo_url} onChangeText={(v) => set('photo_url', v)} placeholder="https://…" />
            </FormModal>
        </>
    );
}
