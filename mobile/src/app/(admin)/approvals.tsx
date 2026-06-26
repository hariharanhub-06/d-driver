import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';

import {
    getStopChanges, approveStopChange, rejectStopChange,
    getFeeDelays, updateFeeDelay,
    getFuelRequests, updateFuelRequest,
} from '@/lib/api';
import { useTheme } from '@/theme/ThemeProvider';
import { useT } from '@/lib/i18n';
import { Screen, AppText, Card, Loader, EmptyState } from '@/components/ui';

export default function Approvals() {
    const t = useTheme();
    const tr = useT();
    const [busy, setBusy] = useState<string | null>(null);

    const stop = useQuery({ queryKey: ['stop-changes'], queryFn: getStopChanges });
    const delay = useQuery({ queryKey: ['fee-delays'], queryFn: getFeeDelays });
    const fuel = useQuery({ queryKey: ['fuel-reqs'], queryFn: getFuelRequests });

    const pendingStops = (stop.data || []).filter(r => r.status === 'pending');
    const pendingDelays = (delay.data || []).filter(r => r.status === 'pending');
    const pendingFuel = (fuel.data || []).filter(r => r.status === 'pending');

    const act = async (key: string, fn: () => Promise<any>, refetch: () => void) => {
        setBusy(key);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try { await fn(); refetch(); } catch { /* show nothing; item stays */ } finally { setBusy(null); }
    };

    if (stop.isLoading || delay.isLoading || fuel.isLoading) return <Loader />;

    const total = pendingStops.length + pendingDelays.length + pendingFuel.length;

    return (
        <Screen scroll refreshing={stop.isRefetching || delay.isRefetching || fuel.isRefetching} onRefresh={() => { stop.refetch(); delay.refetch(); fuel.refetch(); }}>
            <AppText size="xl" weight="800">{tr('Approvals', 'ஒப்புதல்கள்')}</AppText>
            <AppText muted size="sm">{total} {tr('pending', 'நிலுவையில்')}</AppText>

            {total === 0 && (
                <EmptyState icon={<Feather name="check-circle" size={40} color={t.color.textMuted} />} title={tr('All clear', 'அனைத்தும் முடிந்தது')} description={tr('No pending requests right now.', 'தற்போது நிலுவை கோரிக்கைகள் இல்லை.')} />
            )}

            {/* Stop change */}
            {pendingStops.length > 0 && <AppText weight="800" style={{ marginTop: 6 }}>{tr('Stop changes', 'நிறுத்த மாற்றங்கள்')}</AppText>}
            {pendingStops.map(r => (
                <Card key={r.id} style={{ gap: 10 }}>
                    <AppText weight="700">{r.student?.name || tr('Student', 'மாணவர்')}</AppText>
                    <AppText size="sm" muted>{r.currentStop?.name || '—'} → <AppText size="sm" weight="700" color={t.color.brand}>{r.requestedStop?.name || '—'}</AppText></AppText>
                    <ActionRow
                        busy={busy === `s-${r.id}`}
                        onApprove={() => act(`s-${r.id}`, () => approveStopChange(r.id), stop.refetch)}
                        onReject={() => act(`s-${r.id}`, () => rejectStopChange(r.id), stop.refetch)}
                    />
                </Card>
            ))}

            {/* Fee delay */}
            {pendingDelays.length > 0 && <AppText weight="800" style={{ marginTop: 6 }}>{tr('Fee delay requests', 'கட்டண தாமத கோரிக்கைகள்')}</AppText>}
            {pendingDelays.map(r => (
                <Card key={r.id} style={{ gap: 10 }}>
                    <AppText weight="700">{r.student_name || tr('Student', 'மாணவர்')}</AppText>
                    {r.reason ? <AppText size="sm" muted>{r.reason}</AppText> : null}
                    {r.requested_date ? <AppText size="sm" muted>{tr('Proposed', 'முன்மொழியப்பட்டது')}: {new Date(r.requested_date).toLocaleDateString('en-IN')}</AppText> : null}
                    <ActionRow
                        busy={busy === `d-${r.id}`}
                        onApprove={() => act(`d-${r.id}`, () => updateFeeDelay(r.id, { status: 'approved', approved_due_date: r.requested_date }), delay.refetch)}
                        onReject={() => act(`d-${r.id}`, () => updateFeeDelay(r.id, { status: 'rejected' }), delay.refetch)}
                    />
                </Card>
            ))}

            {/* Fuel */}
            {pendingFuel.length > 0 && <AppText weight="800" style={{ marginTop: 6 }}>{tr('Fuel requests', 'எரிபொருள் கோரிக்கைகள்')}</AppText>}
            {pendingFuel.map(r => (
                <Card key={r.id} style={{ gap: 10 }}>
                    <AppText weight="700">{r.bus?.bus_number || tr('Bus', 'பேருந்து')} · ₹{r.amount_requested ?? 0}</AppText>
                    <AppText size="sm" muted>{r.driver?.user?.name || ''}{r.reason ? ` · ${r.reason}` : ''}</AppText>
                    <ActionRow
                        busy={busy === `f-${r.id}`}
                        onApprove={() => act(`f-${r.id}`, () => updateFuelRequest(r.id, { status: 'approved', payment_method: 'cash' }), fuel.refetch)}
                        onReject={() => act(`f-${r.id}`, () => updateFuelRequest(r.id, { status: 'rejected' }), fuel.refetch)}
                    />
                </Card>
            ))}
        </Screen>
    );
}

function ActionRow({ busy, onApprove, onReject }: { busy: boolean; onApprove: () => void; onReject: () => void }) {
    const t = useTheme();
    const tr = useT();
    return (
        <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable disabled={busy} onPress={onReject} style={{ flex: 1, paddingVertical: 13, borderRadius: t.radius.md, alignItems: 'center', backgroundColor: t.color.danger + '18', opacity: busy ? 0.5 : 1 }}>
                <AppText weight="700" color={t.color.danger}>{tr('Reject', 'நிராகரி')}</AppText>
            </Pressable>
            <Pressable disabled={busy} onPress={onApprove} style={{ flex: 1, paddingVertical: 13, borderRadius: t.radius.md, alignItems: 'center', backgroundColor: t.color.brand, opacity: busy ? 0.5 : 1 }}>
                <AppText weight="700" color={t.color.brandText}>{tr('Approve', 'ஒப்புதல்')}</AppText>
            </Pressable>
        </View>
    );
}
