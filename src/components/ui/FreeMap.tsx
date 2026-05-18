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
        html: `<div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 3px 6px rgba(0,0,0,0.5))">
          <svg width="52" height="28" viewBox="0 0 52 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="1" y="4" width="50" height="20" rx="4" fill="#FDD835" stroke="#1a1a1a" stroke-width="1.5"/>
            <rect x="1" y="4" width="50" height="5" rx="3" fill="#FFE57F" stroke="none"/>
            <rect x="1" y="19" width="50" height="5" rx="2" fill="#1a1a1a"/>
            <rect x="5" y="9" width="8" height="8" rx="1.5" fill="#1e3d6b" opacity="0.9"/>
            <rect x="15" y="9" width="8" height="8" rx="1.5" fill="#1e3d6b" opacity="0.9"/>
            <rect x="25" y="9" width="8" height="8" rx="1.5" fill="#1e3d6b" opacity="0.9"/>
            <rect x="35" y="9" width="7" height="8" rx="1.5" fill="#1e3d6b" opacity="0.9"/>
            <rect x="44" y="10" width="5" height="9" rx="2" fill="#F9A825"/>
            <path d="M44 13 L48 11 L49 17 L44 17 Z" fill="#1e3d6b" opacity="0.85"/>
            <rect x="48" y="13" width="3" height="5" rx="1" fill="#FFF9C4"/>
            <rect x="1" y="13" width="3" height="5" rx="1" fill="#FF4444"/>
            <circle cx="11" cy="25" r="3.5" fill="#111" stroke="#555" stroke-width="0.5"/>
            <circle cx="11" cy="25" r="1.8" fill="#333"/>
            <circle cx="41" cy="25" r="3.5" fill="#111" stroke="#555" stroke-width="0.5"/>
            <circle cx="41" cy="25" r="1.8" fill="#333"/>
          </svg>
          <div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:8px solid #FDD835;margin-top:-1px;"></div>
        </div>`,
        iconSize: [52, 38],
        iconAnchor: [26, 38],
        popupAnchor: [0, -38],
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
