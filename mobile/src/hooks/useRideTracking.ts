// Foreground GPS broadcast for the driver: watch position, emit to the socket
// (throttled to match the server's 3s DB write), and keep the screen awake while
// a trip is active. v1 is foreground-only (no background entitlement needed).
import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { useKeepAwake } from 'expo-keep-awake';
import { emitLocation } from '@/lib/socket';

export interface RideFix {
    position: [number, number] | null;
    heading: number | null;
    accuracy: number | null;
    permission: 'granted' | 'denied' | 'pending';
}

export function useRideTracking(busId: string | null, active: boolean): RideFix {
    useKeepAwake(); // hold the screen on while this hook is mounted (ride screen)
    const [fix, setFix] = useState<RideFix>({ position: null, heading: null, accuracy: null, permission: 'pending' });
    const lastEmit = useRef(0);

    useEffect(() => {
        if (!busId || !active) return;
        let sub: Location.LocationSubscription | null = null;
        let alive = true;

        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (!alive) return;
            if (status !== 'granted') {
                setFix(f => ({ ...f, permission: 'denied' }));
                return;
            }
            setFix(f => ({ ...f, permission: 'granted' }));
            sub = await Location.watchPositionAsync(
                { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 2000, distanceInterval: 5 },
                (loc) => {
                    if (!alive) return;
                    const { latitude, longitude, accuracy, heading } = loc.coords;
                    const hdg = heading != null && heading >= 0 ? heading : null;
                    setFix({ position: [latitude, longitude], heading: hdg, accuracy: accuracy ?? null, permission: 'granted' });
                    const now = Date.now();
                    if (now - lastEmit.current < 3000) return; // mirror server's 3s throttle
                    lastEmit.current = now;
                    emitLocation(busId, latitude, longitude, hdg);
                },
            );
        })();

        return () => { alive = false; sub?.remove(); };
    }, [busId, active]);

    return fix;
}
