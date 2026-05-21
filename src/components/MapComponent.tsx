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
    color?: string;
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
    const lastFlyBusIdRef = useRef<string | null>(null);
    const userInteractedRef = useRef(false);

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
                mapRef.current.on('dragstart zoomstart', () => { userInteractedRef.current = true; });

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
                // Use per-bus school color if provided, otherwise fall back to CSS variable / blue
                const c = bus.color || 'var(--brand,#3B82F6)';
                const busIcon = L.divIcon({
                    className: '',
                    html: `
                    <div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 3px 10px rgba(0,0,0,0.4))">
                      <div style="position:relative;background:${c};color:white;font-size:10px;font-weight:800;padding:3px 8px;border-radius:8px;white-space:nowrap;letter-spacing:0.3px;box-shadow:0 2px 6px rgba(0,0,0,0.2);margin-bottom:2px;">
                        ${bus.bus_number}
                        <div style="position:absolute;bottom:-5px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid ${c};"></div>
                      </div>
                      <div style="transform:rotate(${h}deg);transform-origin:center center;margin-top:4px;">
                        <svg width="44" height="24" viewBox="0 0 44 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect x="1" y="2" width="42" height="18" rx="4" fill="${c}" stroke="rgba(0,0,0,0.2)" stroke-width="1.2"/>
                          <rect x="1" y="2" width="42" height="5" rx="3" fill="rgba(255,255,255,0.25)"/>
                          <rect x="1" y="16" width="42" height="4" rx="2" fill="rgba(0,0,0,0.28)"/>
                          <rect x="4" y="7" width="7" height="6" rx="1.5" fill="rgba(255,255,255,0.88)"/>
                          <rect x="13" y="7" width="7" height="6" rx="1.5" fill="rgba(255,255,255,0.88)"/>
                          <rect x="22" y="7" width="7" height="6" rx="1.5" fill="rgba(255,255,255,0.88)"/>
                          <rect x="31" y="7" width="6" height="6" rx="1.5" fill="rgba(255,255,255,0.88)"/>
                          <rect x="1" y="9" width="2.5" height="4" rx="1" fill="#FF4444"/>
                          <rect x="40.5" y="9" width="2.5" height="4" rx="1" fill="#FFFDE7"/>
                          <circle cx="10" cy="22" r="2.5" fill="#111"/>
                          <circle cx="34" cy="22" r="2.5" fill="#111"/>
                        </svg>
                      </div>
                    </div>`,
                    iconSize: [60, 68],
                    iconAnchor: [30, 60],
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

            // Pan to selected bus only when selection changes (not on every location update)
            if (selectedBusId && markersRef.current[selectedBusId]) {
                if (lastFlyBusIdRef.current !== selectedBusId) {
                    lastFlyBusIdRef.current = selectedBusId;
                    userInteractedRef.current = false;
                    const marker = markersRef.current[selectedBusId];
                    map.flyTo(marker.getLatLng(), 14, { animate: true, duration: 0.8 });
                    marker.openTooltip();
                }
            } else if (!selectedBusId) {
                lastFlyBusIdRef.current = null;
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
