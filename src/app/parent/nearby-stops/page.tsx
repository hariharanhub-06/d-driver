'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Navigation, MapPin, ArrowRight, Loader2, AlertTriangle, Bus } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';

interface NearbyStop {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distance: number;
  route?: { name: string; route_type?: string };
}

// Lazy-load the map so it never SSR-crashes
const MapView = dynamic(() => import('./MapView'), { ssr: false, loading: () => (
  <div className="w-full h-48 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center border border-slate-200 dark:border-slate-600">
    <Loader2 className="w-6 h-6 text-[var(--brand)] animate-spin" />
  </div>
) });

function formatDistance(m: number) {
  if (m < 1000) return `${Math.round(m)} m away`;
  return `${(m / 1000).toFixed(1)} km away`;
}

export default function NearbyStopsPage() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [stops, setStops] = useState<NearbyStop[]>([]);
  const [locating, setLocating] = useState(false);
  const [loadingStops, setLoadingStops] = useState(false);
  const [error, setError] = useState('');

  const findLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setCoords({ lat, lng });
        setLocating(false);
        setLoadingStops(true);
        try {
          const res = await api.get(`/stops/nearby?lat=${lat}&lng=${lng}&radius=2000`);
          setStops(Array.isArray(res.data) ? res.data : []);
        } catch {
          setError('Could not fetch nearby stops. Please try again.');
        } finally {
          setLoadingStops(false);
        }
      },
      (err) => {
        setLocating(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError('Location permission denied. Please allow location access and try again.');
            break;
          case err.POSITION_UNAVAILABLE:
            setError('Location unavailable. Please check your GPS settings.');
            break;
          default:
            setError('Could not determine your location.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-slate-900 dark:text-white">Nearby Stops</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Find stops within 2 km</p>
      </div>

      {/* Find location button */}
      {!coords && (
        <button
          onClick={findLocation}
          disabled={locating}
          className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95 w-full justify-center disabled:opacity-60"
        >
          {locating ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Locating...</>
          ) : (
            <><Navigation className="w-4 h-4" /> Find My Location</>
          )}
        </button>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Map */}
      {coords && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-4 space-y-3">
          <MapView center={coords} stops={stops} />

          {/* Re-locate button */}
          <button
            onClick={findLocation}
            disabled={locating}
            className="flex items-center gap-2 text-[var(--brand)] text-xs font-semibold disabled:opacity-50"
          >
            <Navigation className="w-3.5 h-3.5" />
            {locating ? 'Updating location...' : 'Update my location'}
          </button>
        </div>
      )}

      {/* Stops list */}
      {coords && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
            {loadingStops ? 'Searching...' : `${stops.length} stops found`}
          </h2>

          {loadingStops ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : stops.length === 0 ? (
            <div className="text-center py-8">
              <MapPin className="w-8 h-8 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
              <p className="text-sm text-slate-500 dark:text-slate-400">No stops within 2 km of your location</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stops.map((stop, idx) => (
                <div
                  key={stop.id}
                  className="flex items-center gap-4 py-3 border-b border-slate-50 dark:border-slate-700/50 last:border-0"
                >
                  {/* Index badge */}
                  <div className="w-9 h-9 shrink-0 rounded-xl bg-[var(--brand)]/10 flex items-center justify-center font-bold text-[var(--brand)] text-sm">
                    {idx + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-white text-sm">{stop.name}</p>
                    {stop.route && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <Bus className="w-3 h-3 text-[var(--brand)]" />
                        {stop.route.name}
                      </p>
                    )}
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {formatDistance(stop.distance)}
                    </p>
                  </div>

                  <Link
                    href={`/parent/requests?stop_id=${stop.id}&stop_name=${encodeURIComponent(stop.name)}`}
                    className="shrink-0 flex items-center gap-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-3 py-1.5 text-xs font-semibold hover:border-[var(--brand)] hover:text-[var(--brand)] transition-all"
                  >
                    Request <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
