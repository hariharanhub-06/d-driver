import React, { useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import api from '@/lib/api';
import { useT } from '@/lib/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen, AppText, Card, Button, Loader, EmptyState } from '@/components/ui';
import { ListRow } from '@/components/form';

interface NearbyStop {
    id: string;
    name: string;
    latitude?: number;
    longitude?: number;
    distance?: number;
    route?: { name?: string; route_type?: string };
}

const formatDistance = (m?: number) => {
    if (m == null) return '';
    if (m < 1000) return `${Math.round(m)} m`;
    return `${(m / 1000).toFixed(1)} km`;
};

export default function NearbyStopsScreen() {
    const tr = useT();
    const t = useTheme();

    const [stops, setStops] = useState<NearbyStop[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [error, setError] = useState('');

    const findNearby = async () => {
        setLoading(true);
        setError('');
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setError(tr('Location permission denied. Please allow location access.', 'இருப்பிட அனுமதி மறுக்கப்பட்டது.'));
                return;
            }
            const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const { latitude, longitude } = pos.coords;
            const { data } = await api.get(`/stops/nearby?lat=${latitude}&lng=${longitude}&radius=2000`);
            setStops(Array.isArray(data) ? data : []);
            setSearched(true);
        } catch (e: any) {
            setError(e?.response?.data?.error || tr('Could not fetch nearby stops. Please try again.', 'அருகிலுள்ள நிறுத்தங்களை பெற முடியவில்லை.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Stack.Screen options={{ title: tr('Nearby Stops', 'அருகிலுள்ள நிறுத்தங்கள்') }} />
            <Screen scroll refreshing={false} onRefresh={searched ? findNearby : undefined}>
                <AppText muted size="sm">{tr('Find stops within 2 km of your location.', 'உங்கள் இருப்பிடத்திற்கு 2 கி.மீ.க்குள் நிறுத்தங்களைக் கண்டறியவும்.')}</AppText>

                <Button
                    title={loading ? tr('Locating…', 'கண்டறிகிறது…') : searched ? tr('Update Location', 'இருப்பிடத்தை புதுப்பி') : tr('Find My Location', 'என் இருப்பிடத்தை கண்டறி')}
                    onPress={findNearby}
                    loading={loading}
                    icon={<Feather name="navigation" size={16} color={t.color.brandText} />}
                />

                {error ? (
                    <Card style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                        <Feather name="alert-triangle" size={16} color={t.color.danger} style={{ marginTop: 2 }} />
                        <AppText size="sm" color={t.color.danger} style={{ flex: 1 }}>{error}</AppText>
                    </Card>
                ) : null}

                {loading ? (
                    <Loader />
                ) : searched && stops.length === 0 && !error ? (
                    <EmptyState
                        icon={<Feather name="map-pin" size={40} color={t.color.textMuted} />}
                        title={tr('No stops nearby', 'அருகில் நிறுத்தங்கள் இல்லை')}
                        description={tr('No stops within 2 km of your location.', 'உங்கள் இருப்பிடத்திற்கு 2 கி.மீ.க்குள் நிறுத்தங்கள் இல்லை.')}
                    />
                ) : (
                    stops.map((s, idx) => (
                        <ListRow
                            key={s.id}
                            leadingIcon="map-pin"
                            title={`${idx + 1}. ${s.name}`}
                            subtitle={[
                                s.route?.name,
                                formatDistance(s.distance) ? `${formatDistance(s.distance)} ${tr('away', 'தொலைவில்')}` : null,
                            ].filter(Boolean).join(' · ') || undefined}
                            right={
                                s.distance != null ? (
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <AppText size="sm" weight="700" color={t.color.brand}>{formatDistance(s.distance)}</AppText>
                                    </View>
                                ) : undefined
                            }
                        />
                    ))
                )}
            </Screen>
        </>
    );
}
