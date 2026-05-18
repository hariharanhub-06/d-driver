'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useEffect, useState } from 'react';

interface MarkerData {
    position: [number, number];
    title: string;
    description?: string;
    isBus?: boolean;
    stopNumber?: number;
}

interface MapConfigProps {
    center: [number, number];
    zoom?: number;
    markers?: MarkerData[];
    followCenter?: boolean;
}

function MapRecenter({ center, follow }: { center: [number, number]; follow: boolean }) {
    const map = useMap();
    useEffect(() => {
        if (follow) map.panTo(center, { animate: true, duration: 0.5 });
    }, [center, follow, map]);
    return null;
}

export default function FreeMap({ center, zoom = 14, markers = [], followCenter = false }: MapConfigProps) {
    const [ready, setReady] = useState(false);
    const [L, setL] = useState<any>(null);

    useEffect(() => {
        import('leaflet').then((leaflet) => {
            delete (leaflet.Icon.Default.prototype as any)._getIconUrl;
            leaflet.Icon.Default.mergeOptions({
                iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            });
            setL(leaflet);
            setReady(true);
        });
    }, []);

    const getBusIcon = () => L?.divIcon({
        className: '',
        html: `<div style="
            background:#FFD700;
            border:3px solid #1a1a1a;
            border-radius:8px;
            width:42px;height:26px;
            display:flex;align-items:center;justify-content:center;
            font-size:18px;
            box-shadow:0 2px 8px rgba(0,0,0,0.5);
            position:relative;
        ">🚌<div style="
            position:absolute;bottom:-8px;left:50%;transform:translateX(-50%);
            width:0;height:0;
            border-left:6px solid transparent;
            border-right:6px solid transparent;
            border-top:8px solid #1a1a1a;
        "></div></div>`,
        iconSize: [42, 34],
        iconAnchor: [21, 34],
        popupAnchor: [0, -34],
    });

    const getStopIcon = (num: number) => L?.divIcon({
        className: '',
        html: `<div style="
            background:#3B82F6;
            border:2px solid white;
            border-radius:50%;
            width:26px;height:26px;
            display:flex;align-items:center;justify-content:center;
            color:white;font-size:11px;font-weight:700;font-family:sans-serif;
            box-shadow:0 2px 6px rgba(0,0,0,0.4);
        ">${num}</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
        popupAnchor: [0, -14],
    });

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
            {markers.map((marker, index) => {
                const icon = marker.isBus
                    ? getBusIcon()
                    : marker.stopNumber !== undefined
                        ? getStopIcon(marker.stopNumber)
                        : undefined;
                return (
                    <Marker key={index} position={marker.position} icon={icon || undefined}>
                        <Popup>
                            <div className="font-sans">
                                <h3 className="font-bold text-slate-800">{marker.title}</h3>
                                {marker.description && <p className="text-sm text-slate-600">{marker.description}</p>}
                            </div>
                        </Popup>
                    </Marker>
                );
            })}
        </MapContainer>
    );
}
