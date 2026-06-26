import React from 'react';
import { View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import api from '@/lib/api';
import { useTheme } from '@/theme/ThemeProvider';
import { useT } from '@/lib/i18n';
import { Screen, AppText, Card, Loader, Badge, InfoRow } from '@/components/ui';

interface SchoolDetail {
    id: string;
    name?: string;
    status?: string;
    city?: string;
    address?: string;
    phone?: string;
    email_contact?: string;
    subscription_plan?: string;
    slug?: string;
    created_at?: string;
    _count?: { students?: number; buses?: number; drivers?: number; users?: number; routes?: number };
}

async function getSchool(id: string): Promise<SchoolDetail | null> {
    try { const { data } = await api.get(`/schools/${id}`); return (data?.school || data) as SchoolDetail; } catch { return null; }
}
async function getSchoolAdmins(id: string): Promise<any[]> {
    try { const { data } = await api.get(`/schools/${id}/admins`); return Array.isArray(data) ? data : (data?.admins || []); } catch { return []; }
}

export default function SchoolDetailScreen() {
    const t = useTheme();
    const tr = useT();
    const { id } = useLocalSearchParams<{ id: string }>();
    const sid = String(id);
    const q = useQuery({ queryKey: ['sa-school', sid], queryFn: () => getSchool(sid), enabled: !!sid });
    const admins = useQuery({ queryKey: ['sa-school-admins', sid], queryFn: () => getSchoolAdmins(sid), enabled: !!sid });

    const s = q.data;
    const active = (s?.status || 'active') === 'active';
    const c = s?._count || {};

    const stats = [
        { icon: 'user-check', label: tr('Students', 'மாணவர்கள்'), value: c.students },
        { icon: 'truck', label: tr('Buses', 'பேருந்துகள்'), value: c.buses },
        { icon: 'user', label: tr('Drivers', 'ஓட்டுநர்கள்'), value: c.drivers },
        { icon: 'git-branch', label: tr('Routes', 'வழிகள்'), value: c.routes },
        { icon: 'users', label: tr('Users', 'பயனர்கள்'), value: c.users },
    ].filter((x) => x.value != null) as { icon: any; label: string; value: number }[];

    return (
        <>
            <Stack.Screen options={{ title: s?.name || tr('School', 'பள்ளி') }} />
            {q.isLoading ? (
                <Loader />
            ) : (
                <Screen scroll refreshing={q.isRefetching} onRefresh={() => { q.refetch(); admins.refetch(); }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: t.color.brand + '22', alignItems: 'center', justifyContent: 'center' }}>
                            <Feather name="home" size={22} color={t.color.brand} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <AppText size="lg" weight="800" numberOfLines={2}>{s?.name || tr('School', 'பள்ளி')}</AppText>
                            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                                <Badge tone={active ? 'success' : 'neutral'} label={active ? tr('Active', 'செயலில்') : (s?.status || tr('Inactive', 'செயலற்ற'))} />
                                {s?.subscription_plan ? <Badge tone="warning" label={s.subscription_plan} /> : null}
                            </View>
                        </View>
                    </View>

                    {stats.length > 0 && (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                            {stats.map((st, i) => (
                                <Card key={i} style={{ width: '47%', gap: 6 }}>
                                    <Feather name={st.icon} size={18} color={t.color.brand} />
                                    <AppText size="xxl" weight="800">{st.value}</AppText>
                                    <AppText size="sm" muted>{st.label}</AppText>
                                </Card>
                            ))}
                        </View>
                    )}

                    <Card>
                        <AppText weight="700" style={{ marginBottom: 4 }}>{tr('Details', 'விவரங்கள்')}</AppText>
                        {s?.city ? <InfoRow label={tr('City', 'நகரம்')} value={s.city} /> : null}
                        {s?.address ? <InfoRow label={tr('Address', 'முகவரி')} value={s.address} /> : null}
                        {s?.phone ? <InfoRow label={tr('Phone', 'தொலைபேசி')} value={s.phone} /> : null}
                        {s?.email_contact ? <InfoRow label={tr('Email', 'மின்னஞ்சல்')} value={s.email_contact} /> : null}
                        {s?.slug ? <InfoRow label={tr('Slug', 'அடையாளம்')} value={s.slug} /> : null}
                    </Card>

                    <Card>
                        <AppText weight="700" style={{ marginBottom: 4 }}>{tr('Admins', 'நிர்வாகிகள்')}</AppText>
                        {(admins.data || []).length === 0 ? (
                            <AppText size="sm" muted>{tr('No admins listed', 'நிர்வாகிகள் இல்லை')}</AppText>
                        ) : (
                            (admins.data || []).map((a: any) => (
                                <InfoRow key={a.id} icon={<Feather name="user" size={16} color={t.color.brand} />} label={a.email || a.phone || ''} value={a.name || tr('Admin', 'நிர்வாகி')} />
                            ))
                        )}
                    </Card>
                </Screen>
            )}
        </>
    );
}
