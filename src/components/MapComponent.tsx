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
                    html: `<div style="
                        background:#2563eb;
                        color:white;
                        font-size:10px;
                        font-weight:bold;
                        padding:4px 6px;
                        border-radius:8px;
                        border:2px solid white;
                        box-shadow:0 2px 8px rgba(0,0,0,0.3);
                        white-space:nowrap;
                    ">${bus.bus_number}</div>`,
                    iconAnchor: [20, 14],
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
