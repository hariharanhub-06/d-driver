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
    if (s === 'approved') return 'inline-flex items-center bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full px-2.5 py-0.5 text-xs font-medium';
    if (s === 'rejected') return 'inline-flex items-center bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full px-2.5 py-0.5 text-xs font-medium';
    if (s === 'disbursed') return 'inline-flex items-center bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full px-2.5 py-0.5 text-xs font-medium';
    return 'inline-flex items-center bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full px-2.5 py-0.5 text-xs font-medium';
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
            setRequests(Array.isArray(data) ? data : (Array.isArray(data?.requests) ? data.requests : []));
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

    return (
        <div className="space-y-6 animate-in">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Fuel Requests</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Review and process driver fuel reimbursement requests.</p>
                </div>
            </div>

            {/* Table Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                {/* Status Tabs */}
                <div className="flex gap-1 p-3 border-b border-slate-100 dark:border-slate-700 flex-wrap">
                    {STATUS_TABS.map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={tab === t
                                ? 'px-4 py-2 text-sm font-semibold text-[var(--brand)] border-b-2 border-[var(--brand)] capitalize'
                                : 'px-4 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border-b-2 border-transparent capitalize'}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Driver</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Bus</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Amount</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Current KM</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Reason</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={8} className="px-4 py-3">
                                    <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin"></div></div>
                                </td></tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-3">
                                        <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">
                                            <Fuel className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                            <p>No fuel requests found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filtered.map(req => (
                                <tr key={req.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 font-medium">{req.driver?.user?.name || '—'}</td>
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{req.bus?.bus_number || '—'}</td>
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 font-bold">₹{req.amount_requested?.toLocaleString() || '—'}</td>
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{req.current_km ? `${req.current_km} km` : '—'}</td>
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 max-w-[200px] truncate">{req.reason || '—'}</td>
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                        <span className={`${statusBadge(req.status)} capitalize`}>
                                            {req.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{req.created_at ? new Date(req.created_at).toLocaleDateString('en-IN') : '—'}</td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {req.status === 'pending' && (
                                                <>
                                                    <button onClick={() => { setActionModal({ req, action: 'approve' }); setAdminNote(''); }} className="text-xs bg-[var(--brand)] hover:opacity-90 text-white px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1">
                                                        <CheckCircle2 className="w-3 h-3" /> Approve
                                                    </button>
                                                    <button onClick={() => { setActionModal({ req, action: 'reject' }); setAdminNote(''); }} className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white rounded-lg px-3 py-1.5 font-semibold text-xs">
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
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white capitalize">{actionModal.action} Request</h2>
                            <button onClick={() => setActionModal(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-400 transition-all"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl text-sm space-y-1">
                                <p className="text-slate-500 dark:text-slate-400">Driver: <span className="font-bold text-slate-800 dark:text-white">{actionModal.req.driver?.user?.name}</span></p>
                                <p className="text-slate-500 dark:text-slate-400">Amount: <span className="font-bold text-slate-800 dark:text-white">₹{actionModal.req.amount_requested?.toLocaleString()}</span></p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Admin Note (optional)</label>
                                <textarea
                                    rows={3}
                                    placeholder="Add a note for the driver..."
                                    className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors resize-none"
                                    value={adminNote}
                                    onChange={e => setAdminNote(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setActionModal(null)} className="flex-1 flex items-center gap-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-4 py-2.5 font-semibold text-sm justify-center">Cancel</button>
                                <button
                                    onClick={handleAction}
                                    disabled={isSubmitting}
                                    className={`flex-1 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2 ${
                                        actionModal.action === 'reject'
                                            ? 'flex items-center gap-2 bg-red-600 hover:bg-red-500'
                                            : actionModal.action === 'disburse'
                                            ? 'bg-emerald-600 hover:bg-emerald-700'
                                            : 'bg-[var(--brand)] hover:opacity-90'
                                    }`}
                                >
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : `Confirm ${actionModal.action}`}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
