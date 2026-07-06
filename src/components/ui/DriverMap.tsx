'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';

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
    const currentPosRef       = useRef(userPosition);
    // Accumulated (unwrapped) heading — avoids CSS transition going the long way round 0↔360
    const accHeadingRef       = useRef<number>(0);
    // Last heading actually applied to the map/arrow — gate re-rotation to cut jitter lag
    const lastAppliedHeadingRef = useRef<number | null>(null);

    const [mapReady, setMapReady] = useState(false);
    // The rotating layer must be a square as large as the viewport's diagonal so that NO
    // black corner is ever exposed at any rotation angle (142% only covers a square viewport).
    const rootRef = useRef<HTMLDivElement>(null);
    const [wrapStyle, setWrapStyle] = useState<React.CSSProperties>({ width: '142%', height: '142%', top: '-21%', left: '-21%' });

    useEffect(() => { currentPosRef.current = userPosition; });

    // Size the rotating layer to a diagonal-sized square, centered, and keep Leaflet in sync.
    useEffect(() => {
        const el = rootRef.current;
        if (!el) return;
        const compute = () => {
            const W = el.clientWidth, H = el.clientHeight;
            if (!W || !H) return;
            const side = Math.ceil(Math.sqrt(W * W + H * H)) + 4; // diagonal + small margin
            setWrapStyle({ width: side, height: side, left: Math.round((W - side) / 2), top: Math.round((H - side) / 2) });
            setTimeout(() => mapRef.current?.invalidateSize(), 60);
        };
        compute();
        const ro = new ResizeObserver(compute);
        ro.observe(el);
        return () => ro.disconnect();
    }, [mapReady]);

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
                maxZoom: 20, minZoom: 3, subdomains: 'abcd', keepBuffer: 8,
            }).addTo(map);

            map.on('dragstart', () => {
                userDraggedRef.current = true;
                if (recentreBtnRef.current) recentreBtnRef.current.style.color = '#94a3b8';
                // Snap the view north-up while the user pans manually. Panning a CSS-rotated map
                // inverts the drag direction (drag left → moves right); north-up keeps it intuitive.
                if (mapWrapRef.current) mapWrapRef.current.style.transform = '';
                lastAppliedHeadingRef.current = null;
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
            const rawHeading = userHeading != null ? accHeadingRef.current : 0;
            // Only re-apply rotation when the heading actually moved enough (≥3°). This stops
            // GPS heading noise from constantly re-rotating the heavy 142% map layer (the "lag").
            const headingMoved = lastAppliedHeadingRef.current == null
                || Math.abs(rawHeading - lastAppliedHeadingRef.current) >= 3;
            const heading = headingMoved ? rawHeading : lastAppliedHeadingRef.current!;
            if (headingMoved) lastAppliedHeadingRef.current = rawHeading;

            // Rotate the map wrapper so travel direction faces "up" — but ONLY while following
            // the driver. While the user is manually panning we keep it north-up (see dragstart).
            if (mapWrapRef.current && headingMoved && !userDraggedRef.current) {
                mapWrapRef.current.style.transform = userHeading != null
                    ? `rotate(${-heading}deg)`
                    : '';
            }
            // Arrow rotates with heading so it points in direction of travel on screen.
            // The map also rotates by -heading, so net visual = arrow always points "up" (forward).
            const arrowHtml = `
                <div style="transform:rotate(${heading}deg);display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 2px 8px rgba(0,0,0,0.55));">
                  <svg width="26" height="32" viewBox="0 0 44 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22 2 L42 48 L22 36 L2 48 Z" fill="white" opacity="0.92"/>
                    <path d="M22 5 L40 46 L22 34 L4 46 Z" fill="#1A1A2E"/>
                    <path d="M22 5 L4 46 L22 34 Z" fill="rgba(255,255,255,0.15)"/>
                    <line x1="22" y1="8" x2="22" y2="34" stroke="rgba(255,255,255,0.3)" stroke-width="1.5" stroke-linecap="round"/>
                  </svg>
                </div>`;

            if (userMarkerRef.current) {
                userMarkerRef.current.setLatLng([lat, lng]); // position updates every tick (smooth)
                if (headingMoved) {
                    userMarkerRef.current.setIcon(L.divIcon({ className: '', html: arrowHtml, iconSize: [26, 32], iconAnchor: [13, 16] }));
                }
            } else {
                const icon = L.divIcon({ className: '', html: arrowHtml, iconSize: [26, 32], iconAnchor: [13, 16] });
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

    // ── Route line: OSRM road-following with smooth GPS tracking ────────────────
    // Only re-fetches OSRM when the target stop changes (not on every GPS tick).
    // While OSRM loads: straight dashed line. After load: solid road line that
    // trims from the nearest waypoint as the driver moves (Google Maps style).
    const osrmAbortRef   = useRef<AbortController | null>(null);
    const osrmCoordsRef  = useRef<[number, number][] | null>(null);
    const lastStopIdRef  = useRef<string>('');
    const lastFetchPosRef = useRef<[number, number] | null>(null);

    useEffect(() => {
        if (!mapReady) return;
        const nextStop = stops[nextStopIndex];
        const stopId   = nextStop?.id ?? '';
        const [uLat, uLng] = userPosition;

        const haversineM = (aLat: number, aLng: number, bLat: number, bLng: number) => {
            const toRad = (d: number) => d * Math.PI / 180;
            const dlat = toRad(bLat - aLat), dlng = toRad(bLng - aLng);
            const aa = Math.sin(dlat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dlng / 2) ** 2;
            return 6371000 * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
        };

        import('leaflet').then(L => {
            const map = mapRef.current;
            if (!map) return;

            const stopChanged = lastStopIdRef.current !== stopId;
            // Re-attempt OSRM for the SAME stop if it never loaded and the driver has
            // moved ≥150 m since the last attempt (fixes morning trips that start far
            // from stop 1, where the first attempt was rejected and never retried).
            const movedSinceFetch = lastFetchPosRef.current
                ? haversineM(uLat, uLng, lastFetchPosRef.current[0], lastFetchPosRef.current[1])
                : Infinity;
            // Re-fetch when: the target stop changed; OSRM never loaded and we've moved 150 m;
            // or the route IS loaded but the driver jumped ≥500 m (e.g. a late precise GPS fix
            // arriving after a coarse one) — re-anchors the road line to the real position.
            const needFetch = stopChanged
                || (osrmCoordsRef.current === null && movedSinceFetch >= 150)
                || (osrmCoordsRef.current !== null && movedSinceFetch >= 500);

            if (stopChanged) {
                // ── Target stop changed (e.g. skip): start a fresh road-route fetch but
                // KEEP the current road line on screen until the new one is ready, so there's
                // no straight dashed-line flash on every stop change. ──
                lastStopIdRef.current = stopId;
                osrmCoordsRef.current = null;
                lastFetchPosRef.current = null;
                if (osrmAbortRef.current) { osrmAbortRef.current.abort(); osrmAbortRef.current = null; }
                if (!nextStop?.lat || !nextStop?.lng) {
                    // No next stop → clear the line.
                    if (routeLineRef.current) { map.removeLayer(routeLineRef.current); routeLineRef.current = null; }
                    return;
                }
            }

            if (needFetch && nextStop?.lat && nextStop?.lng) {
                const straightM = haversineM(uLat, uLng, nextStop.lat, nextStop.lng);
                lastFetchPosRef.current = [uLat, uLng];
                if (osrmAbortRef.current) { osrmAbortRef.current.abort(); }
                const ctrl = new AbortController();
                osrmAbortRef.current = ctrl;
                // Fetch the road geometry through our backend proxy (cached + retried,
                // server-side) instead of the flaky public OSRM server directly.
                api.get('/routing/path', {
                    params: { from: `${uLng},${uLat}`, to: `${nextStop.lng},${nextStop.lat}` },
                    signal: ctrl.signal,
                }).then(({ data }) => {
                    const coords: [number, number][] | null = data?.coordinates || null;
                    if (!coords || coords.length < 2 || !mapRef.current) return;
                    // Reject only absurd detours (and only when the straight leg is long
                    // enough for the ratio to be meaningful).
                    if (straightM > 300 && typeof data.distance === 'number' && data.distance > straightM * 8) return;
                    osrmCoordsRef.current = coords;
                    // Swap in the new solid road line — replacing the previous one only now
                    // that the new geometry is ready (no dashed intermediate, no flicker).
                    if (routeLineRef.current) mapRef.current.removeLayer(routeLineRef.current);
                    routeLineRef.current = L.polyline(coords, {
                        color: '#2563EB', weight: 5, opacity: 0.9, lineJoin: 'round' as const, lineCap: 'round' as const,
                    }).addTo(mapRef.current);
                }).catch(() => {});
                return;
            }

            if (osrmCoordsRef.current && routeLineRef.current) {
                // ── Same stop, OSRM loaded: trim line from nearest waypoint (smooth) ──
                const coords = osrmCoordsRef.current;
                let minD = Infinity, ci = 0;
                for (let i = 0; i < coords.length; i++) {
                    const d = Math.hypot(coords[i][0] - uLat, coords[i][1] - uLng);
                    if (d < minD) { minD = d; ci = i; }
                }
                const remaining: [number, number][] = [[uLat, uLng], ...coords.slice(ci + 1)];
                if (remaining.length >= 2) routeLineRef.current.setLatLngs(remaining);
            }
        });
    }, [userPosition, stops, nextStopIndex, mapReady]);

    const handleRecenter = () => {
        userDraggedRef.current = false;
        if (recentreBtnRef.current) recentreBtnRef.current.style.color = '#2563EB';
        const [lat, lng] = currentPosRef.current;
        if (mapRef.current) mapRef.current.flyTo([lat, lng], Math.max(mapRef.current.getZoom(), 16), { animate: true, duration: 0.6 });
        // Resume heading-up rotation right away (don't wait for the next heading change).
        lastAppliedHeadingRef.current = null;
        if (mapWrapRef.current && userHeading != null) {
            mapWrapRef.current.style.transform = `rotate(${-accHeadingRef.current}deg)`;
            lastAppliedHeadingRef.current = accHeadingRef.current;
        }
    };

    return (
        <div ref={rootRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>

            {/* ── Map wrapper (rotates with heading) ── */}
            {/* Sized to the viewport diagonal (square) so no black corner shows at any angle. */}
            <div
                ref={mapWrapRef}
                style={{
                    position: 'absolute',
                    ...wrapStyle,
                    transition: 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
                    willChange: 'transform',
                    background: '#e8e0d8',
                }}
            >
                <div ref={containerRef} style={{ position: 'absolute', inset: 0, background: '#e8e0d8' }} />
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
