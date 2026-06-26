// Live bus position via seed fetch + 5s poll + socket. Exposes whether the
// trip is "started" (location is fresh) for the UI to branch on.
import { useEffect, useRef, useState } from 'react';
import { getBusLocation } from '@/lib/api';
import { connectSocket, getSocket } from '@/lib/socket';
import { isLocationFresh } from '@/lib/tracking';

export interface BusLocationState {
    position: [number, number] | null;
    timestamp: number | null;
    tripStarted: boolean;
}

export function useBusLocation(busId: string | null): BusLocationState {
    const [position, setPosition] = useState<[number, number] | null>(null);
    const [timestamp, setTimestamp] = useState<number | null>(null);
    const [now, setNow] = useState(Date.now());
    const mounted = useRef(true);

    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    // Tick so freshness decays even with no new events.
    useEffect(() => {
        const i = setInterval(() => setNow(Date.now()), 5000);
        return () => clearInterval(i);
    }, []);

    // Seed + poll.
    useEffect(() => {
        if (!busId) { setPosition(null); setTimestamp(null); return; }
        let cancelled = false;
        const load = async () => {
            const loc = await getBusLocation(busId);
            if (cancelled || !mounted.current) return;
            if (loc) {
                setPosition([loc.latitude, loc.longitude]);
                setTimestamp(loc.timestamp ? new Date(loc.timestamp).getTime() : Date.now());
            }
        };
        load();
        const i = setInterval(load, 5000);
        return () => { cancelled = true; clearInterval(i); };
    }, [busId]);

    // Socket live updates (server emits latitude/longitude).
    useEffect(() => {
        if (!busId) return;
        let active = true;
        const onUpdate = (data: { busId?: string; latitude?: number; longitude?: number; timestamp?: string }) => {
            if (!active) return;
            if (data.busId && data.busId !== busId) return;
            if (typeof data.latitude !== 'number' || typeof data.longitude !== 'number') return;
            setPosition([data.latitude, data.longitude]);
            setTimestamp(data.timestamp ? new Date(data.timestamp).getTime() : Date.now());
        };
        const onCompleted = () => { if (active) { setTimestamp(null); } };
        let s = getSocket();
        const bind = () => {
            s = getSocket();
            s?.on('location-updated', onUpdate);
            s?.on('trip-completed', onCompleted);
        };
        if (s) bind();
        else connectSocket().then(bind);
        return () => {
            active = false;
            const sock = getSocket();
            sock?.off('location-updated', onUpdate);
            sock?.off('trip-completed', onCompleted);
        };
    }, [busId]);

    return { position, timestamp, tripStarted: isLocationFresh(timestamp, now) };
}
