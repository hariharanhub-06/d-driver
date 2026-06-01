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

const BTN: React.CSSProperties = {
    width: 44, height: 44, borderRadius: 12,
    background: 'white', border: 'none',
    boxShadow: '0 2px 10px rgba(0,0,0,0.18)',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#1e293b', fontSize: 22, fontWeight: 700, lineHeight: 1,
    WebkitTapHighlightColor: 'transparent',
    userSelect: 'none',
    flexShrink: 0,
};

export default function DriverMap({ userPosition, userHeading, userAccuracy, stops = [], nextStopIndex = 0 }: Props) {
    // The mapWrapRef div is 142% × 142% and receives CSS rotation — prevents black corners
    const mapWrapRef    = useRef<HTMLDivElement>(null);
    // Leaflet renders inside this div (100% of the 142% wrapper)
    const containerRef  = useRef<HTMLDivElement>(null);
    const recentreBtnRef  = useRef<HTMLButtonElement | null>(null);

    const mapRef              = useRef<any>(null);
    const userMarkerRef       = useRef<any>(null);
    const accuracyCircleRef   = useRef<any>(null);
    const routeLineRef        = useRef<any>(null);
    const stopMarkersRef      = useRef<any[]>([]);
    const userDraggedRef      = useRef(false);
    const lastRouteStopsKeyRef = useRef('');
    const lastRoutedPosRef    = useRef<[number, number] | null>(null);
    const currentPosRef       = useRef(userPosition);
    // Accumulated (unwrapped) heading — avoids CSS transition going the long way round 0↔360
    const accHeadingRef       = useRef<number>(0);

    const [mapReady, setMapReady] = useState(false);

    useEffect(() => { currentPosRef.current = userPosition; });

    // ── Init Leaflet (runs once) ─────────────────────────────────────────────
    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        import('leaflet').then(L => {
            if (!containerRef.current) return;

            const map = L.map(containerRef.current, {
                center: userPosition,
                zoom: 16,
                zoomControl: false,
                attributionControl: false,
            });

            L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                maxZoom: 20, minZoom: 3, subdomains: 'abcd', keepBuffer: 4,
            }).addTo(map);

            map.on('dragstart', () => {
                userDraggedRef.current = true;
                if (recentreBtnRef.current) recentreBtnRef.current.style.color = '#94a3b8';
            });

            mapRef.current = map;
            setMapReady(true);
            setTimeout(() => map.invalidateSize(), 150);
        });

        return () => {
            if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Update position + heading ────────────────────────────────────────────
    useEffect(() => {
        if (!mapReady) return;
        import('leaflet').then(L => {
            const map = mapRef.current;
            if (!map) return;

            const [lat, lng] = userPosition;

            // Smooth accumulated heading (no wrap-around flicker)
            if (userHeading != null) {
                let diff = userHeading - ((accHeadingRef.current % 360) + 360) % 360;
                if (diff > 180) diff -= 360;
                if (diff < -180) diff += 360;
                accHeadingRef.current += diff;
            }
            const heading = userHeading != null ? accHeadingRef.current : 0;

            // Rotate the map wrapper so travel direction faces "up"
            if (mapWrapRef.current) {
                mapWrapRef.current.style.transform = userHeading != null
                    ? `rotate(${-heading}deg)`
                    : '';
            }
            // Arrow rotates with heading so it points in direction of travel on screen.
            // The map also rotates by -heading, so net visual = arrow always points "up" (forward).
            // Embedding rotate(+heading) here makes the arrow and map animate as one coupled unit.
            const arrowHtml = `
                <div style="transform:rotate(${heading}deg);display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 2px 8px rgba(0,0,0,0.55));">
                  <svg width="26" height="32" viewBox="0 0 44 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22 2 L42 48 L22 36 L2 48 Z" fill="white" opacity="0.92"/>
                    <path d="M22 5 L40 46 L22 34 L4 46 Z" fill="#1A1A2E"/>
                    <path d="M22 5 L4 46 L22 34 Z" fill="rgba(255,255,255,0.15)"/>
                    <line x1="22" y1="8" x2="22" y2="34" stroke="rgba(255,255,255,0.3)" stroke-width="1.5" stroke-linecap="round"/>
                  </svg>
                </div>`;
            const icon = L.divIcon({ className: '', html: arrowHtml, iconSize: [26, 32], iconAnchor: [13, 16] });

            if (userMarkerRef.current) {
                userMarkerRef.current.setLatLng([lat, lng]);
                userMarkerRef.current.setIcon(icon);
            } else {
                userMarkerRef.current = L.marker([lat, lng], { icon, zIndexOffset: 1000 }).addTo(map);
            }

            // Accuracy ring
            const acc = userAccuracy ?? 0;
            if (acc > 0) {
                if (accuracyCircleRef.current) {
                    accuracyCircleRef.current.setLatLng([lat, lng]).setRadius(acc);
                } else {
                    accuracyCircleRef.current = L.circle([lat, lng], {
                        radius: acc, color: '#2563EB', fillColor: '#2563EB',
                        fillOpacity: 0.06, weight: 1.5, opacity: 0.35,
                    }).addTo(map);
                }
            }

            // Auto-follow driver
            if (!userDraggedRef.current) {
                map.panTo([lat, lng], { animate: true, duration: 0.4, easeLinearity: 0.5, noMoveStart: true });
            }
        });
    }, [userPosition, userHeading, userAccuracy, mapReady]);

    // ── Stop markers ─────────────────────────────────────────────────────────
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

                const bg  = isNext ? '#F59E0B' : isPast ? '#94A3B8' : '#3B82F6';
                const bd  = isNext ? '#D97706' : isPast ? '#64748B' : '#1D4ED8';
                const num = stop.sequence ?? (idx + 1);
                const S   = isNext ? 22 : 16;
                const fs  = isNext ? 9 : 7;

                const pinHtml = `
                <div style="display:flex;flex-direction:column;align-items:center;">
                  <div style="width:${S}px;height:${S}px;border-radius:50%;background:${bg};border:2px solid ${bd};
                       box-shadow:0 1px 4px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;
                       font-size:${fs}px;font-weight:800;color:white;font-family:sans-serif;
                       ${isNext ? 'box-shadow:0 0 0 3px rgba(245,158,11,0.35),0 1px 4px rgba(0,0,0,.4);' : ''}">
                    ${num}
                  </div>
                  <div style="width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;
                       border-top:5px solid ${bd};margin-top:-1px;"></div>
                </div>`;

                const icon = L.divIcon({
                    className: '', html: pinHtml,
                    iconSize: [S, S + 6], iconAnchor: [S / 2, S + 6],
                });

                const marker = L.marker([stop.lat, stop.lng], { icon })
                    .addTo(map)
                    .bindPopup(`<b>${stop.name}</b>${isNext ? '<br><span style="color:#F59E0B;font-size:11px">▶ Next stop</span>' : ''}`);

                stopMarkersRef.current.push(marker);
            });
        });
    }, [stops, nextStopIndex, mapReady]);

    // ── OSRM route line ──────────────────────────────────────────────────────
    useEffect(() => {
        if (!mapReady) return;

        const remainingStops = stops.slice(nextStopIndex).filter(s => s.lat && s.lng);
        const stopsKey = remainingStops.map(s => s.id).join(',');

        import('leaflet').then(async L => {
            const map = mapRef.current;
            if (!map) return;

            if (remainingStops.length === 0) {
                if (routeLineRef.current) { map.removeLayer(routeLineRef.current); routeLineRef.current = null; }
                lastRoutedPosRef.current = null;
                lastRouteStopsKeyRef.current = '';
                return;
            }

            const [uLat, uLng] = userPosition;
            const stopsChanged = stopsKey !== lastRouteStopsKeyRef.current;
            let positionMoved = !lastRoutedPosRef.current;
            if (!positionMoved && lastRoutedPosRef.current) {
                const [rLat, rLng] = lastRoutedPosRef.current;
                const dLat = (uLat - rLat) * Math.PI / 180;
                const dLng = (uLng - rLng) * Math.PI / 180;
                const a = Math.sin(dLat / 2) ** 2 +
                    Math.cos(rLat * Math.PI / 180) * Math.cos(uLat * Math.PI / 180) *
                    Math.sin(dLng / 2) ** 2;
                positionMoved = 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) > 80;
            }
            if (!stopsChanged && !positionMoved) return;

            lastRouteStopsKeyRef.current = stopsKey;
            lastRoutedPosRef.current = [uLat, uLng];

            const waypoints = [
                `${uLng},${uLat}`,
                ...remainingStops.map(s => `${s.lng},${s.lat}`),
            ].join(';');

            const drawFallback = () => {
                if (!mapRef.current) return;
                if (routeLineRef.current) mapRef.current.removeLayer(routeLineRef.current);
                const pts: [number, number][] = [[uLat, uLng], ...remainingStops.map(s => [s.lat, s.lng] as [number, number])];
                routeLineRef.current = L.polyline(pts, { color: '#2563EB', weight: 4, opacity: 0.55, dashArray: '10 6' }).addTo(mapRef.current);
            };

            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 8000);
                const res = await fetch(
                    `https://router.project-osrm.org/route/v1/driving/${waypoints}?geometries=geojson&overview=full`,
                    { signal: controller.signal },
                );
                clearTimeout(timeout);
                if (!res.ok) throw new Error('OSRM error');
                const data = await res.json();
                const coords: [number, number][] = (data.routes?.[0]?.geometry?.coordinates ?? []).map(
                    ([lng, lat]: [number, number]) => [lat, lng] as [number, number],
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

    const handleRecenter = () => {
        userDraggedRef.current = false;
        if (recentreBtnRef.current) recentreBtnRef.current.style.color = '#2563EB';
        const [lat, lng] = currentPosRef.current;
        if (mapRef.current) mapRef.current.flyTo([lat, lng], Math.max(mapRef.current.getZoom(), 16), { animate: true, duration: 0.6 });
    };

    return (
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>

            {/* ── Map wrapper (rotates with heading) ── */}
            {/* 142% × 142% ensures no black corners at any rotation angle */}
            <div
                ref={mapWrapRef}
                style={{
                    position: 'absolute',
                    width: '142%', height: '142%',
                    top: '-21%', left: '-21%',
                    transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                    willChange: 'transform',
                }}
            >
                <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
            </div>

            {/* ── UI overlay (never rotates) ── */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 900, pointerEvents: 'none' }}>

                {/* Map controls — right side, above bottom sheet: Zoom+, Zoom−, Recenter */}
                <div style={{
                    position: 'absolute', right: 16, bottom: 120,
                    display: 'flex', flexDirection: 'column', gap: 8,
                    pointerEvents: 'all',
                }}>
                    <button style={BTN} onClick={() => { mapRef.current?.zoomIn(); userDraggedRef.current = true; if (recentreBtnRef.current) recentreBtnRef.current.style.color = '#94a3b8'; }} title="Zoom in">+</button>
                    <button style={BTN} onClick={() => { mapRef.current?.zoomOut(); userDraggedRef.current = true; if (recentreBtnRef.current) recentreBtnRef.current.style.color = '#94a3b8'; }} title="Zoom out">−</button>

                    {/* Recenter — Google Maps location icon */}
                    <button
                        ref={recentreBtnRef}
                        onClick={handleRecenter}
                        title="Re-centre on my location"
                        style={{ ...BTN, color: '#2563EB' }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="3" fill="currentColor" />
                            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                            <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="1.8" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Loading spinner */}
            {!mapReady && (
                <div style={{
                    position: 'absolute', inset: 0, background: '#e2e8f0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
                }}>
                    <div style={{
                        width: 36, height: 36,
                        border: '4px solid #3B82F6', borderTopColor: 'transparent',
                        borderRadius: '50%', animation: 'dm-spin 0.8s linear infinite',
                    }} />
                    <style>{`@keyframes dm-spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            )}
        </div>
    );
}
