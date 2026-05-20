'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';

interface StopMarker {
    id: string;
    name: string;
    sequence: number;
    lat: number;
    lng: number;
}

interface Props {
    userPosition: [number, number];
    userHeading?: number | null;
    userAccuracy?: number | null;
    stops?: StopMarker[];
    nextStopIndex?: number;
}

let cssInjected = false;
function injectCSS() {
    if (cssInjected || typeof document === 'undefined') return;
    cssInjected = true;
    const style = document.createElement('style');
    style.textContent = `
        @keyframes gps-pulse {
            0% { transform: translate(-50%,-50%) scale(1); opacity: 0.7; }
            100% { transform: translate(-50%,-50%) scale(2.8); opacity: 0; }
        }
        @keyframes gps-ping {
            0% { transform: translate(-50%,-50%) scale(1); opacity: 0.5; }
            70% { transform: translate(-50%,-50%) scale(2.2); opacity: 0; }
            100% { transform: translate(-50%,-50%) scale(2.2); opacity: 0; }
        }
        .driver-map-zoom { position: absolute; right: 12px; bottom: 100px; z-index: 800; display: flex; flex-direction: column; gap: 4px; }
        .driver-map-zoom button {
            width: 36px; height: 36px; border-radius: 10px;
            background: white; border: 1px solid rgba(0,0,0,0.12);
            font-size: 18px; font-weight: 600; line-height: 1;
            box-shadow: 0 2px 6px rgba(0,0,0,0.15);
            cursor: pointer; display: flex; align-items: center; justify-content: center;
            color: #333; transition: background 0.15s;
        }
        .driver-map-zoom button:hover { background: #f5f5f5; }
        .leaflet-container { font-family: inherit; }
    `;
    document.head.appendChild(style);
}

export default function DriverMap({ userPosition, userHeading, userAccuracy, stops = [], nextStopIndex = 0 }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const userMarkerRef = useRef<any>(null);
    const accuracyCircleRef = useRef<any>(null);
    const routeLineRef = useRef<any>(null);
    const stopMarkersRef = useRef<any[]>([]);
    const userDraggedRef = useRef(false);
    const lastRouteKeyRef = useRef('');

    // Initialize map once
    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;
        injectCSS();

        import('leaflet').then(L => {
            const map = L.map(containerRef.current!, {
                center: userPosition,
                zoom: 16,
                zoomControl: false,
                attributionControl: false,
            });

            L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; OpenStreetMap &copy; CARTO',
                maxZoom: 20,
                subdomains: 'abcd',
            }).addTo(map);

            // Small attribution bottom-right
            L.control.attribution({ prefix: '&copy; OSM &copy; CARTO', position: 'bottomright' }).addTo(map);

            // Stop auto-follow if user drags
            map.on('dragstart', () => { userDraggedRef.current = true; });

            // Custom zoom buttons
            const zoomDiv = document.createElement('div');
            zoomDiv.className = 'driver-map-zoom';
            zoomDiv.innerHTML = `<button id="dm-zoom-in" title="Zoom in">+</button><button id="dm-zoom-out" title="Zoom out">−</button>`;
            containerRef.current!.appendChild(zoomDiv);
            zoomDiv.querySelector('#dm-zoom-in')!.addEventListener('click', () => { map.zoomIn(); userDraggedRef.current = true; });
            zoomDiv.querySelector('#dm-zoom-out')!.addEventListener('click', () => { map.zoomOut(); userDraggedRef.current = true; });

            mapRef.current = map;
            // Force Leaflet to recalculate container size after layout settles
            setTimeout(() => map.invalidateSize(), 100);
        });

        return () => {
            if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Update user position marker
    useEffect(() => {
        if (!mapRef.current) return;
        import('leaflet').then(L => {
            const map = mapRef.current;
            const [lat, lng] = userPosition;
            const heading = userHeading ?? 0;
            const hasHeading = userHeading != null;

            const dotHtml = `
                <div style="position:relative;width:60px;height:60px;">
                    ${hasHeading ? `
                    <div style="position:absolute;top:50%;left:50%;width:0;height:0;
                        border-left:9px solid transparent;border-right:9px solid transparent;
                        border-bottom:28px solid rgba(59,130,246,0.85);
                        transform:translate(-50%,-100%) rotate(${heading}deg);
                        transform-origin:bottom center;
                        margin-top:-20px;
                        filter:drop-shadow(0 0 4px rgba(59,130,246,0.5));"></div>
                    ` : ''}
                    <div style="position:absolute;top:50%;left:50%;width:50px;height:50px;border-radius:50%;
                        background:rgba(59,130,246,0.18);
                        animation:gps-pulse 2s ease-out infinite;"></div>
                    <div style="position:absolute;top:50%;left:50%;width:22px;height:22px;border-radius:50%;
                        background:#2563EB;border:3px solid white;
                        box-shadow:0 2px 10px rgba(37,99,235,0.55);
                        transform:translate(-50%,-50%);"></div>
                </div>`;

            const icon = L.divIcon({
                className: '',
                html: dotHtml,
                iconSize: [60, 60],
                iconAnchor: [30, 30],
            });

            if (userMarkerRef.current) {
                userMarkerRef.current.setLatLng([lat, lng]);
                userMarkerRef.current.setIcon(icon);
            } else {
                userMarkerRef.current = L.marker([lat, lng], { icon, zIndexOffset: 1000 }).addTo(map);
            }

            // Accuracy circle
            const acc = userAccuracy ?? 0;
            if (acc > 0) {
                if (accuracyCircleRef.current) {
                    accuracyCircleRef.current.setLatLng([lat, lng]).setRadius(acc);
                } else {
                    accuracyCircleRef.current = L.circle([lat, lng], {
                        radius: acc,
                        color: '#2563EB',
                        fillColor: '#2563EB',
                        fillOpacity: 0.06,
                        weight: 1.5,
                        opacity: 0.4,
                    }).addTo(map);
                }
            }

            // Auto-follow
            if (!userDraggedRef.current) {
                map.flyTo([lat, lng], Math.max(map.getZoom(), 16), { animate: true, duration: 0.8, easeLinearity: 0.5 });
            }
        });
    }, [userPosition, userHeading, userAccuracy]);

    // Update stop markers
    useEffect(() => {
        if (!mapRef.current || stops.length === 0) return;
        import('leaflet').then(L => {
            const map = mapRef.current;

            // Remove old stop markers
            stopMarkersRef.current.forEach(m => map.removeLayer(m));
            stopMarkersRef.current = [];

            stops.forEach((stop, idx) => {
                if (!stop.lat || !stop.lng) return;
                const isNext = idx === nextStopIndex;
                const isPast = idx < nextStopIndex;

                const bg = isNext ? '#F59E0B' : isPast ? '#94A3B8' : '#3B82F6';
                const border = isNext ? '#D97706' : isPast ? '#64748B' : '#1D4ED8';
                const textColor = 'white';
                const size = isNext ? 32 : 24;

                const icon = L.divIcon({
                    className: '',
                    html: `<div style="
                        background:${bg};border:2.5px solid ${border};border-radius:50%;
                        width:${size}px;height:${size}px;
                        display:flex;align-items:center;justify-content:center;
                        color:${textColor};font-size:${isNext ? 13 : 10}px;font-weight:700;
                        font-family:sans-serif;
                        box-shadow:0 2px 8px rgba(0,0,0,${isNext ? 0.35 : 0.2});
                        ${isNext ? 'animation:gps-ping 2s ease-out infinite;' : ''}
                    ">${stop.sequence + 1}</div>`,
                    iconSize: [size, size],
                    iconAnchor: [size / 2, size / 2],
                    popupAnchor: [0, -size / 2 - 4],
                });

                const marker = L.marker([stop.lat, stop.lng], { icon })
                    .addTo(map)
                    .bindPopup(`<b>${stop.name}</b>${isNext ? '<br><span style="color:#F59E0B">▶ Next stop</span>' : ''}`);

                stopMarkersRef.current.push(marker);
            });
        });
    }, [stops, nextStopIndex]);

    // Draw OSRM route from user position to next stop
    useEffect(() => {
        if (!mapRef.current) return;
        const nextStop = stops[nextStopIndex];
        if (!nextStop?.lat || !nextStop?.lng) {
            if (routeLineRef.current) { mapRef.current.removeLayer(routeLineRef.current); routeLineRef.current = null; }
            return;
        }

        const [uLat, uLng] = userPosition;
        const routeKey = `${uLat.toFixed(4)},${uLng.toFixed(4)}->${nextStop.lat.toFixed(4)},${nextStop.lng.toFixed(4)}`;
        if (lastRouteKeyRef.current === routeKey) return;
        lastRouteKeyRef.current = routeKey;

        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${uLng},${uLat};${nextStop.lng},${nextStop.lat}?geometries=geojson&overview=full`;

        import('leaflet').then(async L => {
            try {
                const res = await fetch(osrmUrl);
                if (!res.ok) throw new Error('OSRM error');
                const data = await res.json();
                const coords: [number, number][] = data.routes?.[0]?.geometry?.coordinates?.map(
                    ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
                ) ?? [];

                if (!mapRef.current || coords.length === 0) return;

                if (routeLineRef.current) mapRef.current.removeLayer(routeLineRef.current);

                routeLineRef.current = L.polyline(coords, {
                    color: '#2563EB',
                    weight: 5,
                    opacity: 0.85,
                    lineJoin: 'round',
                    lineCap: 'round',
                }).addTo(mapRef.current);
            } catch {
                // OSRM unavailable — draw straight line fallback
                if (!mapRef.current) return;
                if (routeLineRef.current) mapRef.current.removeLayer(routeLineRef.current);
                routeLineRef.current = L.polyline(
                    [[uLat, uLng], [nextStop.lat, nextStop.lng]],
                    { color: '#2563EB', weight: 4, opacity: 0.6, dashArray: '8 6' }
                ).addTo(mapRef.current);
            }
        });
    }, [userPosition, stops, nextStopIndex]);

    return <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />;
}
