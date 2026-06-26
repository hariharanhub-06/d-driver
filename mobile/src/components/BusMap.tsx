// Parent / admin bus map — OSM via WebView (no API key), stop + live-bus markers.
import React from 'react';
import OsmMap, { type OsmMarker } from './OsmMap';
import { useTheme } from '@/theme/ThemeProvider';

export interface BusMapProps {
    center: [number, number];
    busPosition?: [number, number] | null; // shown only when provided (trip live)
    busHeading?: number | null;
    stop?: { latitude: number; longitude: number; name?: string } | null;
    userLocation?: [number, number] | null;
}

export default function BusMap({ center, busPosition, busHeading, stop, userLocation }: BusMapProps) {
    const t = useTheme();
    const markers: OsmMarker[] = [];
    if (stop) markers.push({ lat: stop.latitude, lng: stop.longitude, label: 'STOP', color: t.color.warning });
    if (busPosition) {
        markers.push({ lat: busPosition[0], lng: busPosition[1], label: 'BUS', color: t.color.brand, round: true, rotation: busHeading ?? 0 });
    }
    if (userLocation) markers.push({ lat: userLocation[0], lng: userLocation[1], label: 'YOU', color: '#2563EB', round: true });

    return <OsmMap center={center} zoom={15} markers={markers} follow />;
}
