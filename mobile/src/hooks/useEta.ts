// Throttled OSRM ETA: recomputes only when the trip is live and the bus has
// moved enough / enough time passed. Falls back to Haversine on failure.
import { useEffect, useRef, useState } from 'react';
import { fetchEta, shouldRecomputeEta, type EtaResult, type LatLng } from '@/lib/tracking';

export function useEta(
    busPos: [number, number] | null,
    stopPos: [number, number] | null,
    tripStarted: boolean,
): EtaResult | null {
    const [eta, setEta] = useState<EtaResult | null>(null);
    const lastCall = useRef<{ t: number; pos: LatLng | null }>({ t: 0, pos: null });

    useEffect(() => {
        if (!tripStarted || !busPos || !stopPos) {
            setEta(null);
            lastCall.current = { t: 0, pos: null };
            return;
        }
        const bus: LatLng = { lat: busPos[0], lng: busPos[1] };
        const stop: LatLng = { lat: stopPos[0], lng: stopPos[1] };
        if (!shouldRecomputeEta(bus, lastCall.current.pos, lastCall.current.t)) return;
        lastCall.current = { t: Date.now(), pos: bus };
        const ctrl = new AbortController();
        fetchEta(bus, stop, ctrl.signal)
            .then((r) => setEta(r))
            .catch(() => { /* aborted */ });
        return () => ctrl.abort();
    }, [tripStarted, busPos, stopPos]);

    return eta;
}
