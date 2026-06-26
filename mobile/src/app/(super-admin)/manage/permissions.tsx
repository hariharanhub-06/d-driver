import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Alert, View } from 'react-native';
import { Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useT } from '@/lib/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen, AppText, Card, Button, Loader, EmptyState } from '@/components/ui';
import { Select } from '@/components/form';

// Feature flags mirror the web permissions page (src/app/super-admin/permissions/page.tsx).
// Each id is stored as a boolean on school.permissions; saved via PUT /schools/:id/permissions.
const FEATURE_GROUPS: { name: string; nameTa: string; icon: any; features: { id: string; name: string; nameTa: string }[] }[] = [
    {
        name: 'School Management', nameTa: 'பள்ளி மேலாண்மை', icon: 'globe',
        features: [
            { id: 'f1', name: 'Create Schools', nameTa: 'பள்ளிகளை உருவாக்கு' },
            { id: 'f2', name: 'Manage Subscriptions', nameTa: 'சந்தாக்களை நிர்வகி' },
            { id: 'f3', name: 'Global Reports', nameTa: 'உலகளாவிய அறிக்கைகள்' },
        ],
    },
    {
        name: 'Transport Operations', nameTa: 'போக்குவரத்து', icon: 'truck',
        features: [
            { id: 'f4', name: 'Route Planning', nameTa: 'வழி திட்டமிடல்' },
            { id: 'f5', name: 'Live Tracking', nameTa: 'நேரடி கண்காணிப்பு' },
            { id: 'f6', name: 'Stop Management', nameTa: 'நிறுத்தம் மேலாண்மை' },
        ],
    },
    {
        name: 'Student & Attendance', nameTa: 'மாணவர் & வருகை', icon: 'users',
        features: [
            { id: 'f7', name: 'Attendance Marking', nameTa: 'வருகை குறிப்பு' },
            { id: 'f8', name: 'Face Pop-ups', nameTa: 'முக பாப்-அப்கள்' },
            { id: 'f9', name: 'Parent Notifications', nameTa: 'பெற்றோர் அறிவிப்புகள்' },
        ],
    },
    {
        name: 'Finance & Payments', nameTa: 'நிதி & கட்டணம்', icon: 'credit-card',
        features: [
            { id: 'f10', name: 'Fee Collection', nameTa: 'கட்டண வசூல்' },
            { id: 'f11', name: 'Invoice Generation', nameTa: 'விலைப்பட்டியல்' },
        ],
    },
];

interface School { id: string; name: string; permissions?: Record<string, boolean> | null }

export default function SaPermissionsScreen() {
    const tr = useT();
    const t = useTheme();
    const qc = useQueryClient();

    const schools = useQuery<School[]>({
        queryKey: ['sa-permission-schools'],
        queryFn: async () => {
            const { data } = await api.get('/schools');
            return Array.isArray(data) ? data : [];
        },
    });

    const [selectedId, setSelectedId] = useState<string>('');
    const [perms, setPerms] = useState<Record<string, boolean>>({});

    // When schools load (or selection changes), seed the toggle state from that school.
    useEffect(() => {
        const list = schools.data ?? [];
        if (list.length === 0) return;
        const current = list.find((s) => s.id === selectedId) ?? list[0];
        if (!selectedId) setSelectedId(current.id);
        setPerms(current.permissions || {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [schools.data, selectedId]);

    const save = useMutation({
        mutationFn: async () => (await api.put(`/schools/${selectedId}/permissions`, { permissions: perms })).data,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['sa-permission-schools'] });
            Alert.alert(tr('Saved', 'சேமிக்கப்பட்டது'), tr('Permissions updated.', 'அனுமதிகள் புதுப்பிக்கப்பட்டன.'));
        },
        onError: (e: any) =>
            Alert.alert(tr('Error', 'பிழை'), e?.response?.data?.error || tr('Failed to save permissions', 'சேமிக்க முடியவில்லை')),
    });

    const options = useMemo(
        () => (schools.data ?? []).map((s) => ({ label: s.name, value: s.id })),
        [schools.data],
    );

    const header = <Stack.Screen options={{ title: tr('Permissions', 'அனுமதிகள்') }} />;

    if (schools.isLoading) {
        return <>{header}<Screen><Loader label={tr('Loading…', 'ஏற்றுகிறது…')} /></Screen></>;
    }

    if ((schools.data ?? []).length === 0) {
        return (
            <>
                {header}
                <Screen>
                    <EmptyState
                        title={tr('No schools', 'பள்ளிகள் இல்லை')}
                        description={tr('Register a school to manage its permissions.', 'அனுமதிகளை நிர்வகிக்க ஒரு பள்ளியைப் பதிவு செய்யவும்.')}
                        icon={<Feather name="lock" size={40} color={t.color.textMuted} />}
                    />
                </Screen>
            </>
        );
    }

    return (
        <>
            {header}
            <Screen scroll refreshing={schools.isFetching} onRefresh={() => schools.refetch()}>
                <AppText size="xl" weight="800">{tr('Permissions', 'அனுமதிகள்')}</AppText>
                <AppText muted size="sm">
                    {tr('Toggle features per school. Disabled features are hidden for all roles.', 'பள்ளிக்கு அம்சங்களை மாற்றவும். முடக்கப்பட்டவை அனைத்து பணிகளுக்கும் மறைக்கப்படும்.')}
                </AppText>

                <Select<string>
                    label={tr('School', 'பள்ளி')}
                    value={selectedId}
                    options={options}
                    onChange={(v) => setSelectedId(v)}
                />

                {FEATURE_GROUPS.map((group) => (
                    <Card key={group.name} style={{ gap: 4 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <Feather name={group.icon} size={16} color={t.color.brand} />
                            <AppText weight="700" size="sm">{tr(group.name, group.nameTa)}</AppText>
                        </View>
                        {group.features.map((f) => {
                            const on = !!perms[f.id];
                            return (
                                <Pressable
                                    key={f.id}
                                    onPress={() => setPerms((p) => ({ ...p, [f.id]: !p[f.id] }))}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        paddingVertical: 10,
                                    }}
                                >
                                    <AppText style={{ flex: 1 }} color={on ? t.color.text : t.color.textMuted}>
                                        {tr(f.name, f.nameTa)}
                                    </AppText>
                                    <View
                                        style={{
                                            width: 46,
                                            height: 28,
                                            borderRadius: 14,
                                            padding: 3,
                                            backgroundColor: on ? t.color.brand : t.color.border,
                                            alignItems: on ? 'flex-end' : 'flex-start',
                                        }}
                                    >
                                        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' }} />
                                    </View>
                                </Pressable>
                            );
                        })}
                    </Card>
                ))}

                <Button
                    title={tr('Save Changes', 'மாற்றங்களை சேமி')}
                    onPress={() => selectedId && save.mutate()}
                    loading={save.isPending}
                    icon={<Feather name="check" size={18} color={t.color.brandText} />}
                />
            </Screen>
        </>
    );
}
