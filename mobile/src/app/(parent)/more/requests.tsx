import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { getMyChildren, type Child } from '@/lib/api';
import { useT } from '@/lib/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen, AppText, Card, Button, Loader, EmptyState, Badge } from '@/components/ui';
import { Field, Select, FormModal, ListRow } from '@/components/form';

interface AbsenceRow {
    id: string;
    date: string;
    reason?: string;
    status?: string;
    student?: { name?: string };
}
interface StopChangeRow {
    id: string;
    status: string;
    change_type?: string;
    created_at: string;
    reason?: string;
    student?: { name?: string };
    requestedStop?: { name?: string };
    currentStop?: { name?: string };
}

type ReqType = 'leave' | 'stop';

const todayStr = () => new Date().toLocaleDateString('en-CA');

const statusTone = (s?: string): 'success' | 'warning' | 'neutral' => {
    if (s === 'approved') return 'success';
    if (s === 'rejected') return 'warning';
    return 'neutral';
};

export default function ParentRequestsScreen() {
    const tr = useT();
    const t = useTheme();
    const qc = useQueryClient();

    const childrenQ = useQuery({ queryKey: ['children'], queryFn: getMyChildren });
    const children = Array.isArray(childrenQ.data) ? childrenQ.data : [];

    const absencesQ = useQuery({
        queryKey: ['parent-absences'],
        queryFn: async () => (await api.get('/absence/my')).data as AbsenceRow[],
    });
    const stopChangesQ = useQuery({
        queryKey: ['parent-stop-changes'],
        queryFn: async () => (await api.get('/stop-change/my')).data as StopChangeRow[],
    });

    const absences = Array.isArray(absencesQ.data) ? absencesQ.data : [];
    const stopChanges = Array.isArray(stopChangesQ.data) ? stopChangesQ.data : [];

    // ── Form state ──
    const [modalOpen, setModalOpen] = useState(false);
    const [type, setType] = useState<ReqType>('leave');
    const [studentId, setStudentId] = useState('');
    const [date, setDate] = useState(todayStr());
    const [reason, setReason] = useState('');
    const [changeType, setChangeType] = useState<'temporary' | 'permanent'>('temporary');
    const [newStopId, setNewStopId] = useState('');
    const [fromDate, setFromDate] = useState(todayStr());
    const [toDate, setToDate] = useState(todayStr());
    const [submitting, setSubmitting] = useState(false);

    const selectedChild: Child | undefined = children.find((c) => c.id === studentId);

    useEffect(() => {
        if (children.length > 0 && !studentId) setStudentId(children[0].id);
    }, [children, studentId]);

    const stopOptions = useMemo(() => {
        const routeStops = ((selectedChild?.route as { stops?: { id?: string; name?: string }[] } | undefined)?.stops) || [];
        return routeStops
            .filter((s): s is { id: string; name?: string } => !!s.id)
            .map((s) => ({ label: s.name || '—', value: s.id }));
    }, [selectedChild]);

    const childOptions = children.map((c) => ({ label: c.name, value: c.id }));

    const openModal = () => {
        setType('leave');
        setStudentId(children[0]?.id || '');
        setDate(todayStr());
        setFromDate(todayStr());
        setToDate(todayStr());
        setReason('');
        setChangeType('temporary');
        setNewStopId('');
        setModalOpen(true);
    };

    const submit = async () => {
        if (!studentId) return;
        setSubmitting(true);
        try {
            if (type === 'leave') {
                await api.post('/absence', { student_id: studentId, date, reason: reason.trim() || undefined });
                qc.invalidateQueries({ queryKey: ['parent-absences'] });
            } else {
                if (!newStopId) {
                    setSubmitting(false);
                    return;
                }
                await api.post('/stop-change', {
                    student_id: studentId,
                    current_stop_id: selectedChild?.stop?.id || undefined,
                    requested_stop_id: newStopId,
                    change_type: changeType,
                    effective_date: fromDate,
                    from_date: changeType === 'temporary' ? fromDate : undefined,
                    to_date: changeType === 'temporary' ? toDate : undefined,
                    reason: reason.trim() || undefined,
                });
                qc.invalidateQueries({ queryKey: ['parent-stop-changes'] });
            }
            setModalOpen(false);
        } catch (e: any) {
            // eslint-disable-next-line no-alert
            const { Alert } = require('react-native');
            Alert.alert(tr('Error', 'பிழை'), e?.response?.data?.error || tr('Could not submit request.', 'சமர்ப்பிக்க முடியவில்லை.'));
        } finally {
            setSubmitting(false);
        }
    };

    const cancelAbsence = (id: string) => {
        const { Alert } = require('react-native');
        Alert.alert(
            tr('Cancel report?', 'ரத்து செய்யவா?'),
            tr('Cancel this absence report?', 'இந்த வராமல் தெரிவிப்பை ரத்து செய்யவா?'),
            [
                { text: tr('No', 'இல்லை'), style: 'cancel' },
                {
                    text: tr('Yes', 'ஆம்'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.delete(`/absence/${id}`);
                            qc.invalidateQueries({ queryKey: ['parent-absences'] });
                        } catch (e: any) {
                            Alert.alert(tr('Error', 'பிழை'), tr('Could not cancel.', 'ரத்து செய்ய முடியவில்லை.'));
                        }
                    },
                },
            ],
        );
    };

    const loading = childrenQ.isLoading || absencesQ.isLoading || stopChangesQ.isLoading;
    const refreshing = absencesQ.isFetching || stopChangesQ.isFetching;
    const refetchAll = () => { absencesQ.refetch(); stopChangesQ.refetch(); };

    if (loading) {
        return (
            <>
                <Stack.Screen options={{ title: tr('Requests', 'கோரிக்கைகள்') }} />
                <Screen><Loader label={tr('Loading…', 'ஏற்றுகிறது…')} /></Screen>
            </>
        );
    }

    const empty = absences.length === 0 && stopChanges.length === 0;

    return (
        <>
            <Stack.Screen options={{ title: tr('Requests', 'கோரிக்கைகள்') }} />
            <Screen scroll refreshing={refreshing} onRefresh={refetchAll}>
                <Button
                    title={tr('New Request', 'புதிய கோரிக்கை')}
                    onPress={openModal}
                    disabled={children.length === 0}
                    icon={<Feather name="plus" size={16} color={t.color.brandText} />}
                />

                {empty ? (
                    <EmptyState
                        icon={<Feather name="send" size={40} color={t.color.textMuted} />}
                        title={tr('No requests yet', 'கோரிக்கைகள் இல்லை')}
                        description={tr('Submit a leave or stop change request.', 'விடுப்பு அல்லது நிறுத்தம் மாற்று கோரிக்கையை சமர்ப்பிக்கவும்.')}
                    />
                ) : null}

                {stopChanges.length > 0 ? (
                    <View style={{ gap: t.spacing.sm }}>
                        <AppText size="sm" weight="800" muted>{tr('Stop Change', 'நிறுத்தம் மாற்று')}</AppText>
                        {stopChanges.map((r) => (
                            <Card key={r.id}>
                                <ListRow
                                    leadingIcon="map-pin"
                                    title={`${r.student?.name || '—'} → ${r.requestedStop?.name || tr('New stop', 'புதிய நிறுத்தம்')}`}
                                    subtitle={`${r.change_type || ''} · ${new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`}
                                    right={<Badge label={r.status} tone={statusTone(r.status)} />}
                                />
                            </Card>
                        ))}
                    </View>
                ) : null}

                {absences.length > 0 ? (
                    <View style={{ gap: t.spacing.sm }}>
                        <AppText size="sm" weight="800" muted>{tr('Leave / Absence', 'விடுப்பு')}</AppText>
                        {absences.map((r) => (
                            <Card key={r.id}>
                                <ListRow
                                    leadingIcon="calendar"
                                    title={r.student?.name || '—'}
                                    subtitle={`${new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}${r.reason ? ` · ${r.reason}` : ''}`}
                                    right={
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <Badge label={r.status || 'reported'} tone={statusTone(r.status)} />
                                            {(!r.status || r.status === 'reported' || r.status === 'pending') ? (
                                                <Feather name="x" size={18} color={t.color.danger} onPress={() => cancelAbsence(r.id)} />
                                            ) : null}
                                        </View>
                                    }
                                />
                            </Card>
                        ))}
                    </View>
                ) : null}
            </Screen>

            <FormModal
                visible={modalOpen}
                title={tr('New Request', 'புதிய கோரிக்கை')}
                onClose={() => setModalOpen(false)}
                onSubmit={submit}
                submitting={submitting}
                submitLabel={tr('Submit', 'சமர்ப்பி')}
            >
                <Select<ReqType>
                    label={tr('Request Type', 'கோரிக்கை வகை')}
                    value={type}
                    options={[
                        { label: tr('Leave / Absence', 'விடுப்பு'), value: 'leave' },
                        { label: tr('Stop Change', 'நிறுத்தம் மாற்று'), value: 'stop' },
                    ]}
                    onChange={setType}
                />

                {childOptions.length > 1 ? (
                    <Select
                        label={tr('Child', 'குழந்தை')}
                        value={studentId}
                        options={childOptions}
                        onChange={setStudentId}
                    />
                ) : null}

                {type === 'leave' ? (
                    <Field
                        label={tr('Date (YYYY-MM-DD)', 'தேதி')}
                        value={date}
                        onChangeText={setDate}
                        placeholder={todayStr()}
                    />
                ) : (
                    <>
                        <Select<'temporary' | 'permanent'>
                            label={tr('Change Type', 'மாற்று வகை')}
                            value={changeType}
                            options={[
                                { label: tr('Temporary', 'தற்காலிகம்'), value: 'temporary' },
                                { label: tr('Permanent', 'நிரந்தரம்'), value: 'permanent' },
                            ]}
                            onChange={setChangeType}
                        />
                        <AppText size="sm" muted>
                            {tr('Current stop', 'தற்போதைய நிறுத்தம்')}: {selectedChild?.stop?.name || tr('Not assigned', 'ஒதுக்கப்படவில்லை')}
                        </AppText>
                        {stopOptions.length > 0 ? (
                            <Select
                                label={tr('New Stop', 'புதிய நிறுத்தம்')}
                                value={newStopId}
                                options={stopOptions}
                                onChange={setNewStopId}
                            />
                        ) : (
                            <AppText size="sm" muted>{tr('No alternative stops available on this route.', 'இந்த வழியில் வேறு நிறுத்தங்கள் இல்லை.')}</AppText>
                        )}
                        {changeType === 'temporary' ? (
                            <>
                                <Field label={tr('From (YYYY-MM-DD)', 'இலிருந்து')} value={fromDate} onChangeText={setFromDate} placeholder={todayStr()} />
                                <Field label={tr('To (YYYY-MM-DD)', 'வரை')} value={toDate} onChangeText={setToDate} placeholder={todayStr()} />
                            </>
                        ) : (
                            <Field label={tr('Effective Date (YYYY-MM-DD)', 'நடைமுறை தேதி')} value={fromDate} onChangeText={setFromDate} placeholder={todayStr()} />
                        )}
                    </>
                )}

                <Field
                    label={tr('Reason (optional)', 'காரணம் (விருப்பம்)')}
                    value={reason}
                    onChangeText={setReason}
                    placeholder={tr('e.g. Sick, family function…', 'எ.கா. உடல்நலம், குடும்ப நிகழ்வு…')}
                    multiline
                    autoCapitalize="sentences"
                />
                {type === 'stop' && !newStopId ? (
                    <AppText size="sm" muted>{tr('Select a new stop to submit.', 'சமர்ப்பிக்க புதிய நிறுத்தத்தை தேர்வு செய்யவும்.')}</AppText>
                ) : null}
            </FormModal>
        </>
    );
}
