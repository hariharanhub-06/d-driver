'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';

interface BusPosition {
    bus_id: string;
    bus_number: string;
    latitude: number;
    longitude: number;
    timestamp: string;
    heading?: number;
}

interface StopPin {
    id: string;
    name: string;
    lat: number;
    lng: number;
    sequence: number;
    student_count?: number;
}

interface Props {
    buses: BusPosition[];
    center?: [number, number];
    selectedBusId?: string | null;
    stops?: StopPin[];
    onStopClick?: (stopId: string, stopName: string) => void;
}

export default function MapComponent({ buses, center, selectedBusId, stops, onStopClick }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const markersRef = useRef<Record<string, any>>({});
    const stopMarkersRef = useRef<any[]>([]);
    const onStopClickRef = useRef(onStopClick);

    // Keep callback ref in sync without adding it to the effect dep array
    useEffect(() => {
        onStopClickRef.current = onStopClick;
    });

    useEffect(() => {
        if (!containerRef.current) return;

        import('leaflet').then(L => {
            delete (L.Icon.Default.prototype as any)._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            });

            const defaultCenter: [number, number] = center || [20.5937, 78.9629];

            if (!mapRef.current) {
                mapRef.current = L.map(containerRef.current!, {
                    center: defaultCenter,
                    zoom: center ? 13 : 5,
                    zoomControl: true,
                    attributionControl: false,
                });

                L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
                    maxZoom: 20,
                    subdomains: 'abcd',
                }).addTo(mapRef.current);

                L.control.attribution({ prefix: '&copy; OSM &copy; CARTO', position: 'bottomright' }).addTo(mapRef.current);
            }

            const map = mapRef.current;

            // Remove stale bus markers
            const existingIds = new Set(buses.map(b => b.bus_id));
            Object.keys(markersRef.current).forEach(id => {
                if (!existingIds.has(id)) {
                    map.removeLayer(markersRef.current[id]);
                    delete markersRef.current[id];
                }
            });

            // Add / update bus markers
            buses.forEach(bus => {
                const h = bus.heading ?? 0;
                const busIcon = L.divIcon({
                    className: '',
                    html: `<div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 3px 8px rgba(0,0,0,0.45))">
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
                      <div style="background:rgba(10,10,20,0.82);backdrop-filter:blur(4px);color:#FDD835;font-size:10px;font-weight:700;padding:2px 8px;border-radius:6px;margin-top:4px;white-space:nowrap;border:1px solid rgba(253,216,53,0.3)">${bus.bus_number}</div>
                    </div>`,
                    iconSize: [52, 78],
                    iconAnchor: [26, 60],
                });

                if (markersRef.current[bus.bus_id]) {
                    markersRef.current[bus.bus_id].setLatLng([bus.latitude, bus.longitude]);
                    markersRef.current[bus.bus_id].setIcon(busIcon);
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
                map.flyTo(marker.getLatLng(), 14, { animate: true, duration: 0.8 });
                marker.openTooltip();
            }

            // Clear old stop markers
            stopMarkersRef.current.forEach(m => map.removeLayer(m));
            stopMarkersRef.current = [];

            // Render stop pins
            if (stops && stops.length > 0) {
                stops.forEach((stop, idx) => {
                    const isLast = idx === stops.length - 1;
                    const bg = isLast ? '#059669' : '#7C3AED';
                    const countBadge = stop.student_count !== undefined
                        ? `<div style="position:absolute;top:-6px;right:-6px;min-width:16px;height:16px;background:#F59E0B;border:1.5px solid white;border-radius:8px;font-size:9px;font-weight:700;color:white;display:flex;align-items:center;justify-content:center;padding:0 3px;">${stop.student_count}</div>`
                        : '';
                    const stopIcon = L.divIcon({
                        className: '',
                        html: `<div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;">
                            <div style="position:relative;">
                                <div style="width:30px;height:30px;border-radius:50%;background:${bg};border:2.5px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:white;">
                                    ${stop.sequence}
                                </div>
                                ${countBadge}
                            </div>
                            <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid ${bg};margin-top:-1px;"></div>
                            <div style="background:rgba(10,10,20,0.82);backdrop-filter:blur(3px);color:white;font-size:9px;font-weight:600;padding:2px 7px;border-radius:4px;margin-top:2px;white-space:nowrap;max-width:110px;overflow:hidden;text-overflow:ellipsis;border:1px solid rgba(255,255,255,0.12);">${stop.name}</div>
                        </div>`,
                        iconSize: [30, 58],
                        iconAnchor: [15, 30],
                    });

                    const tooltip = stop.student_count !== undefined
                        ? `<b>${stop.name}</b><br/>${stop.student_count} student${stop.student_count !== 1 ? 's' : ''}`
                        : `<b>${stop.name}</b>`;

                    const marker = L.marker([stop.lat, stop.lng], { icon: stopIcon, zIndexOffset: -100 })
                        .addTo(map)
                        .bindTooltip(tooltip, { direction: 'top', sticky: false });

                    marker.on('click', () => onStopClickRef.current?.(stop.id, stop.name));
                    stopMarkersRef.current.push(marker);
                });
            }
        });
    }, [buses, center, selectedBusId, stops]);

    useEffect(() => {
        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    return <div ref={containerRef} className="w-full h-full" />;
}
