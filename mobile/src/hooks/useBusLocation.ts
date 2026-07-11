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
        // The server fans `location-updated` out per bus rather than school-wide, so the
        // bus room must be joined explicitly — and re-joined on reconnect, since rooms are
        // per-socket and do not survive a dropped connection.
        const joinBusRoom = () => getSocket()?.emit('join-bus-room', busId);
        const bind = () => {
            s = getSocket();
            joinBusRoom();
            s?.on('connect', joinBusRoom);
            s?.on('location-updated', onUpdate);
            s?.on('trip-completed', onCompleted);
        };
        if (s) bind();
        else connectSocket().then(bind);
        return () => {
            active = false;
            const sock = getSocket();
            // No `leave-bus-room` — leaving on cleanup races with the next screen's mount
            // for the same bus. Membership is bounded by the parent's own children.
            sock?.off('connect', joinBusRoom);
            sock?.off('location-updated', onUpdate);
            sock?.off('trip-completed', onCompleted);
        };
    }, [busId]);

    return { position, timestamp, tripStarted: isLocationFresh(timestamp, now) };
}
