'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin, Plus } from 'lucide-react';

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

const inputCls = 'w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors';

export default function StopMap({ stops, saving, onAddStop, onDeleteStop }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const LRef = useRef<any>(null);
    const markersRef = useRef<any[]>([]);
    const polylineRef = useRef<any>(null);
    const draftMarkerRef = useRef<any>(null);

    const [ready, setReady] = useState(false);
    const [draft, setDraft] = useState<{ lat: number; lng: number } | null>(null);
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
            await import('leaflet/dist/leaflet.css' as string);

            if (cancelled || !containerRef.current) return;

            // Fix broken default-icon paths in Webpack/Next.js
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete (L.Icon.Default.prototype as any)._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            });

            const map = L.map(containerRef.current, {
                center: [20.5937, 78.9629],
                zoom: 5,
            });

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            }).addTo(map);

            map.on('click', (e: any) => {
                setDraft({ lat: e.latlng.lat, lng: e.latlng.lng });
            });

            LRef.current = L;
            mapRef.current = map;
            setReady(true);
        })();

        return () => {
            cancelled = true;
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    // ── Sync stop markers + polyline ───────────────────────────────────────────
    useEffect(() => {
        const L = LRef.current;
        const map = mapRef.current;
        if (!L || !map) return;

        // Remove old markers
        markersRef.current.forEach(m => map.removeLayer(m));
        markersRef.current = [];

        // Remove old polyline
        if (polylineRef.current) { map.removeLayer(polylineRef.current); polylineRef.current = null; }

        const sorted = [...stops].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));

        sorted.forEach((stop, idx) => {
            const icon = L.divIcon({
                html: `<div style="background:#3B82F6;color:#fff;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;box-shadow:0 2px 8px rgba(0,0,0,.3);border:2px solid #fff;">${idx + 1}</div>`,
                iconSize: [32, 32],
                iconAnchor: [16, 16],
                className: '',
            });

            const marker = L.marker([stop.latitude, stop.longitude], { icon }).addTo(map);

            const popupHtml = `
                <div style="min-width:150px;font-family:sans-serif;">
                  <div style="font-weight:700;font-size:13px;margin-bottom:4px;">
                    <span style="display:inline-flex;align-items:center;justify-content:center;background:#3B82F6;color:#fff;border-radius:50%;width:20px;height:20px;font-size:11px;margin-right:6px;">${idx + 1}</span>
                    ${stop.name}
                  </div>
                  ${stop.pickup_time ? `<div style="font-size:11px;color:#64748b;margin-bottom:6px;">Pickup: ${stop.pickup_time}</div>` : ''}
                  <button data-stop-id="${stop.id}" style="background:#fee2e2;color:#ef4444;border:none;border-radius:8px;padding:4px 10px;font-size:12px;font-weight:600;cursor:pointer;">
                    Delete Stop
                  </button>
                </div>`;

            marker.bindPopup(popupHtml);

            marker.on('popupopen', () => {
                const btn = document.querySelector(`[data-stop-id="${stop.id}"]`);
                if (btn) {
                    btn.addEventListener('click', () => {
                        if (window.confirm(`Delete stop "${stop.name}"?`)) {
                            onDeleteStop(stop.id);
                            map.closePopup();
                        }
                    });
                }
            });

            markersRef.current.push(marker);
        });

        // Polyline
        const coords = sorted
            .filter(s => s.latitude !== 0 || s.longitude !== 0)
            .map(s => [s.latitude, s.longitude] as [number, number]);

        if (coords.length > 1) {
            polylineRef.current = L.polyline(coords, {
                color: '#3B82F6',
                weight: 3,
                opacity: 0.8,
                dashArray: '8 5',
            }).addTo(map);
        }

        // Fly to first stop
        if (sorted.length > 0 && (sorted[0].latitude !== 0 || sorted[0].longitude !== 0)) {
            map.setView([sorted[0].latitude, sorted[0].longitude], 13);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stops, ready]);

    // ── Draft pin ──────────────────────────────────────────────────────────────
    useEffect(() => {
        const L = LRef.current;
        const map = mapRef.current;
        if (!L || !map) return;

        if (draftMarkerRef.current) { map.removeLayer(draftMarkerRef.current); draftMarkerRef.current = null; }

        if (draft) {
            const icon = L.divIcon({
                html: `<div style="background:#EF4444;color:#fff;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;box-shadow:0 2px 12px rgba(239,68,68,.45);border:2.5px solid #fff;line-height:1;">+</div>`,
                iconSize: [36, 36],
                iconAnchor: [18, 18],
                className: '',
            });
            draftMarkerRef.current = L.marker([draft.lat, draft.lng], { icon }).addTo(map);
            setDraftSeq(String(stops.length + 1));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [draft, ready]);

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

    // ──────────────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/30 rounded-xl px-4 py-2.5">
                <MapPin className="w-3.5 h-3.5 text-[var(--brand)] shrink-0" />
                Click anywhere on the map to place a stop. Numbered pins are connected in sequence order.
            </div>

            {!ready && (
                <div className="flex items-center justify-center h-64 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-200 dark:border-slate-600">
                    <div className="w-7 h-7 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
                </div>
            )}

            <div
                ref={containerRef}
                className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-600"
                style={{ height: 400, display: ready ? 'block' : 'none' }}
            />

            {draft && (
                <div className="bg-slate-50 dark:bg-slate-700/30 border border-[var(--brand)] border-dashed rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center shrink-0">
                            <Plus className="w-4 h-4 text-white" />
                        </div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            New stop — {draft.lat.toFixed(5)}, {draft.lng.toFixed(5)}
                        </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Name <span className="text-red-500">*</span></label>
                            <input
                                className={inputCls}
                                placeholder="e.g. Bus Stand"
                                value={draftName}
                                onChange={e => setDraftName(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleSaveDraft(); }}
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Sequence</label>
                            <input type="number" className={inputCls} placeholder="1" value={draftSeq} onChange={e => setDraftSeq(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Pickup Time</label>
                            <input type="time" className={inputCls} value={draftTime} onChange={e => setDraftTime(e.target.value)} />
                        </div>
                    </div>
                    {draftError && <p className="text-red-600 dark:text-red-400 text-xs font-medium">{draftError}</p>}
                    <div className="flex gap-2">
                        <button
                            onClick={handleSaveDraft}
                            disabled={saving}
                            className="flex items-center gap-1.5 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2 font-semibold text-sm transition-all active:scale-95 disabled:opacity-50"
                        >
                            {saving
                                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                : <Plus className="w-4 h-4" />}
                            Save Stop
                        </button>
                        <button
                            onClick={() => setDraft(null)}
                            className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-4 py-2 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
