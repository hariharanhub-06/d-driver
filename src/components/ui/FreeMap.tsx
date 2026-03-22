'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';
import L from 'leaflet';

// Fix for default marker icons in React-Leaflet
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface MapConfigProps {
    center: [number, number];
    zoom?: number;
    markers?: {
        position: [number, number];
        title: string;
        description?: string;
    }[];
}

export default function FreeMap({ center, zoom = 14, markers = [] }: MapConfigProps) {
    useEffect(() => {
        // Quick fix to ensure map renders correctly in modal/hidden containers
        window.dispatchEvent(new Event('resize'));
    }, []);

    return (
        <MapContainer
            center={center}
            zoom={zoom}
            scrollWheelZoom={true}
            className="w-full h-full min-h-[400px] z-0"
            zoomControl={false}
        >
            {/* CartoDB Dark Matter Tile Layer (100% Free, No API Key, Uber-style Night Mode) */}
            <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />

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
