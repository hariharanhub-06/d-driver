'use client';

import { useState, useEffect } from 'react';
import { MapPin, Plus, Trash2, Edit, Search, Navigation, Clock, X } from 'lucide-react';
import api from '@/lib/api';
import Modal from '@/components/ui/Modal';
import { useAuth } from '@/context/AuthContext';

const MOCK_STOPS = [
    { id: '1', name: 'Main Gate – School Entrance', route: { name: 'North Loop' }, pickup_time: '07:15 AM', drop_time: '03:45 PM', students_count: 12 },
    { id: '2', name: 'Oak Street Junction', route: { name: 'North Loop' }, pickup_time: '07:05 AM', drop_time: '03:55 PM', students_count: 8 },
    { id: '3', name: 'Pine Avenue', route: { name: 'South Express' }, pickup_time: '07:20 AM', drop_time: '03:40 PM', students_count: 15 },
    { id: '4', name: 'Market Square', route: { name: 'South Express' }, pickup_time: '07:30 AM', drop_time: '03:30 PM', students_count: 6 },
    { id: '5', name: 'Green Park Colony', route: { name: 'East Connect' }, pickup_time: '07:10 AM', drop_time: '03:50 PM', students_count: 10 },
];

export default function StopsPage() {
    const { user } = useAuth();
    const [stops, setStops] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({ name: '', pickup_time: '07:00', drop_time: '15:30', route_id: '', lat: '', lng: '' });

    useEffect(() => { fetchStops(); }, []);

    const fetchStops = async () => {
        try {
            const { data } = await api.get('/stops', { params: { school_id: user?.school_id } });
            setStops(data || []);
        } catch {
            console.error('Failed to fetch stops');
            setStops([]);
        } finally {
            setLoading(false);
        }
    };

    const handleAddStop = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await api.post('/stops', { ...formData, school_id: user?.school_id });
            setIsModalOpen(false);
            fetchStops();
        } catch {
            // Mock: add locally
            setStops(prev => [...prev, { id: Date.now().toString(), ...formData, route: { name: 'Unassigned' }, students_count: 0 }]);
            setIsModalOpen(false);
        } finally {
            setIsSubmitting(false);
            setFormData({ name: '', pickup_time: '07:00', drop_time: '15:30', route_id: '', lat: '', lng: '' });
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Remove this stop?')) {
            try {
                await api.delete(`/stops/${id}`);
                setStops(prev => prev.filter(s => s.id !== id));
            } catch {
                alert('Failed to delete stop.');
            }
        }
    };

    const filtered = stops.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.route?.name?.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="space-y-6 animate-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="display-title text-2xl md:text-3xl">Stops & Waypoints</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage all bus stops, pickup times, and student boarding points.</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <input
                        type="file"
                        id="stops-upload"
                        className="hidden"
                        accept=".csv, .xlsx, .xls"
                        onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const formData = new FormData();
                            formData.append('file', file);
                            formData.append('school_id', user?.school_id || '');
                            try {
                                setLoading(true);
                                await api.post('/stops/bulk-import', formData);
                                alert('Stops imported successfully!');
                                fetchStops();
                            } catch (err) {
                                alert('Import failed. Please check the file format.');
                            } finally {
                                setLoading(false);
                            }
                        }}
                    />
                    <button onClick={() => document.getElementById('stops-upload')?.click()} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-all">
                        Bulk Import
                    </button>
                    <button onClick={() => setIsModalOpen(true)} className="btn-primary flex-1 sm:flex-initial text-xs py-2 px-4">
                        <Plus className="w-4 h-4 mr-2" /> Add Stop
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Stops', value: stops.length, icon: MapPin, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-900/20' },
                    { label: 'Active Routes', value: Array.from(new Set(stops.map(s => s.route?.name).filter(Boolean))).length, icon: Navigation, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                    { label: 'Morning Pickups', value: stops.length, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                    { label: 'Students Boarding', value: stops.reduce((acc, s) => acc + (s.students_count || 0), 0), icon: MapPin, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                ].map(stat => (
                    <div key={stat.label} className="card flex items-center gap-4 py-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.bg}`}>
                            <stat.icon className={`w-5 h-5 ${stat.color}`} />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-slate-900 dark:text-white">{stat.value}</p>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="card p-0 overflow-hidden border-none shadow-xl">
                <div className="p-4 border-b border-border bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="relative max-w-sm">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" placeholder="Search stops or routes..." className="input-field pl-10 py-2 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-medium border-b border-border">
                            <tr>
                                <th className="px-6 py-4">Stop Name</th>
                                <th className="px-6 py-4">Route</th>
                                <th className="px-6 py-4">Pickup</th>
                                <th className="px-6 py-4">Drop</th>
                                <th className="px-6 py-4">Students</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400"><MapPin className="w-12 h-12 mx-auto mb-3 opacity-20" /><p>No stops found.</p></td></tr>
                            ) : filtered.map(stop => (
                                <tr key={stop.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center shrink-0">
                                                <MapPin className="w-4 h-4 text-primary-600" />
                                            </div>
                                            <span className="font-bold text-slate-800 dark:text-white">{stop.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-lg text-xs font-bold">{stop.route?.name || '—'}</span>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-xs text-emerald-600 font-bold">{stop.pickup_time}</td>
                                    <td className="px-6 py-4 font-mono text-xs text-amber-600 font-bold">{stop.drop_time}</td>
                                    <td className="px-6 py-4">
                                        <span className="font-bold text-slate-700 dark:text-slate-300">{stop.students_count ?? 0}</span>
                                        <span className="text-xs text-slate-400 ml-1">students</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"><Edit className="w-4 h-4" /></button>
                                            <button onClick={() => handleDelete(stop.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="modal-container-compact">
                        <div className="px-6 pt-6 pb-0 flex items-center justify-between mb-4">
                            <h2 className="text-lg font-black">Add Bus Stop</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400"><X size={16} /></button>
                        </div>
                        <form onSubmit={handleAddStop} className="px-6 pb-6 space-y-3.5">
                            <div>
                                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Stop Name</label>
                                <input required type="text" className="input-field" placeholder="e.g. Oak Street Junction" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Pickup Time</label>
                                    <input type="time" className="input-field" value={formData.pickup_time} onChange={e => setFormData({ ...formData, pickup_time: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Drop Time</label>
                                    <input type="time" className="input-field" value={formData.drop_time} onChange={e => setFormData({ ...formData, drop_time: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Latitude (optional)</label>
                                    <input type="text" className="input-field" placeholder="12.9716" value={formData.lat} onChange={e => setFormData({ ...formData, lat: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Longitude (optional)</label>
                                    <input type="text" className="input-field" placeholder="77.5946" value={formData.lng} onChange={e => setFormData({ ...formData, lng: e.target.value })} />
                                </div>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 border border-border rounded-xl font-bold text-xs">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 text-xs py-2.5">{isSubmitting ? 'Saving...' : 'Add Stop'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
