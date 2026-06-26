import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useT } from '@/lib/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen, AppText, Card, Loader } from '@/components/ui';

// Read-only analytics. The backend report endpoints (/reports/*) stream Excel
// files, which can't render in-app, so the key metrics are derived from the
// same JSON GET endpoints the web dashboard uses.
interface Fee { total_amount?: number; due_amount?: number; due_date?: string }
interface RouteRow { id: string; bus_id?: string | null }

const inr = (n: number) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

function Metric({ icon, label, value, sub, color }: { icon: any; label: string; value: string; sub?: string; color?: string }) {
    const t = useTheme();
    return (
        <Card style={{ flex: 1, minWidth: '46%', gap: 6 }}>
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: (color || t.color.brand) + '22', alignItems: 'center', justifyContent: 'center' }}>
                <Feather name={icon} size={18} color={color || t.color.brand} />
            </View>
            <AppText size="xl" weight="800">{value}</AppText>
            <AppText size="sm" muted>{label}</AppText>
            {sub ? <AppText size="sm" muted>{sub}</AppText> : null}
        </Card>
    );
}

export default function ManageReportsScreen() {
    const tr = useT();
    const t = useTheme();

    const studentsQ = useQuery({ queryKey: ['rep-students'], queryFn: async () => (await api.get('/students')).data });
    const busesQ = useQuery({ queryKey: ['rep-buses'], queryFn: async () => (await api.get('/buses')).data });
    const driversQ = useQuery({ queryKey: ['rep-drivers'], queryFn: async () => (await api.get('/drivers')).data });
    const routesQ = useQuery({ queryKey: ['rep-routes'], queryFn: async () => (await api.get('/routes')).data as RouteRow[] });
    const feesQ = useQuery({ queryKey: ['rep-fees'], queryFn: async () => (await api.get('/finance/fees')).data as Fee[] });

    const loading = studentsQ.isLoading || busesQ.isLoading || driversQ.isLoading || routesQ.isLoading || feesQ.isLoading;
    const refreshing = studentsQ.isFetching || busesQ.isFetching || driversQ.isFetching || routesQ.isFetching || feesQ.isFetching;
    const refetchAll = () => {
        studentsQ.refetch(); busesQ.refetch(); driversQ.refetch(); routesQ.refetch(); feesQ.refetch();
    };

    const arr = (d: any): any[] => (Array.isArray(d) ? d : []);

    const m = useMemo(() => {
        const students = arr(studentsQ.data);
        const buses = arr(busesQ.data);
        const drivers = arr(driversQ.data);
        const routes = arr(routesQ.data) as RouteRow[];
        const fees = arr(feesQ.data) as Fee[];

        const totalBilled = fees.reduce((s, f) => s + (f.total_amount || 0), 0);
        const collected = fees.reduce((s, f) => s + Math.max(0, (f.total_amount || 0) - (f.due_amount || 0)), 0);
        const outstanding = fees.reduce((s, f) => s + (f.due_amount || 0), 0);
        const feeRate = totalBilled > 0 ? Math.round((collected / totalBilled) * 100) : 0;
        const now = new Date();
        const overdue = fees.filter((f) => (f.due_amount || 0) > 0 && f.due_date && new Date(f.due_date) < now).length;
        const routesWithBus = routes.filter((r) => r.bus_id).length;
        const routeCoverage = routes.length > 0 ? Math.round((routesWithBus / routes.length) * 100) : 0;
        const busUtil = buses.length > 0 ? Math.min(100, Math.round((drivers.length / buses.length) * 100)) : 0;

        return {
            students: students.length,
            buses: buses.length,
            drivers: drivers.length,
            routes: routes.length,
            collected,
            outstanding,
            feeRate,
            overdue,
            routeCoverage,
            busUtil,
        };
    }, [studentsQ.data, busesQ.data, driversQ.data, routesQ.data, feesQ.data]);

    if (loading) {
        return (
            <>
                <Stack.Screen options={{ title: tr('Reports', 'அறிக்கைகள்') }} />
                <Screen><Loader label={tr('Loading analytics…', 'ஏற்றுகிறது…')} /></Screen>
            </>
        );
    }

    return (
        <>
            <Stack.Screen options={{ title: tr('Reports', 'அறிக்கைகள்') }} />
            <Screen scroll refreshing={refreshing} onRefresh={refetchAll}>
                <AppText size="lg" weight="800">{tr('Fees', 'கட்டணம்')}</AppText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm }}>
                    <Metric icon="check-circle" color={t.color.success} label={tr('Fees Collected', 'வசூலிக்கப்பட்டது')} value={inr(m.collected)} />
                    <Metric icon="alert-circle" color={t.color.warning} label={tr('Outstanding', 'நிலுவை')} value={inr(m.outstanding)} />
                    <Metric icon="percent" label={tr('Collection Rate', 'வசூல் விகிதம்')} value={`${m.feeRate}%`} />
                    <Metric icon="clock" color={t.color.danger} label={tr('Overdue Fees', 'தாமதமான கட்டணங்கள்')} value={String(m.overdue)} />
                </View>

                <AppText size="lg" weight="800" style={{ marginTop: t.spacing.sm }}>{tr('Fleet & Roster', 'வாகனம் & பட்டியல்')}</AppText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm }}>
                    <Metric icon="user-check" label={tr('Students', 'மாணவர்கள்')} value={String(m.students)} />
                    <Metric icon="truck" label={tr('Buses', 'பேருந்துகள்')} value={String(m.buses)} />
                    <Metric icon="user" label={tr('Drivers', 'ஓட்டுநர்கள்')} value={String(m.drivers)} />
                    <Metric icon="git-branch" label={tr('Routes', 'வழித்தடங்கள்')} value={String(m.routes)} />
                    <Metric icon="map" label={tr('Route Coverage', 'வழி பாதுகாப்பு')} value={`${m.routeCoverage}%`} sub={tr('Routes with a bus', 'பேருந்து உள்ள வழிகள்')} />
                    <Metric icon="activity" label={tr('Bus Utilization', 'பேருந்து பயன்பாடு')} value={`${m.busUtil}%`} sub={tr('Drivers per bus', 'பேருந்துக்கு ஓட்டுநர்')} />
                </View>

                <AppText size="sm" muted style={{ marginTop: t.spacing.sm, textAlign: 'center' }}>
                    {tr('Detailed Excel reports (attendance, fees, KM) are available on the web portal.', 'விரிவான Excel அறிக்கைகள் வலை போர்டலில் கிடைக்கும்.')}
                </AppText>
            </Screen>
        </>
    );
}
