// Driver ride map: OSM tiles, numbered route stops (current highlighted), the
// driver's live position (heading-rotated), and an OSRM road line to the current
// stop (falls back to a straight line). Mirrors the web DriverMap behaviour.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text } from 'react-native';
import MapView, { Marker, UrlTile, Polyline, PROVIDER_DEFAULT, Region } from 'react-native-maps';
import { useTheme } from '@/theme/ThemeProvider';
import { OSRM_BASE } from '@/lib/config';
import { haversineMeters } from '@/lib/tracking';
import type { TripStop } from '@/lib/api';

export interface DriverRideMapProps {
    driverPos: [number, number] | null;
    heading?: number | null;
    stops: TripStop[];
    currentStopIndex: number;
}

export default function DriverRideMap({ driverPos, heading, stops, currentStopIndex }: DriverRideMapProps) {
    const t = useTheme();
    const mapRef = useRef<MapView>(null);
    const [routeLine, setRouteLine] = useState<{ latitude: number; longitude: number }[]>([]);
    const lastFetch = useRef<{ stopId: string; pos: [number, number] | null }>({ stopId: '', pos: null });

    const target = stops[currentStopIndex];
    const center = driverPos || (target?.latitude != null ? [target.latitude, target.longitude!] as [number, number] : [20.5937, 78.9629]);

    const region: Region = { latitude: center[0], longitude: center[1], latitudeDelta: 0.02, longitudeDelta: 0.02 };

    useEffect(() => {
        if (driverPos) mapRef.current?.animateToRegion({ ...region, latitudeDelta: 0.02, longitudeDelta: 0.02 }, 600);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [driverPos?.[0], driverPos?.[1]]);

    // OSRM road line to the current stop (refetch on stop change or ≥150m movement).
    useEffect(() => {
        if (!driverPos || target?.latitude == null || target?.longitude == null) { setRouteLine([]); return; }
        const stopId = target.id;
        const moved = lastFetch.current.pos ? haversineMeters(
            { lat: driverPos[0], lng: driverPos[1] },
            { lat: lastFetch.current.pos[0], lng: lastFetch.current.pos[1] },
        ) : Infinity;
        if (stopId === lastFetch.current.stopId && moved < 150 && routeLine.length > 0) return;
        lastFetch.current = { stopId, pos: driverPos };
        const ctrl = new AbortController();
        const straight = [
            { latitude: driverPos[0], longitude: driverPos[1] },
            { latitude: target.latitude, longitude: target.longitude },
        ];
        fetch(`${OSRM_BASE}/route/v1/driving/${driverPos[1]},${driverPos[0]};${target.longitude},${target.latitude}?overview=full&geometries=geojson`, { signal: ctrl.signal })
            .then(r => r.json())
            .then(d => {
                const coords = d?.routes?.[0]?.geometry?.coordinates;
                if (Array.isArray(coords) && coords.length > 1) {
                    setRouteLine(coords.map(([lng, lat]: [number, number]) => ({ latitude: lat, longitude: lng })));
                } else {
                    setRouteLine(straight);
                }
            })
            .catch(() => setRouteLine(straight));
        return () => ctrl.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [target?.id, driverPos?.[0], driverPos?.[1]]);

    return (
        <View style={{ flex: 1 }}>
            <MapView
                ref={mapRef}
                style={{ flex: 1 }}
                provider={PROVIDER_DEFAULT}
                initialRegion={region}
                showsUserLocation={false}
                toolbarEnabled={false}
            >
                <UrlTile urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maximumZ={19} tileSize={256} />

                {routeLine.length > 1 && (
                    <Polyline coordinates={routeLine} strokeColor={t.color.brand} strokeWidth={5} />
                )}

                {stops.filter(s => s.latitude != null && s.longitude != null).map((s, idx) => {
                    const isCurrent = idx === currentStopIndex;
                    return (
                        <Marker
                            key={s.id}
                            coordinate={{ latitude: s.latitude!, longitude: s.longitude! }}
                            title={s.name}
                            anchor={{ x: 0.5, y: 1 }}
                        >
                            <StopPin n={s.sequence ?? idx + 1} current={isCurrent} color={isCurrent ? t.color.warning : t.color.brand} />
                        </Marker>
                    );
                })}

                {driverPos && (
                    <Marker
                        coordinate={{ latitude: driverPos[0], longitude: driverPos[1] }}
                        anchor={{ x: 0.5, y: 0.5 }}
                        flat
                        rotation={heading ?? 0}
                    >
                        <View style={{
                            width: 26, height: 26, borderRadius: 13, backgroundColor: '#2563EB',
                            borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '900' }}>▲</Text>
                        </View>
                    </Marker>
                )}
            </MapView>

            <View style={{ position: 'absolute', bottom: 2, right: 4, backgroundColor: 'rgba(255,255,255,0.7)', paddingHorizontal: 4, borderRadius: 4 }} pointerEvents="none">
                <Text style={{ fontSize: 9, color: '#333' }}>© OpenStreetMap</Text>
            </View>
        </View>
    );
}

function StopPin({ n, current, color }: { n: number; current: boolean; color: string }) {
    const size = current ? 30 : 22;
    return (
        <View style={{ alignItems: 'center' }}>
            <View style={{
                width: size, height: size, borderRadius: size / 2, backgroundColor: color,
                borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center',
                shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 4,
            }}>
                <Text style={{ color: '#fff', fontSize: current ? 12 : 10, fontWeight: '800' }}>{n}</Text>
            </View>
        </View>
    );
}
