// Driver ride map: OSM (WebView/Leaflet, no API key), numbered route stops
// (current highlighted), the driver's live position (heading-rotated), and an
// OSRM road line to the current stop (falls back to a straight line).
import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '@/theme/ThemeProvider';
import { OSRM_BASE } from '@/lib/config';
import { haversineMeters } from '@/lib/tracking';
import type { TripStop } from '@/lib/api';
import OsmMap, { type OsmMarker } from './OsmMap';

export interface DriverRideMapProps {
    driverPos: [number, number] | null;
    heading?: number | null;
    stops: TripStop[];
    currentStopIndex: number;
}

export default function DriverRideMap({ driverPos, heading, stops, currentStopIndex }: DriverRideMapProps) {
    const t = useTheme();
    const [routeLine, setRouteLine] = useState<[number, number][]>([]);
    const lastFetch = useRef<{ stopId: string; pos: [number, number] | null }>({ stopId: '', pos: null });

    const target = stops[currentStopIndex];
    const center: [number, number] =
        driverPos || (target?.latitude != null ? [target.latitude, target.longitude!] : [20.5937, 78.9629]);

    // OSRM road line to the current stop (refetch on stop change or ≥150m movement).
    useEffect(() => {
        if (!driverPos || target?.latitude == null || target?.longitude == null) {
            setRouteLine([]);
            return;
        }
        const stopId = target.id;
        const moved = lastFetch.current.pos
            ? haversineMeters(
                  { lat: driverPos[0], lng: driverPos[1] },
                  { lat: lastFetch.current.pos[0], lng: lastFetch.current.pos[1] },
              )
            : Infinity;
        if (stopId === lastFetch.current.stopId && moved < 150 && routeLine.length > 0) return;
        lastFetch.current = { stopId, pos: driverPos };
        const ctrl = new AbortController();
        const straight: [number, number][] = [
            [driverPos[0], driverPos[1]],
            [target.latitude, target.longitude],
        ];
        fetch(
            `${OSRM_BASE}/route/v1/driving/${driverPos[1]},${driverPos[0]};${target.longitude},${target.latitude}?overview=full&geometries=geojson`,
            { signal: ctrl.signal },
        )
            .then((r) => r.json())
            .then((d) => {
                const coords = d?.routes?.[0]?.geometry?.coordinates;
                if (Array.isArray(coords) && coords.length > 1) {
                    setRouteLine(coords.map(([lng, lat]: [number, number]) => [lat, lng]));
                } else {
                    setRouteLine(straight);
                }
            })
            .catch(() => setRouteLine(straight));
        return () => ctrl.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [target?.id, driverPos?.[0], driverPos?.[1]]);

    const markers: OsmMarker[] = [];
    stops.forEach((s, idx) => {
        if (s.latitude == null || s.longitude == null) return;
        const isCurrent = idx === currentStopIndex;
        markers.push({
            lat: s.latitude,
            lng: s.longitude,
            label: String(s.sequence ?? idx + 1),
            color: isCurrent ? t.color.warning : t.color.brand,
            round: true,
        });
    });
    if (driverPos) {
        markers.push({ lat: driverPos[0], lng: driverPos[1], label: '▲', color: '#2563EB', round: true, rotation: heading ?? 0 });
    }

    return <OsmMap center={center} zoom={15} markers={markers} polyline={routeLine} lineColor={t.color.brand} follow />;
}
