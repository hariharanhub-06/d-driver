'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Loader2, MapPin, Phone } from 'lucide-react';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useAuth } from '@/context/AuthContext';
import { useT } from '@/lib/i18n';

interface Alert {
    id: string;
    status?: string;
    source?: string; // 'driver' | 'parent'
    raised_by_name?: string;
    parent_name?: string;
    driver_name?: string;
    driver_phone?: string;
    bus_number?: string;
    latitude?: number;
    longitude?: number;
    triggered_at?: string;
}

// Normalize an alert object coming from either the REST list or a socket event into a
// single shape the banner can render.
const norm = (a: any): Alert => ({
    id: a.id,
    status: a.status,
    source: a.source,
    raised_by_name: a.raised_by_name || a.parent_name,
    driver_name: a.driver_name,
    driver_phone: a.driver_phone,
    bus_number: a.bus_number,
    latitude: a.latitude,
    longitude: a.longitude,
    triggered_at: a.triggered_at,
});

// App-wide SOS banner for admins / super-admins. Shows a blinking red bar for every active
// SOS (driver or parent) on EVERY page, and keeps it until the alert is cancelled (driver /
// parent), resolved by another admin, or this admin clicks "Noted" (which resolves it).
export default function SosWatcher() {
    const { user } = useAuth();
    const t = useT();
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [busyId, setBusyId] = useState<string | null>(null);

    const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

    const fetchActive = useCallback(async () => {
        try {
            const { data } = await api.get('/sos');
            const list = (Array.isArray(data) ? data : data.alerts || [])
                .filter((a: Alert) => a.status === 'active')
                .map(norm);
            setAlerts(list);
        } catch { /* ignore — banner just stays empty */ }
    }, []);

    useEffect(() => {
        if (!isAdmin) return;
        fetchActive();

        const s = getSocket();
        const onAlert = (raw: any) => {
            if (!raw?.id) return;
            setAlerts(prev => (prev.some(a => a.id === raw.id) ? prev : [norm(raw), ...prev]));
        };
        const onClear = (p: { id?: string }) => {
            if (!p?.id) return;
            setAlerts(prev => prev.filter(a => a.id !== p.id));
        };
        s.on('sos-alert', onAlert);
        s.on('sos-cancelled', onClear);
        s.on('sos-resolved', onClear);
        return () => {
            s.off('sos-alert', onAlert);
            s.off('sos-cancelled', onClear);
            s.off('sos-resolved', onClear);
        };
    }, [isAdmin, fetchActive]);

    const noted = async (id: string) => {
        setBusyId(id);
        try {
            await api.put(`/sos/${id}/resolve`, { resolved_note: 'Acknowledged by admin' });
            setAlerts(prev => prev.filter(a => a.id !== id)); // socket will also clear it for others
        } catch { /* keep it on screen so it isn't lost */ }
        finally { setBusyId(null); }
    };

    if (!isAdmin || alerts.length === 0) return null;

    return (
        <div className="fixed top-0 inset-x-0 z-[1000] flex flex-col gap-2 p-3 pointer-events-none">
            {alerts.map(a => {
                const isParent = a.source === 'parent';
                const who = isParent
                    ? `${t('Parent', 'பெற்றோர்')}: ${a.raised_by_name || '—'}`
                    : `${a.driver_name || t('Driver', 'ஓட்டுநர்')}`;
                return (
                    <div
                        key={a.id}
                        className="pointer-events-auto mx-auto w-full max-w-2xl rounded-2xl bg-red-600 text-white shadow-2xl shadow-red-900/40 ring-2 ring-red-300 animate-pulse"
                    >
                        <div className="flex items-start gap-3 p-4">
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-black text-sm tracking-wide">
                                    {isParent
                                        ? t('🚨 SOS — PARENT EMERGENCY', '🚨 SOS — பெற்றோர் அவசரம்')
                                        : t('🚨 SOS — DRIVER EMERGENCY', '🚨 SOS — ஓட்டுநர் அவசரம்')}
                                </p>
                                <p className="text-red-50 text-sm mt-0.5 truncate">
                                    {who}{a.bus_number && <> · {t('Bus', 'பேருந்து')} {a.bus_number}</>}
                                </p>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-red-100 text-xs mt-1">
                                    {a.triggered_at && (
                                        <span>{new Date(a.triggered_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                                    )}
                                    {a.driver_phone && (
                                        <a href={`tel:${a.driver_phone}`} className="inline-flex items-center gap-1 underline">
                                            <Phone className="w-3 h-3" /> {a.driver_phone}
                                        </a>
                                    )}
                                    {a.latitude != null && a.longitude != null && (
                                        <a href={`https://maps.google.com/?q=${a.latitude},${a.longitude}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline">
                                            <MapPin className="w-3 h-3" /> {t('Location', 'இடம்')}
                                        </a>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => noted(a.id)}
                                disabled={busyId === a.id}
                                className="shrink-0 bg-white text-red-700 font-black text-xs px-4 py-2 rounded-xl hover:bg-red-50 disabled:opacity-70 transition-all active:scale-95"
                            >
                                {busyId === a.id ? <Loader2 className="w-4 h-4 animate-spin" /> : t('Noted', 'புரிந்தது')}
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
