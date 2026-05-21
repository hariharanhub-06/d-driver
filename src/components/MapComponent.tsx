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
    color?: string;
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
                const c = bus.color || '#3B82F6';
                // Side-view 3D bus icon with school color
                const busIcon = L.divIcon({
                    className: '',
                    html: `
                    <div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 4px 10px rgba(0,0,0,0.45));">
                      <div style="transform:rotate(${h}deg);transform-origin:center bottom;display:flex;flex-direction:column;align-items:center;">
                        <svg width="52" height="28" viewBox="0 0 52 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect x="1" y="4" width="50" height="20" rx="4" fill="${c}" stroke="rgba(0,0,0,0.18)" stroke-width="1"/>
                          <rect x="1" y="4" width="50" height="5" rx="3" fill="rgba(255,255,255,0.3)"/>
                          <rect x="1" y="19" width="50" height="5" rx="2" fill="rgba(0,0,0,0.25)"/>
                          <rect x="5"  y="9" width="8" height="8" rx="1.5" fill="rgba(255,255,255,0.85)"/>
                          <rect x="15" y="9" width="8" height="8" rx="1.5" fill="rgba(255,255,255,0.85)"/>
                          <rect x="25" y="9" width="8" height="8" rx="1.5" fill="rgba(255,255,255,0.85)"/>
                          <rect x="35" y="9" width="7" height="8" rx="1.5" fill="rgba(255,255,255,0.85)"/>
                          <rect x="44" y="10" width="5" height="9" rx="2" fill="rgba(255,255,255,0.4)"/>
                          <rect x="48" y="13" width="3" height="5" rx="1" fill="rgba(255,255,255,0.9)"/>
                          <rect x="1"  y="13" width="3" height="5" rx="1" fill="rgba(255,0,0,0.7)"/>
                          <circle cx="11" cy="25" r="3.5" fill="#1e293b"/>
                          <circle cx="11" cy="25" r="1.8" fill="#475569"/>
                          <circle cx="41" cy="25" r="3.5" fill="#1e293b"/>
                          <circle cx="41" cy="25" r="1.8" fill="#475569"/>
                        </svg>
                        <div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:8px solid ${c};margin-top:-1px;"></div>
                      </div>
                      <div style="background:rgba(10,10,20,0.85);backdrop-filter:blur(4px);color:white;font-size:10px;font-weight:700;padding:2px 8px;border-radius:6px;margin-top:3px;white-space:nowrap;border:1px solid rgba(255,255,255,0.15);">
                        ${bus.bus_number}
                      </div>
                    </div>`,
                    iconSize: [52, 78],
                    iconAnchor: [26, 58],
                });

                if (markersRef.current[bus.bus_id]) {
                    markersRef.current[bus.bus_id].setLatLng([bus.latitude, bus.longitude]);
                    markersRef.current[bus.bus_id].setIcon(busIcon);
                } else {
                    const marker = L.marker([bus.latitude, bus.longitude], { icon: busIcon }).addTo(map);
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
                    const bg = stop.color || (isLast ? '#059669' : '#7C3AED');
                    const dark = bg + 'cc';
                    const countBadge = stop.student_count !== undefined
                        ? `<div style="position:absolute;top:-5px;right:-5px;min-width:14px;height:14px;background:#F59E0B;border:1.5px solid white;border-radius:7px;font-size:8px;font-weight:700;color:white;display:flex;align-items:center;justify-content:center;padding:0 2px;">${stop.student_count}</div>`
                        : '';
                    // Tiny front-view bus SVG — road-text size (~13px wide)
                    const stopIcon = L.divIcon({
                        className: '',
                        html: `<div style="position:relative;cursor:pointer;">
                            <svg width="13" height="15" viewBox="0 0 24 28" xmlns="http://www.w3.org/2000/svg"
                                 style="filter:drop-shadow(0 1px 3px rgba(0,0,0,0.5));">
                              <rect x="1" y="1" width="22" height="20" rx="4" fill="${bg}" stroke="rgba(0,0,0,0.25)" stroke-width="1.5"/>
                              <rect x="3" y="3" width="18" height="8" rx="2" fill="rgba(255,255,255,.92)"/>
                              <text x="12" y="7" text-anchor="middle" dominant-baseline="middle"
                                    fill="${bg}" font-size="7" font-weight="900" font-family="sans-serif">${stop.sequence}</text>
                              <rect x="3"  y="13" width="7" height="4" rx="1" fill="rgba(255,255,255,.55)"/>
                              <rect x="14" y="13" width="7" height="4" rx="1" fill="rgba(255,255,255,.55)"/>
                              <ellipse cx="6"  cy="25" rx="2.5" ry="2" fill="#1e293b"/>
                              <ellipse cx="18" cy="25" rx="2.5" ry="2" fill="#1e293b"/>
                            </svg>
                            ${countBadge}
                        </div>`,
                        iconSize: [13, 15],
                        iconAnchor: [6, 15],
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
