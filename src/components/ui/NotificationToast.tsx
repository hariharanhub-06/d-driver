'use client';

import { useState, useEffect } from 'react';
import { getSocket } from '@/lib/socket';
import { useAuth } from '@/context/AuthContext';
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

export type NotificationType = 'info' | 'error' | 'success';

interface AppNotification {
    id: string;
    message: string;
    type: NotificationType;
    time: string;
}

export default function NotificationToast() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<AppNotification[]>([]);

    useEffect(() => {
        if (!user?.id) return;

        const s = getSocket();
        if (!s.connected) s.connect();

        // Join the user-specific room so notifyUser() emissions reach this client
        s.emit('join-user-room', user.id);

        const handleNewNotification = (data: AppNotification) => {
            setNotifications(prev => [data, ...prev].slice(0, 3)); // Keep max 3 toasts

            // Auto-dismiss after 5 seconds
            setTimeout(() => {
                setNotifications(prev => prev.filter(n => n.id !== data.id));
            }, 5000);
        };

        s.on('new-notification', handleNewNotification);

        return () => {
            s.off('new-notification', handleNewNotification);
        };
    }, [user?.id]);

    if (notifications.length === 0) return null;

    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-3 w-full max-w-sm px-4">
            {notifications.map((notif) => (
                <div
                    key={notif.id}
                    className={`animate-in slide-in-from-top-10 fade-in duration-300 rounded-2xl p-4 shadow-2xl border flex items-start gap-3 backdrop-blur-md
                        ${notif.type === 'error' ? 'bg-red-500/90 text-white border-red-500/50 shadow-red-500/20' :
                            notif.type === 'success' ? 'bg-emerald-500/90 text-white border-emerald-500/50 shadow-emerald-500/20' :
                                'bg-blue-600/90 text-white border-blue-500/50 shadow-blue-500/20'}
                    `}
                >
                    <div className="shrink-0 mt-0.5">
                        {notif.type === 'error' && <AlertTriangle className="w-5 h-5" />}
                        {notif.type === 'success' && <CheckCircle className="w-5 h-5" />}
                        {notif.type === 'info' && <Info className="w-5 h-5" />}
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-bold tracking-tight">{notif.message}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mt-1">{notif.time}</p>
                    </div>
                    <button
                        onClick={() => setNotifications(prev => prev.filter(n => n.id !== notif.id))}
                        className="shrink-0 opacity-50 hover:opacity-100 transition-opacity"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ))}
        </div>
    );
}
