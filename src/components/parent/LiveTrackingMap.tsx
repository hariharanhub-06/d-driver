'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Gauge, Clock, Maximize2, MapPin } from 'lucide-react';
import api from '@/lib/api';
import { connectSocket, getSocket } from '@/lib/socket';
import {
    isLocationFresh,
    shouldRecomputeEta,
    fetchEta,
    formatDistance,
    formatEta,
    resolveBusId,
    type EtaResult,
    type LatLng,
} from '@/lib/tracking';
import { useT } from '@/lib/i18n';

const FreeMap = dynamic(() => import('@/components/ui/FreeMap'), { ssr: false });

interface Stop { id: string; name: string; latitude?: number; longitude?: number; sequence?: number; pickup_time?: string }
interface Child {
    id: string;
    name: string;
    stop?: { id?: string; name?: string; latitude?: number; longitude?: number };
    route?: { name?: string; bus?: { id?: string; bus_number?: string }; bus_id?: string; stops?: Stop[] };
    bus?: { id?: string; bus_number?: string };
    bus_id?: string;
}

// Embeddable live bus map: route stops (numbered, child's highlighted) + live bus +
// the parent's location, with real distance/ETA. Used on the parent dashboard.
export default function LiveTrackingMap({ child, heightClass = 'h-72', tripActive = true, sosPhone }: { child?: Child; heightClass?: string; tripActive?: boolean; sosPhone?: string }) {
    const t = useT();
    const [busPosition, setBusPosition] = useState<[number, number]>([11.1271, 78.6569]);
    const [busTimestamp, setBusTimestamp] = useState<number | null>(null);
    const [now, setNow] = useState<number>(Date.now());
    const [eta, setEta] = useState<EtaResult | null>(null);
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
    const [sosState, setSosState] = useState<'idle' | 'sending' | 'sent'>('idle');
    const etaCall = useRef<{ t: number; pos: LatLng | null }>({ t: 0, pos: null });

    const raiseSos = async () => {
        if (sosState === 'sending') return;
        setSosState('sending');
        // Always alert the school admin (works even when tel: is blocked inside a PWA/iframe).
        try { await api.post('/sos/parent', {}); } catch { /* non-fatal */ }
        setSosState('sent');
        setTimeout(() => setSosState('idle'), 4000);
        // Then attempt to dial the driver if a number is available.
        if (sosPhone) { try { window.location.href = `tel:${sosPhone}`; } catch { /* blocked */ } }
    };

    const busId = child ? resolveBusId(child) : null;
    const busNumber = child?.route?.bus?.bus_number || child?.bus?.bus_number;
    const myStop = child?.stop;
    const stopPos: [number, number] | null = myStop?.latitude && myStop?.longitude ? [myStop.latitude, myStop.longitude] : null;

    // Geolocate the parent once (optional).
    useEffect(() => {
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                pos => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
                () => {},
            );
        }
    }, []);

    // Freshness ticker.
    useEffect(() => {
        const i = setInterval(() => setNow(Date.now()), 5000);
        return () => clearInterval(i);
    }, []);

    // Seed + poll bus location.
    useEffect(() => {
        if (!busId) { setBusTimestamp(null); return; }
        let cancelled = false;
        connectSocket(busId);
        const load = async () => {
            try {
                const { data } = await api.get(`/location/bus/${busId}`);
                if (!cancelled && data?.latitude) {
                    setBusPosition([data.latitude, data.longitude]);
                    setBusTimestamp(data.timestamp ? new Date(data.timestamp).getTime() : Date.now());
                }
            } catch { /* 404 = not started */ }
        };
        load();
        const i = setInterval(load, 5000);
        return () => { cancelled = true; clearInterval(i); };
    }, [busId]);

    // Socket live updates (server emits latitude/longitude).
    useEffect(() => {
        if (!busId) return;
        const onUpdate = (data: { busId?: string; latitude?: number; longitude?: number; timestamp?: string }) => {
            if (data.busId && data.busId !== busId) return;
            if (typeof data.latitude !== 'number' || typeof data.longitude !== 'number') return;
            setBusPosition([data.latitude, data.longitude]);
            setBusTimestamp(data.timestamp ? new Date(data.timestamp).getTime() : Date.now());
        };
        const onCompleted = () => { setBusTimestamp(null); setEta(null); };
        const s = getSocket();
        s.on('location-updated', onUpdate);
        s.on('trip-completed', onCompleted);
        return () => { s.off('location-updated', onUpdate); s.off('trip-completed', onCompleted); };
    }, [busId]);

    // Also require a running trip — otherwise the bus lingers after the driver ends the
    // trip (the last fix stays "fresh" for 90s while the poll keeps re-marking it).
    const tripStarted = isLocationFresh(busTimestamp, now) && tripActive;
    const mapCenter: [number, number] = tripStarted ? busPosition : (userLocation || stopPos || busPosition);

    // Throttled ETA to the child's stop.
    useEffect(() => {
        if (!tripStarted || !stopPos) { setEta(null); return; }
        const busLL: LatLng = { lat: busPosition[0], lng: busPosition[1] };
        const stopLL: LatLng = { lat: stopPos[0], lng: stopPos[1] };
        if (!shouldRecomputeEta(busLL, etaCall.current.pos, etaCall.current.t)) return;
        etaCall.current = { t: Date.now(), pos: busLL };
        const ctrl = new AbortController();
        fetchEta(busLL, stopLL, ctrl.signal).then(setEta).catch(() => {});
        return () => ctrl.abort();
    }, [tripStarted, busPosition, stopPos]);

    const routeStops = child?.route?.stops || [];
    const stopMarkers = routeStops
        .filter(s => s.latitude != null && s.longitude != null)
        .map((s, idx) => ({
            id: s.id,
            position: [s.latitude!, s.longitude!] as [number, number],
            title: s.name,
            description: s.pickup_time ? `${s.name} · ${s.pickup_time}` : s.name,
            stopNumber: s.sequence ?? idx + 1,
            isMyStop: s.id === myStop?.id,
        }));

    const markers = [
        ...(stopMarkers.length > 0
            ? stopMarkers
            : (stopPos ? [{ id: myStop!.id, position: stopPos, title: myStop!.name || 'Stop', isStopPin: true as const, isSelected: true }] : [])),
        ...(userLocation ? [{ position: userLocation, title: 'Your Location', isUserLocation: true as const }] : []),
        ...(tripStarted ? [{ position: busPosition, title: `Bus ${busNumber || ''}`, isBus: true as const }] : []),
    ];

    if (!busId || !stopPos) return null; // nothing to show

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full ${tripStarted ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
                    <h2 className="text-sm font-bold text-slate-800 dark:text-white truncate">
                        {tripStarted ? t('Live Tracking', 'நேரடி கண்காணிப்பு') : t('Bus not started', 'பேருந்து தொடங்கவில்லை')}
                    </h2>
                </div>
                <Link href="/parent/tracking" className="flex items-center gap-1 text-xs font-bold text-[var(--brand)] active:scale-95 transition-all">
                    <Maximize2 className="w-3 h-3" /> {t('Full map', 'முழு வரைபடம்')}
                </Link>
            </div>

            <div className={`relative w-full ${heightClass}`}>
                <FreeMap center={mapCenter} zoom={14} markers={markers} />
            </div>

            <div className="px-4 py-3 flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 min-w-0">
                    <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="truncate">{myStop?.name || t('Your Stop', 'உங்கள் நிறுத்தம்')}</span>
                </div>
                <div className="ml-auto flex items-center gap-3">
                    {tripStarted ? (
                        <>
                            <span className="flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-white">
                                <Gauge className="w-3.5 h-3.5 text-[var(--brand)]" /> {eta ? formatDistance(eta.distanceM) : '…'}
                            </span>
                            <span className="flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-white">
                                <Clock className="w-3.5 h-3.5 text-[var(--brand)]" /> {eta ? formatEta(eta.durationS, eta.source) : '…'}
                            </span>
                        </>
                    ) : (
                        <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                            {t("Hasn't started yet", 'இன்னும் தொடங்கவில்லை')}
                        </span>
                    )}
                    <button
                        onClick={raiseSos}
                        disabled={sosState === 'sending'}
                        className={`font-black text-[11px] px-2.5 py-1.5 rounded-lg shadow active:scale-95 transition-all shrink-0 text-white ${sosState === 'sent' ? 'bg-emerald-500' : 'bg-red-500 hover:bg-red-600'}`}
                    >
                        {sosState === 'sent' ? t('Sent ✓', 'அனுப்பப்பட்டது ✓') : sosState === 'sending' ? '…' : 'SOS'}
                    </button>
                </div>
            </div>
        </div>
    );
}
