'use client';

import { useEffect, useRef } from 'react';

interface BusPosition {
    bus_id: string;
    bus_number: string;
    latitude: number;
    longitude: number;
    timestamp: string;
}

interface Props {
    buses: BusPosition[];
    center?: [number, number];
    selectedBusId?: string | null;
}

export default function MapComponent({ buses, center, selectedBusId }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const markersRef = useRef<Record<string, any>>({});

    useEffect(() => {
        if (!containerRef.current) return;

        import('leaflet').then(L => {
            // Fix default marker icons (Leaflet + webpack issue)
            // @ts-ignore
            delete L.Icon.Default.prototype._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
                iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
            });

            const defaultCenter: [number, number] = center || [20.5937, 78.9629];

            if (!mapRef.current) {
                mapRef.current = L.map(containerRef.current!, {
                    center: defaultCenter,
                    zoom: center ? 13 : 5,
                    zoomControl: true,
                });

                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; OpenStreetMap contributors',
                    maxZoom: 19,
                }).addTo(mapRef.current);
            }

            const map = mapRef.current;

            // Remove stale markers
            const existingIds = new Set(buses.map(b => b.bus_id));
            Object.keys(markersRef.current).forEach(id => {
                if (!existingIds.has(id)) {
                    map.removeLayer(markersRef.current[id]);
                    delete markersRef.current[id];
                }
            });

            // Add / update markers
            buses.forEach(bus => {
                const busIcon = L.divIcon({
                    className: '',
                    html: `<div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 3px 8px rgba(0,0,0,0.55))">
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
                      <div style="background:rgba(10,10,20,0.82);backdrop-filter:blur(4px);color:#FDD835;font-size:10px;font-weight:700;padding:2px 8px;border-radius:6px;margin-top:4px;white-space:nowrap;border:1px solid rgba(253,216,53,0.3)">${bus.bus_number}</div>
                    </div>`,
                    iconSize: [52, 72],
                    iconAnchor: [26, 48],
                });

                if (markersRef.current[bus.bus_id]) {
                    markersRef.current[bus.bus_id].setLatLng([bus.latitude, bus.longitude]);
                } else {
                    const marker = L.marker([bus.latitude, bus.longitude], { icon: busIcon })
                        .addTo(map)
                        .bindTooltip(bus.bus_number, { permanent: false, direction: 'top' });
                    markersRef.current[bus.bus_id] = marker;
                }
            });

            // Pan to selected bus
            if (selectedBusId && markersRef.current[selectedBusId]) {
                const marker = markersRef.current[selectedBusId];
                map.setView(marker.getLatLng(), 14, { animate: true });
                marker.openTooltip();
            }
        });
    }, [buses, center, selectedBusId]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    return (
        <>
            <link
                rel="stylesheet"
                href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"
            />
            <div ref={containerRef} className="w-full h-full" />
        </>
    );
}
