'use client';

import { useState, useEffect } from 'react';
import { User, Check, X, MapPin, ChevronRight, Bell, LayoutDashboard, Map, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

export default function DriverAttendancePage() {
    const [stops, setStops] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentStopIndex, setCurrentStopIndex] = useState(0);
    const [currentStudentIndex, setCurrentStudentIndex] = useState(-1); // -1 means no student pop-up
    const [attendance, setAttendance] = useState<Record<string, string>>({});

    useEffect(() => {
        fetchRouteData();
    }, []);

    const fetchRouteData = async () => {
        try {
            const { data } = await api.get('/routes');
            if (data && data.length > 0) {
                // Focus on the first available route for now
                const route = data[0];
                // Enrich stops with their students
                const enrichedStops = route.stops.map((stop: any) => ({
                    ...stop,
                    students: route.students.filter((s: any) => s.stop_id === stop.id)
                }));
                setStops(enrichedStops);
            } else {
                throw new Error('No routes found');
            }
        } catch (error) {
            console.error('Failed to fetch routes, using mock fallback', error);
            setStops([
                {
                    id: '1', name: 'Main Gate', students: [
                        { id: 's1', name: 'Alex Johnson', photo: null, grade: '4th Grade' },
                        { id: 's2', name: 'Sarah Williams', photo: null, grade: '3rd Grade' }
                    ]
                },
                {
                    id: '2', name: 'Oak Street', students: [
                        { id: 's3', name: 'Ryan Davis', photo: null, grade: '5th Grade' }
                    ]
                },
                {
                    id: '3', name: 'Pine Avenue', students: [
                        { id: 's4', name: 'Emma Wilson', photo: null, grade: '2nd Grade' }
                    ]
                },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const currentStop = stops[currentStopIndex];
    const isLastStop = currentStopIndex === stops.length - 1;

    const handleReachStop = () => {
        if (currentStop?.students?.length > 0) {
            setCurrentStudentIndex(0);
        } else {
            // No students at this stop, just move on
            if (!isLastStop) setCurrentStopIndex(currentStopIndex + 1);
        }
    };

    const handleMarkAttendance = async (studentId: string, status: 'present' | 'absent') => {
        try {
            await api.post('/attendance', { student_id: studentId, status });
            setAttendance(prev => ({ ...prev, [studentId]: status }));
        } catch (error) {
            console.error('Failed to mark attendance', error);
            // Local state update for fallback
            setAttendance(prev => ({ ...prev, [studentId]: status }));
        }

        if (currentStudentIndex < currentStop.students.length - 1) {
            setCurrentStudentIndex(currentStudentIndex + 1);
        } else {
            setCurrentStudentIndex(-1); // Close pop-up
        }
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
        );
    }

    if (!currentStop) return <div className="p-8 text-center text-gray-500">No route data available.</div>;

    return (
        <div className="max-w-md mx-auto h-full flex flex-col pt-4 pb-20 animate-in overflow-y-auto">
            {/* Current Stop Header */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-6 mx-2">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-primary-500 uppercase tracking-widest">Ongoing Route</span>
                    <div className="px-2 py-1 bg-green-100 text-green-700 rounded text-[10px] font-bold">LIVE</div>
                </div>
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary-50 rounded-2xl">
                        <MapPin className="w-6 h-6 text-primary-500" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 leading-tight">{currentStop.name}</h2>
                        <p className="text-sm text-gray-500">Stop {currentStopIndex + 1} of {stops.length}</p>
                    </div>
                </div>
            </div>

            {/* Stop Sequence */}
            <div className="flex-1 px-4 space-y-4">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 mb-2">Morning Stop Sequence</h3>
                {stops.map((stop, index) => (
                    <div
                        key={stop.id}
                        className={cn(
                            "flex items-center gap-4 p-5 rounded-2xl border transition-all duration-300",
                            index === currentStopIndex ? "bg-primary-50 border-primary-200 shadow-md shadow-primary-500/5 rotate-1" :
                                index < currentStopIndex ? "bg-white border-gray-100 opacity-60" : "bg-white border-gray-50"
                        )}
                    >
                        <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                            index < currentStopIndex ? "bg-green-500 text-white" :
                                index === currentStopIndex ? "bg-primary-500 text-white" : "bg-gray-100 text-gray-400"
                        )}>
                            {index < currentStopIndex ? <Check size={18} /> : index + 1}
                        </div>
                        <div className="flex-1">
                            <p className="font-bold text-gray-800">{stop.name}</p>
                            <p className="text-xs text-gray-500">{stop.students?.length || 0} Students to pick up</p>
                        </div>
                        {index === currentStopIndex && (
                            <button
                                onClick={handleReachStop}
                                className="px-5 py-2.5 bg-primary-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-primary-500/20 active:scale-95 transition-transform"
                            >
                                Reached
                            </button>
                        )}
                    </div>
                ))}

                {!isLastStop && currentStudentIndex === -1 && (
                    <button
                        onClick={() => setCurrentStopIndex(currentStopIndex + 1)}
                        className="w-full py-5 mt-8 bg-gray-900 text-white rounded-[2rem] font-bold flex items-center justify-center gap-2 shadow-xl hover:bg-black transition-all active:scale-95"
                    >
                        Next Stop <ChevronRight size={18} />
                    </button>
                )}
            </div>

            {/* Student Pop-up Overlay */}
            {currentStudentIndex !== -1 && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
                    <div className="bg-white w-full max-w-sm rounded-[3rem] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
                        <div className="bg-gradient-to-br from-primary-500 to-emerald-600 p-10 flex flex-col items-center">
                            <div className="w-28 h-28 rounded-full bg-white/20 border-4 border-white/40 flex items-center justify-center mb-6 shadow-inner">
                                <User className="text-white w-14 h-14" />
                            </div>
                            <h3 className="text-3xl font-bold text-white text-center mb-1">{currentStop.students[currentStudentIndex].name}</h3>
                            <p className="text-white/80 font-medium tracking-wide uppercase text-xs">{currentStop.students[currentStudentIndex].grade || 'Student'}</p>
                        </div>
                        <div className="p-10 text-center">
                            <p className="text-gray-500 mb-10 text-lg leading-relaxed">
                                Please confirm attendance for <span className="text-gray-900 font-bold underline decoration-primary-200 underline-offset-4">{currentStop.students[currentStudentIndex].name}</span> at this stop.
                            </p>
                            <div className="grid grid-cols-2 gap-6">
                                <button
                                    onClick={() => handleMarkAttendance(currentStop.students[currentStudentIndex].id, 'absent')}
                                    className="py-6 bg-red-50 text-red-600 rounded-[2rem] font-bold flex flex-col items-center gap-3 border border-red-100 hover:bg-red-100 transition-all hover:scale-105 active:scale-95"
                                >
                                    <X size={28} />
                                    Absent
                                </button>
                                <button
                                    onClick={() => handleMarkAttendance(currentStop.students[currentStudentIndex].id, 'present')}
                                    className="py-6 bg-green-50 text-green-600 rounded-[2rem] font-bold flex flex-col items-center gap-3 border border-green-100 hover:bg-green-100 transition-all hover:scale-105 active:scale-95"
                                >
                                    <Check size={28} />
                                    Present
                                </button>
                            </div>
                        </div>
                        <div className="px-10 pb-10">
                            <button
                                onClick={() => setCurrentStudentIndex(-1)}
                                className="w-full py-4 text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors uppercase tracking-widest"
                            >
                                Skip for now
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Nav Helper */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-100 p-4 flex justify-around items-center md:hidden">
                <div className="p-3 text-primary-500 bg-primary-50 rounded-2xl"><LayoutDashboard size={24} /></div>
                <div className="p-3 text-gray-400 hover:bg-gray-50 rounded-2xl transition-colors"><Map size={24} /></div>
                <div className="p-3 text-gray-400 hover:bg-gray-50 rounded-2xl transition-colors relative">
                    <Bell size={24} />
                    <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                </div>
            </div>
        </div>
    );
}
