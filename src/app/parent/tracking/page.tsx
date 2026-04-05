'use client';

import { MapPin, Navigation, Bus, Clock, Bell, Settings, MessageSquare, ChevronRight, User, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { socket, connectSocket } from '@/lib/socket';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

const FreeMap = dynamic(() => import('@/components/ui/FreeMap'), { ssr: false });

export default function ParentTracking() {
    const [busPosition, setBusPosition] = useState<[number, number]>([12.9716, 77.5946]); // Default: Bangalore, India
    const [isStopRequestOpen, setIsStopRequestOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [childData, setChildData] = useState<any>(null);
    const [busId, setBusId] = useState<string | null>(null);

    useEffect(() => {
        fetchParentData();
    }, []);

    const fetchParentData = async () => {
        try {
            // In our ERP, a parent might have multiple children. We'll track the first one for the main view.
            const { data } = await api.get('/students');
            if (data && data.length > 0) {
                const student = data[0];
                setChildData(student);

                // Fetch the bus assigned to this student's route/driver
                if (student.route_id) {
                    const { data: routes } = await api.get('/routes');
                    const route = routes.find((r: any) => r.id === student.route_id);
                    if (route) {
                        // For the MVP, we assume a bus is linked to the route or driver
                        // Real logic would be more complex, but we'll use a placeholder busId if not found
                        const foundBusId = route.bus_id || '12';
                        setBusId(foundBusId);

                        // Initial location fetch
                        const { data: loc } = await api.get(`/location/${foundBusId}`);
                        if (loc) setBusPosition([loc.latitude, loc.longitude]);

                        // Connect socket for live updates
                        connectSocket(foundBusId);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to fetch tracking data, using mock', error);
            setBusId('12');
            setChildData({ name: 'Alex Johnson', stop: { name: 'Oak Street' } });
            // Fallback connection
            connectSocket('12');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!busId) return;

        const handleLocationUpdate = (data: { lat: number; lng: number }) => {
            setBusPosition([data.lat, data.lng]);
        };

        socket.on('location-updated', handleLocationUpdate);

        return () => {
            socket.off('location-updated', handleLocationUpdate);
        };
    }, [busId]);

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-900">
                <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen relative bg-slate-50 overflow-hidden">
            {/* Map Background */}
            <div className="absolute inset-0 z-0">
                <FreeMap
                    center={busPosition}
                    zoom={15}
                    markers={[
                        { position: busPosition, title: `School Bus ${busId}` },
                        { position: [-33.8750, 151.2150], title: 'Home Stop', description: childData?.stop?.name || 'Oak Street' }
                    ]}
                />
            </div>

            {/* Top Navigation / Dashboard Header */}
            <div className="absolute top-6 left-6 right-6 z-10 flex gap-4">
                <div className="flex-1 bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl p-5 border border-white/40 flex items-center gap-5">
                    <div className="w-14 h-14 bg-primary-500 text-white rounded-2xl flex items-center justify-center shadow-2xl shadow-primary-500/40">
                        <Bus size={28} />
                    </div>
                    <div className="flex-1">
                        <h4 className="font-extrabold text-gray-900 text-lg leading-tight">Bus #{busId || '12'} - {childData?.name || 'Student'}'s Route</h4>
                        <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full uppercase tracking-widest">Live</span>
                            <p className="text-xs text-gray-500 font-bold flex items-center gap-1.5">
                                <Clock size={12} className="text-gray-400" />
                                ETA: 08:15 AM
                            </p>
                        </div>
                    </div>
                </div>
                <button className="w-16 h-16 bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl flex items-center justify-center border border-white/40 text-gray-600 hover:text-primary-500 transition-all hover:scale-105 active:scale-95">
                    <Bell size={28} />
                </button>
            </div>

            {/* Bottom Floating Control Panel */}
            <div className="absolute bottom-8 left-6 right-6 z-10 space-y-4">
                {/* Route Progress Visualizer */}
                <div className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] p-8 border border-white/40">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h5 className="font-extrabold text-gray-900 text-xl mb-1">Next Stop: {childData?.stop?.name || 'Oak Street'}</h5>
                            <p className="text-sm text-gray-500 font-medium">Approx. 4 minutes away from your location</p>
                        </div>
                        <div className="w-10 h-10 bg-green-50 text-green-600 rounded-full flex items-center justify-center">
                            <Navigation size={20} />
                        </div>
                    </div>

                    <div className="relative h-2 bg-gray-100 rounded-full mb-10 overflow-hidden">
                        <div className="absolute h-full bg-gradient-to-r from-primary-500 to-emerald-500 rounded-full w-[72%] shadow-[0_0_15px_rgba(45,188,117,0.4)] transition-all duration-1000"></div>
                        <div className="absolute -top-1 left-[72%] w-4 h-4 bg-white border-4 border-primary-500 rounded-full shadow-lg transition-all duration-1000"></div>
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                        <button
                            onClick={() => setIsStopRequestOpen(true)}
                            className="bg-gray-900 text-white py-5 rounded-[1.5rem] font-bold flex items-center justify-center gap-3 hover:bg-black transition-all hover:shadow-xl hover:shadow-black/10 active:scale-95"
                        >
                            <MapPin size={20} className="text-primary-400" />
                            Stop Request
                        </button>
                        <button className="bg-white text-gray-900 border border-gray-200 py-5 rounded-[1.5rem] font-bold flex items-center justify-center gap-3 hover:bg-gray-50 transition-all active:scale-95">
                            <MessageSquare size={20} className="text-primary-500" />
                            Chat Driver
                        </button>
                    </div>
                </div>
            </div>

            {/* Stop Request Overlay */}
            {isStopRequestOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-end justify-center">
                    <div className="bg-white w-full max-w-xl rounded-t-[3.5rem] p-10 shadow-2xl animate-in slide-in-from-bottom duration-500">
                        <div className="w-16 h-1.5 bg-gray-200 rounded-full mx-auto mb-10"></div>
                        <div className="flex items-center gap-4 mb-3">
                            <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center">
                                <Navigation size={24} />
                            </div>
                            <h3 className="text-3xl font-black text-gray-900">Request Stop Change</h3>
                        </div>
                        <p className="text-gray-500 mb-10 text-lg">Modify the pickup or drop-off point for <span className="text-gray-900 font-bold">{childData?.name}</span>.</p>

                        <div className="space-y-5 mb-10">
                            <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 flex items-center justify-between group cursor-pointer hover:border-primary-500/50 hover:bg-white transition-all">
                                <div className="flex items-center gap-5">
                                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center border border-gray-100 group-hover:bg-primary-50 transition-colors shadow-sm">
                                        <Clock className="text-gray-400 group-hover:text-primary-500" size={24} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 text-lg">Temporary Change</p>
                                        <p className="text-xs text-gray-400 font-medium tracking-wide">Valid for today only</p>
                                    </div>
                                </div>
                                <ChevronRight size={24} className="text-gray-300 group-hover:text-primary-500" />
                            </div>
                            <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 flex items-center justify-between group cursor-pointer hover:border-primary-500/50 hover:bg-white transition-all">
                                <div className="flex items-center gap-5">
                                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center border border-gray-100 group-hover:bg-primary-50 transition-colors shadow-sm">
                                        <MapPin className="text-gray-400 group-hover:text-primary-500" size={24} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 text-lg">Permanent Change</p>
                                        <p className="text-xs text-gray-400 font-medium tracking-wide">Update home address/stop</p>
                                    </div>
                                </div>
                                <ChevronRight size={24} className="text-gray-300 group-hover:text-primary-500" />
                            </div>
                        </div>

                        <button
                            onClick={() => setIsStopRequestOpen(false)}
                            className="w-full py-5 bg-gray-100 text-gray-700 rounded-2xl font-extrabold text-lg transition-colors hover:bg-gray-200"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
