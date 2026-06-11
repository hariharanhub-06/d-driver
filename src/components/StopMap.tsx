'use client';

import 'leaflet/dist/leaflet.css';

import { useEffect, useRef, useState } from 'react';
import { MapPin, Plus, X } from 'lucide-react';
import { useT } from '@/lib/i18n';

export interface StopPoint {
    id: string;
    name: string;
    sequence?: number;
    pickup_time?: string;
    latitude: number;
    longitude: number;
}

interface Props {
    stops: StopPoint[];
    saving: boolean;
    onAddStop: (data: { name: string; lat: number; lng: number; sequence: number; pickup_time: string }) => Promise<void>;
    onDeleteStop: (stopId: string) => void;
}

interface Draft {
    lat: number;
    lng: number;
    // pixel position inside the map container
    x: number;
    y: number;
}

const inputCls = 'w-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors';

export default function StopMap({ stops, saving, onAddStop, onDeleteStop }: Props) {
    const t = useT();
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const LRef = useRef<any>(null);
    const markersRef = useRef<any[]>([]);
    const polylineRef = useRef<any>(null);
    const draftMarkerRef = useRef<any>(null);

    const tRef = useRef(t);
    useEffect(() => { tRef.current = t; }, [t]);

    const [ready, setReady] = useState(false);
    const [draft, setDraft] = useState<Draft | null>(null);
    const [draftName, setDraftName] = useState('');
    const [draftSeq, setDraftSeq] = useState('');
    const [draftTime, setDraftTime] = useState('');
    const [draftError, setDraftError] = useState('');

    // ── Init map once ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;
        let cancelled = false;

        (async () => {
            const L = (await import('leaflet')).default;
            if (cancelled || !containerRef.current) return;

            delete (L.Icon.Default.prototype as any)._getIconUrl;

            const map = L.map(containerRef.current, {
                center: [20.5937, 78.9629],
                zoom: 5,
                zoomControl: true,
            });

            // CARTO Voyager — fast CDN, no rate limits, crisp at all zoom levels
            L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
                subdomains: 'abcd',
                maxZoom: 20,
            }).addTo(map);

            map.on('click', (e: any) => {
                const cp = e.containerPoint; // pixel coords inside map container
                setDraft({ lat: e.latlng.lat, lng: e.latlng.lng, x: cp.x, y: cp.y });
            });

            LRef.current = L;
            mapRef.current = map;
            setReady(true);
            setTimeout(() => map.invalidateSize(), 50);
        })();

        return () => {
            cancelled = true;
            if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
        };
    }, []);

    // ── OSRM road route helper ─────────────────────────────────────────────────
    const fetchRoadRoute = async (pts: StopPoint[]): Promise<[number, number][] | null> => {
        const valid = pts.filter(s => s.latitude !== 0 || s.longitude !== 0);
        if (valid.length < 2) return null;
        const coordStr = valid.map(s => `${s.longitude},${s.latitude}`).join(';');
        try {
            const res = await fetch(
                `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson`,
                { signal: AbortSignal.timeout(8000) }
            );
            const data = await res.json();
            if (data.routes?.[0]?.geometry?.coordinates) {
                return data.routes[0].geometry.coordinates.map(
                    ([lon, lat]: [number, number]) => [lat, lon] as [number, number]
                );
            }
        } catch { /* fall back to straight line */ }
        return null;
    };

    // ── Sync stop markers + polyline ───────────────────────────────────────────
    useEffect(() => {
        const L = LRef.current;
        const map = mapRef.current;
        if (!L || !map) return;

        markersRef.current.forEach(m => map.removeLayer(m));
        markersRef.current = [];
        if (polylineRef.current) { map.removeLayer(polylineRef.current); polylineRef.current = null; }

        const sorted = [...stops].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));

        sorted.forEach((stop, idx) => {
            const icon = L.divIcon({
                html: `<div style="background:#3B82F6;color:#fff;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;box-shadow:0 2px 8px rgba(0,0,0,.3);border:2px solid #fff;">${idx + 1}</div>`,
                iconSize: [28, 28],
                iconAnchor: [14, 14],
                className: '',
            });

            const marker = L.marker([stop.latitude, stop.longitude], { icon }).addTo(map);
            marker.bindPopup(`
                <div style="min-width:140px;font-family:sans-serif;">
                  <div style="font-weight:700;font-size:13px;margin-bottom:4px;">
                    <span style="display:inline-flex;align-items:center;justify-content:center;background:#3B82F6;color:#fff;border-radius:50%;width:18px;height:18px;font-size:10px;margin-right:5px;">${idx + 1}</span>
                    ${stop.name}
                  </div>
                  ${stop.pickup_time ? `<div style="font-size:11px;color:#64748b;margin-bottom:8px;">Pickup: ${stop.pickup_time}</div>` : '<div style="margin-bottom:8px;"></div>'}
                  <button data-stop-id="${stop.id}" style="background:#fee2e2;color:#ef4444;border:none;border-radius:8px;padding:5px 12px;font-size:12px;font-weight:600;cursor:pointer;width:100%;">
                    Delete Stop
                  </button>
                </div>`);
            marker.on('popupopen', () => {
                const btn = document.querySelector(`[data-stop-id="${stop.id}"]`);
                if (btn) btn.addEventListener('click', () => {
                    if (window.confirm(tRef.current('Delete this stop?', 'இந்த நிறுத்தத்தை நீக்கவா?'))) {
                        onDeleteStop(stop.id);
                        map.closePopup();
                    }
                });
            });
            markersRef.current.push(marker);
        });

        const straightCoords = sorted
            .filter(s => s.latitude !== 0 || s.longitude !== 0)
            .map(s => [s.latitude, s.longitude] as [number, number]);

        if (straightCoords.length > 1) {
            polylineRef.current = L.polyline(straightCoords, {
                color: '#3B82F6', weight: 3, opacity: 0.5, dashArray: '8 5',
            }).addTo(map);

            fetchRoadRoute(sorted).then(roadCoords => {
                if (!mapRef.current) return;
                if (polylineRef.current) { map.removeLayer(polylineRef.current); polylineRef.current = null; }
                const coords = roadCoords ?? straightCoords;
                polylineRef.current = L.polyline(coords, {
                    color: '#3B82F6', weight: roadCoords ? 4 : 3,
                    opacity: 0.85, dashArray: roadCoords ? undefined : '8 5',
                }).addTo(map);
            });
        }

        if (sorted.length > 0 && (sorted[0].latitude !== 0 || sorted[0].longitude !== 0)) {
            map.setView([sorted[0].latitude, sorted[0].longitude], 13);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stops, ready]);

    // ── Draft pin on map ───────────────────────────────────────────────────────
    useEffect(() => {
        const L = LRef.current;
        const map = mapRef.current;
        if (!L || !map) return;

        if (draftMarkerRef.current) { map.removeLayer(draftMarkerRef.current); draftMarkerRef.current = null; }

        if (draft) {
            const icon = L.divIcon({
                html: `<div style="background:#EF4444;color:#fff;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;box-shadow:0 2px 12px rgba(239,68,68,.45);border:2.5px solid #fff;line-height:1;">+</div>`,
                iconSize: [32, 32],
                iconAnchor: [16, 16],
                className: '',
            });
            draftMarkerRef.current = L.marker([draft.lat, draft.lng], { icon }).addTo(map);
            setDraftSeq(String(stops.length + 1));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [draft?.lat, draft?.lng, ready]);

    // ── Save draft stop ────────────────────────────────────────────────────────
    const handleSaveDraft = async () => {
        if (!draft) return;
        if (!draftName.trim()) { setDraftError('Stop name is required.'); return; }
        setDraftError('');
        await onAddStop({
            name: draftName.trim(),
            lat: draft.lat,
            lng: draft.lng,
            sequence: draftSeq ? parseInt(draftSeq) : stops.length + 1,
            pickup_time: draftTime,
        });
        setDraft(null);
        setDraftName('');
        setDraftSeq('');
        setDraftTime('');
    };

    const cancelDraft = () => {
        const L = LRef.current;
        const map = mapRef.current;
        if (L && map && draftMarkerRef.current) {
            map.removeLayer(draftMarkerRef.current);
            draftMarkerRef.current = null;
        }
        setDraft(null);
        setDraftName('');
        setDraftSeq('');
        setDraftTime('');
        setDraftError('');
    };

    // ── Position the floating form near the click, with edge detection ─────────
    const getFormStyle = (): React.CSSProperties => {
        if (!draft || !containerRef.current) return { display: 'none' };
        const W = containerRef.current.offsetWidth;
        const H = containerRef.current.offsetHeight;
        const formW = 300;
        const formH = 200;
        const offset = 18;

        let left: number | undefined = draft.x + offset;
        let right: number | undefined;
        let top: number | undefined = draft.y - formH / 2;

        // Flip horizontal if form would overflow right edge
        if (left + formW > W - 8) {
            left = undefined;
            right = W - draft.x + offset;
        }
        // Clamp vertical
        if (top < 8) top = 8;
        if (top + formH > H - 8) top = H - formH - 8;

        return {
            position: 'absolute',
            top,
            ...(left !== undefined ? { left } : { right }),
            width: formW,
            zIndex: 1000,
        };
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/30 rounded-xl px-4 py-2.5">
                <MapPin className="w-3.5 h-3.5 text-[var(--brand)] shrink-0" />
                Click anywhere on the map to place a stop. Numbered pins are connected in sequence order.
            </div>

            {/* Map container — position:relative so the floating form can anchor to it */}
            <div
                className="rounded-2xl border border-slate-200 dark:border-slate-600"
                style={{ height: 420, position: 'relative' }}
            >
                <div ref={containerRef} style={{ height: '100%', width: '100%', borderRadius: 'inherit' }} />

                {!ready && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-700/50 rounded-2xl z-[400]">
                        <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
                    </div>
                )}

                {/* Floating form near the click point */}
                {draft && (
                    <div
                        style={getFormStyle()}
                        className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-600 p-3 pointer-events-auto"
                    >
                        <div className="flex items-center justify-between mb-2.5">
                            <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center shrink-0">
                                    <Plus className="w-3 h-3 text-white" />
                                </div>
                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">New Stop</p>
                            </div>
                            <button
                                onClick={cancelDraft}
                                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        <div className="space-y-2">
                            <div>
                                <input
                                    className={inputCls}
                                    placeholder="Stop name *"
                                    value={draftName}
                                    onChange={e => setDraftName(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleSaveDraft(); if (e.key === 'Escape') cancelDraft(); }}
                                    autoFocus
                                />
                                {draftError && <p className="text-red-500 text-[11px] mt-1">{draftError}</p>}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    className={inputCls}
                                    placeholder="Seq"
                                    value={draftSeq}
                                    onChange={e => setDraftSeq(e.target.value)}
                                    style={{ width: 70 }}
                                />
                                <input
                                    type="time"
                                    className={inputCls}
                                    value={draftTime}
                                    onChange={e => setDraftTime(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-2 pt-1">
                                <button
                                    onClick={handleSaveDraft}
                                    disabled={saving}
                                    className="flex-1 flex items-center justify-center gap-1 bg-[var(--brand)] hover:opacity-90 text-white rounded-lg py-1.5 font-semibold text-xs transition-all disabled:opacity-50"
                                >
                                    {saving
                                        ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        : <Plus className="w-3.5 h-3.5" />}
                                    Save
                                </button>
                                <button
                                    onClick={cancelDraft}
                                    className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white rounded-lg py-1.5 font-semibold text-xs hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
