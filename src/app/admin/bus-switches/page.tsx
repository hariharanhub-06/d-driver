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
    if (s === 'resolved') return 'inline-flex items-center bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full px-2.5 py-0.5 text-xs font-medium';
    return 'inline-flex items-center bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full px-2.5 py-0.5 text-xs font-medium';
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
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Bus Switches</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Handle driver requests to switch buses during routes.</p>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Driver</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Original Bus</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">New Bus</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Reason</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">KM at Switch</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={8} className="px-4 py-3">
                                    <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin"></div></div>
                                </td></tr>
                            ) : switches.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-3">
                                        <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">
                                            <ArrowRightLeft className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                            <p>No bus switch requests</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : switches.map(sw => (
                                <tr key={sw.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 font-medium">{sw.driver?.user?.name || '—'}</td>
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                        <span className="flex items-center gap-1.5">
                                            <BusIcon className="w-4 h-4 text-slate-400" />
                                            {sw.original_bus?.bus_number || '—'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                        {sw.new_bus?.bus_number
                                            ? <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                                                <BusIcon className="w-4 h-4" />
                                                {sw.new_bus.bus_number}
                                              </span>
                                            : <span className="text-slate-400 text-xs italic">Not assigned</span>}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 max-w-[180px] truncate">{sw.reason || '—'}</td>
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{sw.km_at_switch ? `${sw.km_at_switch} km` : '—'}</td>
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{sw.created_at ? new Date(sw.created_at).toLocaleDateString('en-IN') : '—'}</td>
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                        <span className={`${statusBadge(sw.status)} capitalize`}>
                                            {sw.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {sw.status === 'pending' && (
                                            <button
                                                onClick={() => { setAssignModal(sw); setSelectedBusId(''); }}
                                                className="text-xs bg-[var(--brand)] hover:opacity-90 text-white px-3 py-1.5 rounded-lg font-semibold transition-all opacity-0 group-hover:opacity-100"
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
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Assign Replacement Bus</h2>
                            <button onClick={() => setAssignModal(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-400 transition-all"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl text-sm space-y-1">
                                <p className="text-slate-500 dark:text-slate-400">Driver: <span className="font-bold text-slate-800 dark:text-white">{assignModal.driver?.user?.name}</span></p>
                                <p className="text-slate-500 dark:text-slate-400">Original Bus: <span className="font-bold text-slate-800 dark:text-white">{assignModal.original_bus?.bus_number}</span></p>
                                {assignModal.reason && <p className="text-slate-500 dark:text-slate-400">Reason: <span className="text-slate-700 dark:text-slate-300">{assignModal.reason}</span></p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Select Replacement Bus</label>
                                <select
                                    className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[var(--brand)] transition-colors"
                                    value={selectedBusId}
                                    onChange={e => setSelectedBusId(e.target.value)}
                                >
                                    <option value="">Choose a bus...</option>
                                    {buses.filter(b => b.id !== assignModal.original_bus?.id).map(b => (
                                        <option key={b.id} value={b.id}>{b.bus_number}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setAssignModal(null)} className="flex-1 flex items-center gap-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-4 py-2.5 font-semibold text-sm justify-center">Cancel</button>
                                <button
                                    onClick={handleAssign}
                                    disabled={!selectedBusId || isSubmitting}
                                    className="flex-1 flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95 justify-center disabled:opacity-50"
                                >
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Assign Bus'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
