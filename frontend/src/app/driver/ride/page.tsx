'use client';

import { MapPin, Navigation, CheckCircle, AlertTriangle, Phone } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

export default function ActiveRide() {
    const [isStarted, setIsStarted] = useState(false);
    const { user } = useAuth();

    const handleSOS = async () => {
        try {
            if (confirm('Are you sure you want to trigger a silent SOS alert?')) {
                await api.post('/notifications', {
                    message: `SOS EMERGENCY: Bus ${user?.name || 'Driver'} is in distress!`,
                    type: 'alert'
                });
                alert('SOS Alert Sent to Administration!');
            }
        } catch {
            alert('Failed to send SOS. Please call emergency services.');
        }
    };


    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col max-w-md mx-auto relative shadow-2xl overflow-hidden">
            {/* PWA Mobile Header */}
            <div className="bg-primary-600 text-white p-4 pt-8 shrink-0 relative z-10 shadow-md">
                <h1 className="text-xl font-bold">Morning Route A</h1>
                <p className="text-primary-100 text-sm">42 Students • 8 Stops</p>
            </div>

            {/* Map Placeholder */}
            <div className="flex-1 bg-slate-200 dark:bg-slate-800 relative">
                <div className="absolute inset-0 flex items-center justify-center flex-col text-slate-400 dark:text-slate-500">
                    <MapPin className="w-12 h-12 mb-2 opacity-50" />
                    <p className="text-sm font-medium">Google Maps Navigation UI</p>
                </div>

                {/* Floating SOS */}
                <button
                    onClick={handleSOS}
                    className="absolute top-4 right-4 w-12 h-12 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 z-20"
                >
                    <AlertTriangle className="w-6 h-6" />
                </button>
            </div>

            {/* Bottom Sheet UI */}
            <div className="bg-white dark:bg-slate-800 rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)] p-6 shrink-0 relative z-20">
                <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-6"></div>

                <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center mb-4">
                    <Navigation className="w-5 h-5 mr-2 text-primary-500" />
                    Next Stop: Central Library
                </h2>

                <div className="flex justify-between items-center mb-6">
                    <div className="flex -space-x-2">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white dark:border-slate-800 flex items-center justify-center text-xs font-bold text-slate-600">
                                S{i}
                            </div>
                        ))}
                        <div className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center text-xs font-bold text-white bg-primary-500 z-10">
                            +4
                        </div>
                    </div>
                    <span className="text-sm font-medium text-slate-500">8 mins away</span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                    <button className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 py-3 rounded-xl font-medium flex justify-center items-center transition-colors">
                        <Phone className="w-4 h-4 mr-2" />
                        Contact
                    </button>
                    <button className="bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 text-emerald-700 py-3 rounded-xl font-medium flex justify-center items-center transition-colors">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Attendance
                    </button>
                </div>

                <button
                    onClick={() => setIsStarted(!isStarted)}
                    className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-all outline-none text-white ${isStarted ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30' : 'bg-primary-600 hover:bg-primary-700 shadow-primary-600/30'}`}
                >
                    {isStarted ? 'End Ride' : 'Start Ride'}
                </button>
            </div>
        </div>
    );
}
