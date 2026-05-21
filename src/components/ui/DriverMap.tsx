'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState } from 'react';

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
        .dm-controls {
            position: absolute; right: 12px; bottom: 110px; z-index: 800;
            display: flex; flex-direction: column; gap: 6px;
        }
        .dm-controls button {
            width: 40px; height: 40px; border-radius: 12px;
            background: white; border: 1px solid rgba(0,0,0,0.12);
            font-size: 20px; font-weight: 600; line-height: 1;
            box-shadow: 0 2px 8px rgba(0,0,0,0.18);
            cursor: pointer; display: flex; align-items: center; justify-content: center;
            color: #333; transition: background 0.15s, color 0.15s;
            user-select: none; -webkit-user-select: none;
        }
        .dm-controls button:active { background: #e2e8f0; }
        .dm-recentre { font-size: 18px !important; }
        .dm-recentre-active { color: #2563EB !important; box-shadow: 0 2px 8px rgba(37,99,235,0.35) !important; }
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
    const currentPosRef = useRef(userPosition);
    const recentreBtnRef = useRef<HTMLButtonElement | null>(null);

    // mapReady gates the position/route/stop effects so they don't run before
    // the async Leaflet import finishes setting mapRef.current
    const [mapReady, setMapReady] = useState(false);

    // Keep currentPosRef in sync so the re-centre click handler gets latest position
    useEffect(() => { currentPosRef.current = userPosition; });

    // ── Initialize map once ──────────────────────────────────────────────────
    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;
        injectCSS();

        import('leaflet').then(L => {
            if (!containerRef.current) return;

            const map = L.map(containerRef.current, {
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

            L.control.attribution({ prefix: '&copy; OSM &copy; CARTO', position: 'bottomright' }).addTo(map);

            // Pause auto-follow when user manually pans
            map.on('dragstart', () => {
                userDraggedRef.current = true;
                if (recentreBtnRef.current) recentreBtnRef.current.classList.remove('dm-recentre-active');
            });

            // Controls: zoom in / zoom out / re-centre
            const controls = document.createElement('div');
            controls.className = 'dm-controls';
            controls.innerHTML = `
                <button id="dm-zoom-in" title="Zoom in">+</button>
                <button id="dm-zoom-out" title="Zoom out">−</button>
                <button id="dm-recentre" class="dm-recentre dm-recentre-active" title="Re-centre">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/>
                    <line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/>
                  </svg>
                </button>`;
            containerRef.current.appendChild(controls);

            const recentreBtn = controls.querySelector('#dm-recentre') as HTMLButtonElement;
            recentreBtnRef.current = recentreBtn;

            (controls.querySelector('#dm-zoom-in') as HTMLElement).addEventListener('click', () => {
                map.zoomIn();
                userDraggedRef.current = true;
                recentreBtn.classList.remove('dm-recentre-active');
            });
            (controls.querySelector('#dm-zoom-out') as HTMLElement).addEventListener('click', () => {
                map.zoomOut();
                userDraggedRef.current = true;
                recentreBtn.classList.remove('dm-recentre-active');
            });
            recentreBtn.addEventListener('click', () => {
                userDraggedRef.current = false;
                recentreBtn.classList.add('dm-recentre-active');
                const [lat, lng] = currentPosRef.current;
                map.flyTo([lat, lng], Math.max(map.getZoom(), 16), { animate: true, duration: 0.6 });
            });

            mapRef.current = map;
            // Signal other effects that the map is ready
            setMapReady(true);
            setTimeout(() => map.invalidateSize(), 150);
        });

        return () => {
            if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Update user position marker ──────────────────────────────────────────
    // mapReady is in the dep array so this re-fires once the map is ready
    useEffect(() => {
        if (!mapReady) return;
        import('leaflet').then(L => {
            const map = mapRef.current;
            if (!map) return;

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

            const icon = L.divIcon({ className: '', html: dotHtml, iconSize: [60, 60], iconAnchor: [30, 30] });

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
                        radius: acc, color: '#2563EB', fillColor: '#2563EB',
                        fillOpacity: 0.06, weight: 1.5, opacity: 0.4,
                    }).addTo(map);
                }
            }

            // Auto-follow: panTo avoids zoom changes (no shaking); duration < GPS interval
            if (!userDraggedRef.current) {
                map.panTo([lat, lng], { animate: true, duration: 0.4, easeLinearity: 0.5, noMoveStart: true });
            }
        });
    }, [userPosition, userHeading, userAccuracy, mapReady]);

    // ── Update stop markers ──────────────────────────────────────────────────
    useEffect(() => {
        if (!mapReady || stops.length === 0) return;
        import('leaflet').then(L => {
            const map = mapRef.current;
            if (!map) return;

            stopMarkersRef.current.forEach(m => map.removeLayer(m));
            stopMarkersRef.current = [];

            stops.forEach((stop, idx) => {
                if (!stop.lat || !stop.lng) return;
                const isNext = idx === nextStopIndex;
                const isPast = idx < nextStopIndex;

                const bg = isNext ? '#F59E0B' : isPast ? '#94A3B8' : '#3B82F6';
                const border = isNext ? '#D97706' : isPast ? '#64748B' : '#1D4ED8';
                const size = isNext ? 32 : 24;

                const icon = L.divIcon({
                    className: '',
                    html: `<div style="
                        background:${bg};border:2.5px solid ${border};border-radius:50%;
                        width:${size}px;height:${size}px;
                        display:flex;align-items:center;justify-content:center;
                        color:white;font-size:${isNext ? 13 : 10}px;font-weight:700;
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
                    .bindPopup(`<b>${stop.name}</b>${isNext ? '<br><span style="color:#F59E0B;font-size:11px">▶ Next stop</span>' : ''}`);

                stopMarkersRef.current.push(marker);
            });
        });
    }, [stops, nextStopIndex, mapReady]);

    // ── Draw OSRM route: driver → all remaining stops ────────────────────────
    useEffect(() => {
        if (!mapReady) return;

        const remainingStops = stops.slice(nextStopIndex).filter(s => s.lat && s.lng);

        import('leaflet').then(async L => {
            const map = mapRef.current;
            if (!map) return;

            if (remainingStops.length === 0) {
                if (routeLineRef.current) { map.removeLayer(routeLineRef.current); routeLineRef.current = null; }
                return;
            }

            const [uLat, uLng] = userPosition;
            const routeKey = `${uLat.toFixed(4)},${uLng.toFixed(4)}->${remainingStops.map(s => `${s.lat.toFixed(4)},${s.lng.toFixed(4)}`).join('|')}`;
            if (lastRouteKeyRef.current === routeKey) return;
            lastRouteKeyRef.current = routeKey;

            const waypoints = [
                `${uLng},${uLat}`,
                ...remainingStops.map(s => `${s.lng},${s.lat}`),
            ].join(';');

            const drawFallback = () => {
                if (!mapRef.current) return;
                if (routeLineRef.current) mapRef.current.removeLayer(routeLineRef.current);
                const fallback: [number, number][] = [
                    [uLat, uLng],
                    ...remainingStops.map(s => [s.lat, s.lng] as [number, number]),
                ];
                routeLineRef.current = L.polyline(fallback, {
                    color: '#2563EB', weight: 4, opacity: 0.55, dashArray: '10 6',
                }).addTo(mapRef.current);
            };

            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 8000);
                const res = await fetch(
                    `https://router.project-osrm.org/route/v1/driving/${waypoints}?geometries=geojson&overview=full`,
                    { signal: controller.signal }
                );
                clearTimeout(timeout);

                if (!res.ok) throw new Error('OSRM error');
                const data = await res.json();
                const coords: [number, number][] = (data.routes?.[0]?.geometry?.coordinates ?? []).map(
                    ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
                );

                if (!mapRef.current || coords.length === 0) { drawFallback(); return; }
                if (routeLineRef.current) mapRef.current.removeLayer(routeLineRef.current);
                routeLineRef.current = L.polyline(coords, {
                    color: '#2563EB', weight: 5, opacity: 0.85,
                    lineJoin: 'round', lineCap: 'round',
                }).addTo(mapRef.current);
            } catch {
                drawFallback();
            }
        });
    }, [userPosition, stops, nextStopIndex, mapReady]);

    return (
        <div style={{ position: 'absolute', inset: 0 }}>
            <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
            {!mapReady && (
                <div style={{
                    position: 'absolute', inset: 0, background: '#e2e8f0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
                }}>
                    <div style={{
                        width: 36, height: 36, border: '4px solid #3B82F6',
                        borderTopColor: 'transparent', borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                    }} />
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            )}
        </div>
    );
}
