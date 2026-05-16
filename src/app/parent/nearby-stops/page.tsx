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
  <div className="w-full h-48 bg-[#0a0a0a] rounded-2xl flex items-center justify-center border border-white/5">
    <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
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
    <div className="min-h-full bg-black text-white font-sans pb-8">
      <div className="absolute top-0 left-0 w-full h-64 bg-blue-600/5 blur-[120px] pointer-events-none" />

      <div className="relative z-10 p-6 pt-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-black tracking-tight">Nearby Stops</h1>
          <p className="text-white/30 font-bold uppercase tracking-widest text-[10px] mt-1">
            Find stops within 2 km
          </p>
        </div>

        {/* Find location button */}
        {!coords && (
          <button
            onClick={findLocation}
            disabled={locating}
            className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-4 rounded-2xl font-black text-sm transition-all active:scale-95"
          >
            {locating ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Locating…</>
            ) : (
              <><Navigation className="w-5 h-5" /> Find My Location</>
            )}
          </button>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <p className="text-red-400 text-sm font-bold">{error}</p>
          </div>
        )}

        {/* Map */}
        {coords && (
          <div className="space-y-4">
            <MapView center={coords} stops={stops} />

            {/* Re-locate button */}
            <button
              onClick={findLocation}
              disabled={locating}
              className="flex items-center gap-2 text-blue-400 text-xs font-black uppercase tracking-widest disabled:opacity-50"
            >
              <Navigation className="w-3.5 h-3.5" />
              {locating ? 'Updating location…' : 'Update my location'}
            </button>
          </div>
        )}

        {/* Stops list */}
        {coords && (
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-white/40 border-l-4 border-blue-600 pl-3 mb-4">
              {loadingStops ? 'Searching…' : `${stops.length} stops found`}
            </h3>

            {loadingStops ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
              </div>
            ) : stops.length === 0 ? (
              <div className="bg-[#121212] rounded-2xl p-6 border border-white/5 text-center">
                <MapPin className="w-8 h-8 text-white/20 mx-auto mb-3" />
                <p className="text-white/30 text-sm font-bold">No stops within 2 km of your location</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stops.map((stop, idx) => (
                  <div
                    key={stop.id}
                    className="bg-[#121212] rounded-3xl p-5 border border-white/5 flex items-center gap-4"
                  >
                    {/* Index badge */}
                    <div className="w-10 h-10 shrink-0 rounded-2xl bg-blue-600/10 border border-blue-600/20 flex items-center justify-center font-black text-blue-400 text-sm">
                      {idx + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-black text-white text-sm">{stop.name}</p>
                      {stop.route && (
                        <p className="text-white/40 text-xs font-bold flex items-center gap-1.5 mt-0.5">
                          <Bus className="w-3 h-3 text-blue-400" />
                          {stop.route.name}
                        </p>
                      )}
                      <p className="text-white/20 text-[10px] font-bold mt-1 flex items-center gap-1 uppercase tracking-widest">
                        <MapPin className="w-3 h-3" />
                        {formatDistance(stop.distance)}
                      </p>
                    </div>

                    <Link
                      href={`/parent/request?stop_id=${stop.id}&stop_name=${encodeURIComponent(stop.name)}`}
                      className="shrink-0 flex items-center gap-1.5 bg-white/5 hover:bg-blue-600/20 border border-white/10 hover:border-blue-600/30 text-white/60 hover:text-blue-400 text-xs font-black uppercase tracking-tight px-3 py-2 rounded-xl transition-all"
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
    </div>
  );
}
