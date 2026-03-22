'use client';

import { useState, useEffect } from 'react';
import { Map as MapIcon, Plus, Route as RouteIcon, Navigation, Edit, IndianRupee } from 'lucide-react';
import api from '@/lib/api';
import Modal from '@/components/ui/Modal';
import { useAuth } from '@/context/AuthContext';

export default function RoutesPage() {
    const { user } = useAuth();
    const [routes, setRoutes] = useState<{ id: string, name: string, school?: { name: string }, stops?: any[] }[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({ name: '', school_id: '' });

    useEffect(() => {
        fetchRoutes();
    }, []);

    const fetchRoutes = async () => {
        try {
            const { data } = await api.get('/routes');
            setRoutes(data);
        } catch {
            console.error('Failed to fetch routes');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateRoute = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload = {
                ...formData,
                school_id: user?.role === 'super_admin' ? formData.school_id : user?.school_id,
                stops: [] // Initially empty, can add stops later in the map view
            };
            await api.post('/routes', payload);
            setIsModalOpen(false);
            setFormData({ name: '', school_id: '' });
            fetchRoutes();
        } catch (error) {
            alert('Failed to create route.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)] animate-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
                <div>
                    <h1 className="display-title text-2xl md:text-3xl font-bold tracking-tight">Routes & Logistics</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Design transport routes and allocate student pickup points.</p>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="btn-primary w-full sm:w-auto">
                    <Plus className="w-5 h-5 mr-2" />
                    Create New Route
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-[500px]">
                <div className="card lg:col-span-1 overflow-y-auto p-4 space-y-3 border-none shadow-lg">
                    <h3 className="font-bold text-lg mb-4 px-2 flex items-center">
                        <RouteIcon className="w-5 h-5 mr-2 text-primary-600" />
                        Active Routes
                        <span className="ml-auto bg-primary-100 text-primary-700 text-xs px-2 py-1 rounded-full">{routes.length}</span>
                    </h3>

                    {loading ? (
                        <div className="p-8 text-center text-slate-400 italic">Loading routes...</div>
                    ) : routes.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">
                            <RouteIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            No routes defined.
                        </div>
                    ) : (
                        routes.map(route => (
                            <div key={route.id} className="border border-slate-100 dark:border-slate-800 rounded-2xl p-4 hover:border-primary-400 hover:shadow-md transition-all cursor-pointer bg-slate-50/50 dark:bg-slate-800/30 group">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-slate-800 dark:text-white flex items-center">
                                        {route.name}
                                    </h4>
                                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-white dark:hover:bg-slate-700 rounded-lg shadow-sm">
                                            <Edit className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center text-xs text-slate-500 space-x-4">
                                    <span className="flex items-center">
                                        <Navigation className="w-3.5 h-3.5 mr-1 text-orange-500" />
                                        {route.stops?.length || 0} Stops
                                    </span>
                                    <span className="flex items-center">
                                        <IndianRupee className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                                        Standard Tariff
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="card lg:col-span-2 p-0 overflow-hidden relative bg-slate-100 dark:bg-slate-900/50 border-none shadow-inner">
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 p-6 text-center">
                        <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-3xl shadow-xl flex items-center justify-center mb-6 animate-bounce duration-3000">
                            <MapIcon className="w-10 h-10 text-primary-500 opacity-60" />
                        </div>
                        <p className="font-bold text-xl text-slate-800 dark:text-white">Interactive Map Engine</p>
                        <p className="text-sm text-slate-500 max-w-sm text-center mt-3 leading-relaxed">
                            Select a route from the dashboard to initialize the spatial visualization and drop waypoint markers.
                        </p>
                        <button className="mt-8 px-6 py-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl shadow-sm hover:shadow-md transition-all text-sm border border-slate-200 dark:border-slate-700">
                            Configure Map API
                        </button>
                    </div>
                </div>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Initialize Route"
            >
                <form onSubmit={handleCreateRoute} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 text-black">Route Label</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. North Sector - Morning Shift"
                            className="input-field"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    {user?.role === 'super_admin' && (
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 text-black">School ID</label>
                            <input
                                type="text"
                                required
                                className="input-field"
                                value={formData.school_id}
                                onChange={(e) => setFormData({ ...formData, school_id: e.target.value })}
                            />
                        </div>
                    )}
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800/30">
                        <p className="text-xs text-blue-700 dark:text-blue-300 flex">
                            <Navigation className="w-4 h-4 mr-2 shrink-0" />
                            Stops and waypoints can be calibrated using the map interface after initializing the route.
                        </p>
                    </div>
                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="flex-1 py-3 px-4 border border-border rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="btn-primary flex-1 bg-primary-600 hover:bg-primary-700 shadow-primary-200"
                        >
                            {isSubmitting ? 'Creating...' : 'Create Route'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
