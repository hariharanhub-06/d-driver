'use client';

import { useState, useEffect } from 'react';
import { Droplets, X, Loader2, CheckCircle2, XCircle, Fuel } from 'lucide-react';
import api from '@/lib/api';

type FuelRequest = {
    id: string;
    driver?: { user: { name: string } };
    bus?: { bus_number: string };
    amount_requested?: number;
    current_km?: number;
    reason?: string;
    status: 'pending' | 'approved' | 'rejected' | 'disbursed';
    admin_note?: string;
    created_at?: string;
};

const STATUS_TABS = ['All', 'pending', 'approved', 'rejected', 'disbursed'] as const;

const statusBadge = (s: string) => {
    if (s === 'approved') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    if (s === 'rejected') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    if (s === 'disbursed') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
};

export default function FuelRequestsPage() {
    const [requests, setRequests] = useState<FuelRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<typeof STATUS_TABS[number]>('All');
    const [actionModal, setActionModal] = useState<{ req: FuelRequest; action: 'approve' | 'reject' | 'disburse' } | null>(null);
    const [adminNote, setAdminNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => { fetchRequests(); }, []);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/fuel/requests');
            setRequests(Array.isArray(data) ? data : []);
        } catch {
            setRequests([]);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async () => {
        if (!actionModal) return;
        setIsSubmitting(true);
        const statusMap = { approve: 'approved', reject: 'rejected', disburse: 'disbursed' };
        try {
            await api.put(`/fuel/requests/${actionModal.req.id}`, {
                status: statusMap[actionModal.action],
                admin_note: adminNote,
            });
            setRequests(prev => prev.map(r => r.id === actionModal.req.id
                ? { ...r, status: statusMap[actionModal.action] as FuelRequest['status'], admin_note: adminNote }
                : r
            ));
            setActionModal(null);
            setAdminNote('');
        } catch { /* ignore */ }
        setIsSubmitting(false);
    };

    const filtered = requests.filter(r => tab === 'All' || r.status === tab);

    const actionColors = {
        approve: 'bg-blue-600 hover:bg-blue-700',
        reject: 'bg-red-500 hover:bg-red-600',
        disburse: 'bg-emerald-600 hover:bg-emerald-700',
    };

    return (
        <div className="space-y-6 animate-in">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Fuel Requests</h1>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Review and process driver fuel reimbursement requests.</p>
            </div>

            {/* Table Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
                {/* Status Tabs */}
                <div className="flex gap-1 p-3 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 flex-wrap">
                    {STATUS_TABS.map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all capitalize ${tab === t ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-slate-300'}`}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-slate-800">
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">Driver</th>
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">Bus</th>
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">Amount</th>
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">Current KM</th>
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">Reason</th>
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">Date</th>
                                <th className="px-6 py-3 text-right text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                            {loading ? (
                                <tr><td colSpan={8} className="px-6 py-12 text-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" /></td></tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-16 text-center text-gray-400">
                                        <Fuel className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p className="font-bold">No fuel requests found</p>
                                    </td>
                                </tr>
                            ) : filtered.map(req => (
                                <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group">
                                    <td className="px-6 py-4 font-medium text-gray-800 dark:text-white">{req.driver?.user?.name || '—'}</td>
                                    <td className="px-6 py-4 text-gray-500 dark:text-slate-400">{req.bus?.bus_number || '—'}</td>
                                    <td className="px-6 py-4 font-bold text-gray-800 dark:text-white">₹{req.amount_requested?.toLocaleString() || '—'}</td>
                                    <td className="px-6 py-4 text-gray-500 dark:text-slate-400">{req.current_km ? `${req.current_km} km` : '—'}</td>
                                    <td className="px-6 py-4 text-gray-500 dark:text-slate-400 max-w-[200px] truncate">{req.reason || '—'}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold capitalize ${statusBadge(req.status)}`}>
                                            {req.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-gray-400">{req.created_at ? new Date(req.created_at).toLocaleDateString('en-IN') : '—'}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {req.status === 'pending' && (
                                                <>
                                                    <button onClick={() => { setActionModal({ req, action: 'approve' }); setAdminNote(''); }} className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1">
                                                        <CheckCircle2 className="w-3 h-3" /> Approve
                                                    </button>
                                                    <button onClick={() => { setActionModal({ req, action: 'reject' }); setAdminNote(''); }} className="text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1">
                                                        <XCircle className="w-3 h-3" /> Reject
                                                    </button>
                                                </>
                                            )}
                                            {req.status === 'approved' && (
                                                <button onClick={() => { setActionModal({ req, action: 'disburse' }); setAdminNote(''); }} className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1">
                                                    <Droplets className="w-3 h-3" /> Disburse
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Action Modal */}
            {actionModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-lg w-full mx-4 shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-black text-gray-900 dark:text-white capitalize">{actionModal.action} Request</h2>
                            <button onClick={() => setActionModal(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl text-gray-400 transition-all"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="mb-4 p-3 bg-gray-50 dark:bg-slate-800 rounded-xl text-sm space-y-1">
                            <p className="text-gray-500 dark:text-slate-400">Driver: <span className="font-bold text-gray-800 dark:text-white">{actionModal.req.driver?.user?.name}</span></p>
                            <p className="text-gray-500 dark:text-slate-400">Amount: <span className="font-bold text-gray-800 dark:text-white">₹{actionModal.req.amount_requested?.toLocaleString()}</span></p>
                        </div>
                        <div className="space-y-3">
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Admin Note (optional)</label>
                            <textarea
                                rows={3}
                                placeholder="Add a note for the driver..."
                                className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                value={adminNote}
                                onChange={e => setAdminNote(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setActionModal(null)} className="flex-1 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl font-semibold text-sm hover:bg-gray-50 dark:hover:bg-slate-800 transition-all">Cancel</button>
                            <button
                                onClick={handleAction}
                                disabled={isSubmitting}
                                className={`flex-1 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-60 ${actionColors[actionModal.action]}`}
                            >
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : `Confirm ${actionModal.action}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
