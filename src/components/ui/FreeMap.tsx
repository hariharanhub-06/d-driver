'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useEffect, useState } from 'react';

interface MarkerData {
    position: [number, number];
    title: string;
    description?: string;
}

interface MapConfigProps {
    center: [number, number];
    zoom?: number;
    markers?: MarkerData[];
    followCenter?: boolean;
}

// Imperatively pans map when center prop changes (MapContainer center is immutable after mount)
function MapRecenter({ center, follow }: { center: [number, number]; follow: boolean }) {
    const map = useMap();
    useEffect(() => {
        if (follow) map.panTo(center, { animate: true, duration: 0.5 });
    }, [center, follow, map]);
    return null;
}

export default function FreeMap({ center, zoom = 14, markers = [], followCenter = false }: MapConfigProps) {
    const [ready, setReady] = useState(false);

    useEffect(() => {
        import('leaflet').then((L) => {
            // v4-compatible: set default icon on prototype
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete (L.Icon.Default.prototype as any)._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            });
            setReady(true);
        });
    }, []);

    if (!ready) {
        return (
            <div className="w-full h-full min-h-[400px] bg-slate-800 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <MapContainer
            center={center}
            zoom={zoom}
            scrollWheelZoom
            className="w-full h-full min-h-[400px] z-0"
            zoomControl={false}
        >
            <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />
            <MapRecenter center={center} follow={followCenter} />
            {markers.map((marker, index) => (
                <Marker key={index} position={marker.position}>
                    <Popup>
                        <div className="font-sans">
                            <h3 className="font-bold text-slate-800">{marker.title}</h3>
                            {marker.description && <p className="text-sm text-slate-600">{marker.description}</p>}
                        </div>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
}
