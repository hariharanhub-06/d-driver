'use client';

import { useState } from 'react';
import { Map as MapIcon, Plus, Route, Navigation } from 'lucide-react';

export default function RoutesPage() {
    const [routes, setRoutes] = useState([
        { id: '1', name: 'Morning Route A', stops: 8, base_fee: 1500, time: '07:00 AM' },
        { id: '2', name: 'Morning Route B', stops: 5, base_fee: 1200, time: '07:30 AM' },
        { id: '3', name: 'Afternoon Route A', stops: 8, base_fee: 1500, time: '03:15 PM' },
    ]);

    return (
        <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)]">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Routes & Stops Configuration</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Design transport routes and allocate student pickup points.</p>
                </div>
                <button className="btn-primary">
                    <Plus className="w-5 h-5 mr-2" />
                    Create New Route
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-[500px]">
                <div className="card lg:col-span-1 overflow-y-auto p-4 space-y-3">
                    <h3 className="font-bold text-lg mb-2">Active Routes</h3>
                    {routes.map(route => (
                        <div key={route.id} className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:border-primary-500 transition-colors cursor-pointer bg-slate-50 dark:bg-slate-800/50">
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-semibold text-primary-600 dark:text-primary-400 flex items-center">
                                    <Route className="w-4 h-4 mr-2 pt-0.5 shrink-0" /> {route.name}
                                </h4>
                                <span className="text-xs bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded text-slate-600 dark:text-slate-300 ml-2 whitespace-nowrap">
                                    {route.time}
                                </span>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center mb-1">
                                <Navigation className="w-4 h-4 mr-2 shrink-0" /> {route.stops} Total Stops
                            </p>
                        </div>
                    ))}
                </div>

                <div className="card lg:col-span-2 p-0 overflow-hidden relative bg-slate-100 dark:bg-slate-800">
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 p-6 text-center">
                        <MapIcon className="w-16 h-16 mb-4 opacity-50 text-slate-400" />
                        <p className="font-medium text-lg text-slate-600 dark:text-slate-300">Interactive Map View</p>
                        <p className="text-sm text-slate-500 max-w-sm text-center mt-2">
                            Select a route from the list to display its path and drop ping points across the map interface.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
