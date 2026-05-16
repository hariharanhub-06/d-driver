'use client';

import { useState, useEffect } from 'react';
import { Bus as BusIcon, X, Loader2, ArrowRightLeft } from 'lucide-react';
import api from '@/lib/api';

type BusSwitch = {
    id: string;
    driver?: { user: { name: string } };
    original_bus?: { id: string; bus_number: string };
    new_bus?: { id: string; bus_number: string };
    reason?: string;
    km_at_switch?: number;
    status: 'pending' | 'resolved';
    created_at?: string;
};

type Bus = { id: string; bus_number: string };

const statusBadge = (s: string) => {
    if (s === 'resolved') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
};

export default function BusSwitchesPage() {
    const [switches, setSwitches] = useState<BusSwitch[]>([]);
    const [buses, setBuses] = useState<Bus[]>([]);
    const [loading, setLoading] = useState(true);
    const [assignModal, setAssignModal] = useState<BusSwitch | null>(null);
    const [selectedBusId, setSelectedBusId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => { fetchSwitches(); fetchBuses(); }, []);

    const fetchSwitches = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/bus-switch');
            setSwitches(Array.isArray(data) ? data : []);
        } catch {
            setSwitches([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchBuses = async () => {
        try {
            const { data } = await api.get('/buses');
            setBuses(Array.isArray(data) ? data : []);
        } catch { setBuses([]); }
    };

    const handleAssign = async () => {
        if (!assignModal || !selectedBusId) return;
        setIsSubmitting(true);
        try {
            await api.put(`/bus-switch/${assignModal.id}/assign`, { bus_id: selectedBusId });
            const assignedBus = buses.find(b => b.id === selectedBusId);
            setSwitches(prev => prev.map(s => s.id === assignModal.id
                ? { ...s, status: 'resolved', new_bus: assignedBus ? { id: assignedBus.id, bus_number: assignedBus.bus_number } : s.new_bus }
                : s
            ));
            setAssignModal(null);
            setSelectedBusId('');
        } catch { /* ignore */ }
        setIsSubmitting(false);
    };

    return (
        <div className="space-y-6 animate-in">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Bus Switches</h1>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Handle driver requests to switch buses during routes.</p>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-slate-800">
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">Driver</th>
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">Original Bus</th>
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">New Bus</th>
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">Reason</th>
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">KM at Switch</th>
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                            {loading ? (
                                <tr><td colSpan={8} className="px-6 py-12 text-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" /></td></tr>
                            ) : switches.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-16 text-center text-gray-400">
                                        <ArrowRightLeft className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p className="font-bold">No bus switch requests</p>
                                    </td>
                                </tr>
                            ) : switches.map(sw => (
                                <tr key={sw.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group">
                                    <td className="px-6 py-4 font-medium text-gray-800 dark:text-white">{sw.driver?.user?.name || '—'}</td>
                                    <td className="px-6 py-4">
                                        <span className="flex items-center gap-1.5 text-gray-600 dark:text-slate-300">
                                            <BusIcon className="w-4 h-4 text-gray-400" />
                                            {sw.original_bus?.bus_number || '—'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {sw.new_bus?.bus_number
                                            ? <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                                                <BusIcon className="w-4 h-4" />
                                                {sw.new_bus.bus_number}
                                              </span>
                                            : <span className="text-gray-400 text-xs italic">Not assigned</span>}
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 dark:text-slate-400 max-w-[180px] truncate">{sw.reason || '—'}</td>
                                    <td className="px-6 py-4 text-gray-500 dark:text-slate-400">{sw.km_at_switch ? `${sw.km_at_switch} km` : '—'}</td>
                                    <td className="px-6 py-4 text-xs text-gray-400">{sw.created_at ? new Date(sw.created_at).toLocaleDateString('en-IN') : '—'}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold capitalize ${statusBadge(sw.status)}`}>
                                            {sw.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {sw.status === 'pending' && (
                                            <button
                                                onClick={() => { setAssignModal(sw); setSelectedBusId(''); }}
                                                className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-semibold transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                Assign Bus
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Assign Bus Modal */}
            {assignModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-lg w-full mx-4 shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-black text-gray-900 dark:text-white">Assign Replacement Bus</h2>
                            <button onClick={() => setAssignModal(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl text-gray-400 transition-all"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="mb-4 p-3 bg-gray-50 dark:bg-slate-800 rounded-xl text-sm space-y-1">
                            <p className="text-gray-500 dark:text-slate-400">Driver: <span className="font-bold text-gray-800 dark:text-white">{assignModal.driver?.user?.name}</span></p>
                            <p className="text-gray-500 dark:text-slate-400">Original Bus: <span className="font-bold text-gray-800 dark:text-white">{assignModal.original_bus?.bus_number}</span></p>
                            {assignModal.reason && <p className="text-gray-500 dark:text-slate-400">Reason: <span className="text-gray-700 dark:text-slate-300">{assignModal.reason}</span></p>}
                        </div>
                        <div className="space-y-3">
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Select Replacement Bus</label>
                            <select
                                className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={selectedBusId}
                                onChange={e => setSelectedBusId(e.target.value)}
                            >
                                <option value="">Choose a bus...</option>
                                {buses.filter(b => b.id !== assignModal.original_bus?.id).map(b => (
                                    <option key={b.id} value={b.id}>{b.bus_number}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setAssignModal(null)} className="flex-1 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl font-semibold text-sm hover:bg-gray-50 dark:hover:bg-slate-800 transition-all">Cancel</button>
                            <button
                                onClick={handleAssign}
                                disabled={!selectedBusId || isSubmitting}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
                            >
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Assign Bus'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
