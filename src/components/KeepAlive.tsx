'use client';

import { useEffect } from 'react';

const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || '').replace('/api/v1', '');
const INTERVAL_MS = 13 * 60 * 1000; // 13 minutes

export default function KeepAlive() {
  useEffect(() => {
    const ping = () => {
      fetch(`${BACKEND_URL}/api/health`, { method: 'GET', cache: 'no-store' }).catch(() => {});
    };

    ping(); // ping immediately on first load
    const id = setInterval(ping, INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return null;
}
