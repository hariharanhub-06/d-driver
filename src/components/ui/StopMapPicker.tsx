'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { useState } from 'react';

// Fix Leaflet's broken default icon when bundled with webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: '/leaflet/marker-icon-2x.png',
    iconUrl: '/leaflet/marker-icon.png',
    shadowUrl: '/leaflet/marker-shadow.png',
});

interface Props {
    initialLat?: number;
    initialLng?: number;
    onPick: (lat: number, lng: number) => void;
}

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
    useMapEvents({
        click(e) {
            onPick(parseFloat(e.latlng.lat.toFixed(6)), parseFloat(e.latlng.lng.toFixed(6)));
        },
    });
    return null;
}

const DEFAULT_CENTER: [number, number] = [11.1271, 78.6569];

export default function StopMapPicker({ initialLat, initialLng, onPick }: Props) {
    const [pin, setPin] = useState<[number, number] | null>(
        initialLat && initialLng ? [initialLat, initialLng] : null
    );

    const handlePick = (lat: number, lng: number) => {
        setPin([lat, lng]);
        onPick(lat, lng);
    };

    const center: [number, number] = pin || (initialLat && initialLng ? [initialLat, initialLng] : DEFAULT_CENTER);

    return (
        <div className="relative w-full h-full">
            <MapContainer center={center} zoom={pin ? 15 : 10} style={{ width: '100%', height: '100%' }} scrollWheelZoom>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
                <ClickHandler onPick={handlePick} />
                {pin && <Marker position={pin} />}
            </MapContainer>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-[400] bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow pointer-events-none">
                {pin ? `${pin[0]}, ${pin[1]}` : 'Click map to place pin'}
            </div>
        </div>
    );
}
