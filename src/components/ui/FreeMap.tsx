'use client';

import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useEffect, useRef, useState } from 'react';

interface MarkerData {
    position: [number, number];
    title: string;
    description?: string;
    isBus?: boolean;
    isUserLocation?: boolean;
    isStopPin?: boolean;
    isSelected?: boolean;
    stopNumber?: number;
    heading?: number;
    isMyStop?: boolean;
    isComplete?: boolean;
    id?: string;
}

interface MapConfigProps {
    center: [number, number];
    zoom?: number;
    markers?: MarkerData[];
    followCenter?: boolean;
    onStopClick?: (id: string, name: string) => void;
}

// Fires invalidateSize after mount so tiles fill the real container dimensions.
// Without this, Leaflet reads the container size before CSS settles and leaves grey tile gaps.
function MapReadyHandler() {
    const map = useMap();
    useEffect(() => {
        const t = setTimeout(() => map.invalidateSize(false), 150);
        return () => clearTimeout(t);
    }, [map]);
    return null;
}

function SmoothRecenter({ center, follow }: { center: [number, number]; follow: boolean }) {
    const map = useMap();
    const prevCenterRef = useRef<[number, number] | null>(null);

    useEffect(() => {
        if (!follow) return;
        const prev = prevCenterRef.current;
        const [lat, lng] = center;
        if (prev && Math.abs(prev[0] - lat) < 0.000001 && Math.abs(prev[1] - lng) < 0.000001) return;
        prevCenterRef.current = center;
        map.flyTo(center, Math.max(map.getZoom(), 15), { animate: true, duration: 0.9, easeLinearity: 0.4 });
    }, [center, follow, map]);

    return null;
}

let freeMapCssInjected = false;
function ensureCSS() {
    if (freeMapCssInjected || typeof document === 'undefined') return;
    freeMapCssInjected = true;
    const style = document.createElement('style');
    style.textContent = `
        @keyframes chalo-bus-pulse {
            0% { box-shadow: 0 0 0 0 rgba(253,216,53,0.6); }
            70% { box-shadow: 0 0 0 12px rgba(253,216,53,0); }
            100% { box-shadow: 0 0 0 0 rgba(253,216,53,0); }
        }
        @keyframes user-loc-ring {
            0% { transform: scale(0.6); opacity: 1; }
            100% { transform: scale(2.4); opacity: 0; }
        }
        .leaflet-container { font-family: inherit; }
    `;
    document.head.appendChild(style);
}

function UserLocationIcon(L: any) {
    ensureCSS();
    return L.divIcon({
        className: '',
        html: `<div style="position:relative;width:22px;height:22px;display:flex;align-items:center;justify-content:center;">
            <div style="position:absolute;inset:0;border-radius:50%;background:rgba(59,130,246,0.3);animation:user-loc-ring 1.8s ease-out infinite;"></div>
            <div style="position:relative;width:14px;height:14px;background:#3B82F6;border:2.5px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(59,130,246,0.55);"></div>
        </div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
        popupAnchor: [0, -13],
    });
}

function StopPinIcon(L: any, isSelected = false) {
    const color = isSelected ? '#F59E0B' : '#3B82F6';
    const border = isSelected ? '#D97706' : '#1D4ED8';
    const size = isSelected ? 18 : 14;
    return L.divIcon({
        className: '',
        html: `<div style="display:flex;flex-direction:column;align-items:center;">
            <div style="background:${color};border:2.5px solid ${border};border-radius:50%;
                width:${size}px;height:${size}px;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>
            <div style="width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;
                border-top:5px solid ${border};margin-top:-1px;"></div>
        </div>`,
        iconSize: [size, size + 6],
        iconAnchor: [size / 2, size + 6],
        popupAnchor: [0, -(size + 4)],
    });
}

function BusMarkerIcon(L: any, busNumber?: string, heading?: number) {
    ensureCSS();
    const h = heading ?? 0;
    return L.divIcon({
        className: '',
        html: `<div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 4px 10px rgba(0,0,0,0.45));">
          <div style="transform:rotate(${h}deg);transform-origin:center bottom;display:flex;flex-direction:column;align-items:center;">
            <svg width="52" height="28" viewBox="0 0 52 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="4" width="50" height="20" rx="4" fill="#FDD835" stroke="#1a1a1a" stroke-width="1.5"/>
              <rect x="1" y="4" width="50" height="5" rx="3" fill="#FFE57F"/>
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
          </div>
          ${busNumber ? `<div style="background:rgba(10,10,20,0.85);backdrop-filter:blur(4px);color:#FDD835;font-size:10px;font-weight:700;padding:2px 8px;border-radius:6px;margin-top:4px;white-space:nowrap;border:1px solid rgba(253,216,53,0.35)">${busNumber}</div>` : ''}
        </div>`,
        iconSize: [52, busNumber ? 78 : 60],
        iconAnchor: [26, busNumber ? 58 : 46],
        popupAnchor: [0, -60],
    });
}

function StopIcon(L: any, num: number, isMyStop = false, isComplete = false) {
    const bg  = isMyStop ? '#F59E0B' : isComplete ? '#10B981' : '#3B82F6';
    const bd  = isMyStop ? '#D97706' : isComplete ? '#059669' : '#1D4ED8';
    const S   = isMyStop ? 28 : 20;
    const fs  = isMyStop ? 11 : 9;
    const shadow = isMyStop
        ? '0 0 0 4px rgba(245,158,11,0.25),0 2px 8px rgba(0,0,0,0.35)'
        : isComplete
            ? '0 0 0 3px rgba(16,185,129,0.2),0 1px 5px rgba(0,0,0,0.25)'
            : '0 1px 5px rgba(0,0,0,0.35)';
    return L.divIcon({
        className: '',
        html: `<div style="display:flex;flex-direction:column;align-items:center;">
            <div style="background:${bg};border:2px solid ${bd};border-radius:50%;
                width:${S}px;height:${S}px;display:flex;align-items:center;justify-content:center;
                color:white;font-size:${fs}px;font-weight:800;font-family:sans-serif;
                box-shadow:${shadow};">
                ${num}
            </div>
            <div style="width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;
                border-top:5px solid ${bd};margin-top:-1px;"></div>
        </div>`,
        iconSize: [S, S + 6],
        iconAnchor: [S / 2, S + 6],
        popupAnchor: [0, -S - 4],
    });
}

export default function FreeMap({ center, zoom = 15, markers = [], followCenter = false, onStopClick }: MapConfigProps) {
    const [L, setL] = useState<any>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        ensureCSS();
        import('leaflet').then(leaflet => {
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

    if (!ready || !L) {
        return (
            <div className="w-full h-full min-h-[300px] bg-slate-100 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <MapContainer
            center={center}
            zoom={zoom}
            scrollWheelZoom
            className="w-full h-full z-0"
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
            attributionControl={false}
            minZoom={3}
        >
            <TileLayer
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                maxZoom={20}
                minZoom={3}
                subdomains="abcd"
                keepBuffer={4}
            />
            <MapReadyHandler />
            <SmoothRecenter center={center} follow={followCenter} />
            {markers.map((marker, idx) => {
                const icon = marker.isUserLocation
                    ? UserLocationIcon(L)
                    : marker.isBus
                        ? BusMarkerIcon(L, marker.title, marker.heading)
                        : marker.stopNumber !== undefined
                            ? StopIcon(L, marker.stopNumber, marker.isMyStop, marker.isComplete)
                            : marker.isStopPin
                                ? StopPinIcon(L, marker.isSelected)
                                : undefined;

                const isClickableStop = !marker.isBus && !marker.isUserLocation && marker.id && onStopClick;

                return (
                    <Marker
                        key={idx}
                        position={marker.position}
                        icon={icon}
                        eventHandlers={isClickableStop ? {
                            click: () => onStopClick!(marker.id!, marker.title),
                        } : undefined}
                    >
                        <Popup>
                            <div className="font-sans text-sm">
                                <p className="font-bold text-slate-800">{marker.title}</p>
                                {marker.description && <p className="text-slate-500 text-xs mt-0.5">{marker.description}</p>}
                                {isClickableStop && !marker.isMyStop && (
                                    <p className="text-blue-600 text-xs mt-1 font-medium">Tap to request stop change</p>
                                )}
                                {marker.isMyStop && (
                                    <p className="text-amber-600 text-xs mt-1 font-medium">Your current stop</p>
                                )}
                            </div>
                        </Popup>
                    </Marker>
                );
            })}
        </MapContainer>
    );
}
