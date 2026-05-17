'use client';

import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Trash2, MapPin, Plus } from 'lucide-react';

export interface StopPoint {
    id: string;
    name: string;
    sequence?: number;
    pickup_time?: string;
    latitude: number;
    longitude: number;
}

interface NewStopDraft {
    lat: number;
    lng: number;
}

interface Props {
    stops: StopPoint[];
    saving: boolean;
    onAddStop: (data: { name: string; lat: number; lng: number; sequence: number; pickup_time: string }) => Promise<void>;
    onDeleteStop: (stopId: string) => void;
}

// Fix broken default icons in Next.js + Leaflet
function initIcons() {
    if (typeof window === 'undefined') return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
}

const makeNumberedIcon = (num: number | string, color = '#3B82F6') =>
    L.divIcon({
        html: `<div style="background:${color};color:#fff;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;box-shadow:0 2px 8px rgba(0,0,0,.35);border:2.5px solid #fff;">${num}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        className: '',
    });

const draftIcon = L.divIcon({
    html: `<div style="background:#EF4444;color:#fff;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;box-shadow:0 2px 12px rgba(239,68,68,.5);border:2.5px solid #fff;line-height:1;">+</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    className: '',
});

function ClickCatcher({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
    useMapEvents({
        click(e) {
            onMapClick(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

const inputCls = 'w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors';

export default function StopMap({ stops, saving, onAddStop, onDeleteStop }: Props) {
    const [ready, setReady] = useState(false);
    const [draft, setDraft] = useState<NewStopDraft | null>(null);
    const [draftName, setDraftName] = useState('');
    const [draftSeq, setDraftSeq] = useState('');
    const [draftTime, setDraftTime] = useState('');
    const [draftError, setDraftError] = useState('');

    useEffect(() => {
        initIcons();
        setReady(true);
    }, []);

    if (!ready) {
        return (
            <div className="flex items-center justify-center h-64 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
                <div className="w-7 h-7 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // Default center: India, or first stop
    const sorted = [...stops].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
    const center: [number, number] = sorted.length > 0
        ? [sorted[0].latitude, sorted[0].longitude]
        : [20.5937, 78.9629];

    const handleMapClick = (lat: number, lng: number) => {
        setDraft({ lat, lng });
        setDraftName('');
        setDraftSeq(String(stops.length + 1));
        setDraftTime('');
        setDraftError('');
    };

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
    };

    const polyline: [number, number][] = sorted
        .filter(s => s.latitude !== 0 || s.longitude !== 0)
        .map(s => [s.latitude, s.longitude]);

    return (
        <div className="space-y-3">
            {/* Hint */}
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/30 rounded-xl px-4 py-2.5">
                <MapPin className="w-3.5 h-3.5 text-[var(--brand)] shrink-0" />
                Click anywhere on the map to place a stop. Stops are connected in sequence order.
            </div>

            {/* Map */}
            <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-600" style={{ height: 380 }}>
                <MapContainer
                    center={center}
                    zoom={sorted.length > 0 ? 13 : 5}
                    style={{ height: '100%', width: '100%' }}
                    key={`map-${stops.length}`}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <ClickCatcher onMapClick={handleMapClick} />

                    {/* Existing stops */}
                    {sorted.map((stop, idx) => (
                        <Marker
                            key={stop.id}
                            position={[stop.latitude, stop.longitude]}
                            icon={makeNumberedIcon(idx + 1)}
                        >
                            <Popup>
                                <div className="text-sm min-w-[140px]">
                                    <p className="font-bold text-slate-900 mb-1">
                                        <span className="inline-flex items-center justify-center bg-[var(--brand)] text-white rounded-full w-5 h-5 text-xs mr-1.5">{idx + 1}</span>
                                        {stop.name}
                                    </p>
                                    {stop.pickup_time && (
                                        <p className="text-slate-500 text-xs mb-2">Pickup: {stop.pickup_time}</p>
                                    )}
                                    <button
                                        onClick={() => onDeleteStop(stop.id)}
                                        className="flex items-center gap-1 text-red-600 font-semibold text-xs hover:opacity-80 transition-opacity"
                                    >
                                        <Trash2 className="w-3 h-3" /> Delete Stop
                                    </button>
                                </div>
                            </Popup>
                        </Marker>
                    ))}

                    {/* Draft pin */}
                    {draft && (
                        <Marker position={[draft.lat, draft.lng]} icon={draftIcon} />
                    )}

                    {/* Route polyline */}
                    {polyline.length > 1 && (
                        <Polyline
                            positions={polyline}
                            pathOptions={{ color: 'var(--brand, #3B82F6)', weight: 3, opacity: 0.75, dashArray: '6 4' }}
                        />
                    )}
                </MapContainer>
            </div>

            {/* Draft form */}
            {draft && (
                <div className="bg-slate-50 dark:bg-slate-700/30 border border-[var(--brand)] rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center shrink-0">
                            <Plus className="w-3.5 h-3.5 text-white" />
                        </div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">New stop at {draft.lat.toFixed(5)}, {draft.lng.toFixed(5)}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-1">
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
                            <input
                                type="number"
                                className={inputCls}
                                placeholder="1"
                                value={draftSeq}
                                onChange={e => setDraftSeq(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Pickup Time</label>
                            <input
                                type="time"
                                className={inputCls}
                                value={draftTime}
                                onChange={e => setDraftTime(e.target.value)}
                            />
                        </div>
                    </div>
                    {draftError && (
                        <p className="text-red-600 dark:text-red-400 text-xs font-medium">{draftError}</p>
                    )}
                    <div className="flex gap-2">
                        <button
                            onClick={handleSaveDraft}
                            disabled={saving}
                            className="flex items-center gap-1.5 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2 font-semibold text-sm transition-all active:scale-95 disabled:opacity-50"
                        >
                            {saving ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Plus className="w-4 h-4" />
                            )}
                            Save Stop
                        </button>
                        <button
                            onClick={() => setDraft(null)}
                            className="flex items-center gap-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-4 py-2 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
