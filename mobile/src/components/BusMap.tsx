// Native map: OpenStreetMap raster tiles (no API key) + stop and bus markers.
import React, { useRef, useEffect } from 'react';
import { View, Text, Platform } from 'react-native';
import MapView, { Marker, UrlTile, PROVIDER_DEFAULT, Region } from 'react-native-maps';
import { useTheme } from '@/theme/ThemeProvider';

export interface BusMapProps {
    center: [number, number];
    busPosition?: [number, number] | null; // shown only when provided (trip live)
    busHeading?: number | null;
    stop?: { latitude: number; longitude: number; name?: string } | null;
    userLocation?: [number, number] | null;
}

export default function BusMap({ center, busPosition, stop, userLocation }: BusMapProps) {
    const t = useTheme();
    const mapRef = useRef<MapView>(null);

    const region: Region = {
        latitude: center[0],
        longitude: center[1],
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
    };

    // Recenter smoothly when the focus point moves.
    useEffect(() => {
        mapRef.current?.animateToRegion(
            { ...region, latitudeDelta: 0.02, longitudeDelta: 0.02 },
            600,
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [center[0], center[1]]);

    return (
        <View style={{ flex: 1 }}>
            <MapView
                ref={mapRef}
                style={{ flex: 1 }}
                provider={PROVIDER_DEFAULT}
                initialRegion={region}
                showsUserLocation={!!userLocation}
                showsMyLocationButton={false}
                toolbarEnabled={false}
                rotateEnabled={false}
                pitchEnabled={false}
            >
                {/* OSM raster tiles. */}
                <UrlTile
                    urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                    maximumZ={19}
                    flipY={false}
                    tileSize={256}
                />

                {stop ? (
                    <Marker
                        coordinate={{ latitude: stop.latitude, longitude: stop.longitude }}
                        title={stop.name || 'Your stop'}
                        anchor={{ x: 0.5, y: 1 }}
                    >
                        <Pin color={t.color.warning} label="STOP" />
                    </Marker>
                ) : null}

                {busPosition ? (
                    <Marker
                        coordinate={{ latitude: busPosition[0], longitude: busPosition[1] }}
                        title="Bus"
                        anchor={{ x: 0.5, y: 0.5 }}
                        flat
                    >
                        <Pin color={t.color.brand} label="BUS" round />
                    </Marker>
                ) : null}
            </MapView>

            {/* OSM attribution (tile usage policy). */}
            <View
                style={{
                    position: 'absolute',
                    bottom: 2,
                    right: 4,
                    backgroundColor: 'rgba(255,255,255,0.7)',
                    paddingHorizontal: 4,
                    borderRadius: 4,
                }}
                pointerEvents="none"
            >
                <Text style={{ fontSize: 9, color: '#333' }}>© OpenStreetMap</Text>
            </View>
        </View>
    );
}

function Pin({ color, label, round }: { color: string; label: string; round?: boolean }) {
    return (
        <View style={{ alignItems: 'center' }}>
            <View
                style={{
                    backgroundColor: color,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: round ? 999 : 8,
                    borderWidth: 2,
                    borderColor: '#fff',
                    shadowColor: '#000',
                    shadowOpacity: 0.3,
                    shadowRadius: 3,
                    shadowOffset: { width: 0, height: 1 },
                    elevation: 4,
                }}
            >
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>{label}</Text>
            </View>
            {!round && Platform.OS !== 'web' ? (
                <View
                    style={{
                        width: 0,
                        height: 0,
                        borderLeftWidth: 5,
                        borderRightWidth: 5,
                        borderTopWidth: 7,
                        borderLeftColor: 'transparent',
                        borderRightColor: 'transparent',
                        borderTopColor: color,
                        marginTop: -1,
                    }}
                />
            ) : null}
        </View>
    );
}
