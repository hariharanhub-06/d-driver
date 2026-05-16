'use client';

import { useEffect, useRef } from 'react';

interface Stop {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distance: number;
}

interface Props {
  center: { lat: number; lng: number };
  stops: Stop[];
}

export default function MapView({ center, stops }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Dynamically import Leaflet to avoid SSR issues
    import('leaflet').then(L => {
      // Fix default marker icons (Leaflet + webpack issue)
      // @ts-ignore
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      if (mapRef.current) {
        mapRef.current.remove();
      }

      const map = L.map(containerRef.current!, { zoomControl: false }).setView([center.lat, center.lng], 14);
      mapRef.current = map;

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        maxZoom: 19,
      }).addTo(map);

      // User location marker (blue circle)
      const userIcon = L.divIcon({
        className: '',
        html: '<div style="width:14px;height:14px;background:#3B82F6;border:3px solid white;border-radius:50%;box-shadow:0 0 0 4px rgba(59,130,246,0.3)"></div>',
        iconAnchor: [7, 7],
      });
      L.marker([center.lat, center.lng], { icon: userIcon }).addTo(map).bindPopup('You are here');

      // Stop markers
      stops.forEach(stop => {
        const stopIcon = L.divIcon({
          className: '',
          html: '<div style="width:10px;height:10px;background:#F59E0B;border:2px solid white;border-radius:50%"></div>',
          iconAnchor: [5, 5],
        });
        L.marker([stop.latitude, stop.longitude], { icon: stopIcon })
          .addTo(map)
          .bindPopup(`<b>${stop.name}</b><br/>${(stop.distance / 1000).toFixed(1)} km`);
      });

      // Fit to show all stops + user
      if (stops.length > 0) {
        const allPoints: [number, number][] = [
          [center.lat, center.lng],
          ...stops.map(s => [s.latitude, s.longitude] as [number, number]),
        ];
        map.fitBounds(L.latLngBounds(allPoints), { padding: [40, 40] });
      }
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [center, stops]);

  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"
      />
      <div
        ref={containerRef}
        className="w-full h-52 rounded-2xl overflow-hidden border border-white/5"
      />
    </>
  );
}
