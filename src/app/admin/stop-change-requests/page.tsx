'use client';

import { useState, useEffect } from 'react';
import { MapPin, X, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import api from '@/lib/api';

type StopChangeRequest = {
    id: string;
    student?: { name: string };
    current_stop?: { name: string };
    requested_stop?: { name: string };
    change_type?: string;
    effective_date?: string;
    reason?: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at?: string;
};

const statusBadge = (s: string) => {
    if (s === 'approved') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    if (s === 'rejected') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
};

export default function StopChangeRequestsPage() {
    const [requests, setRequests] = useState<StopChangeRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [rejectModal, setRejectModal] = useState<StopChangeRequest | null>(null);
    const [adminNote, setAdminNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [approvingId, setApprovingId] = useState<string | null>(null);

    useEffect(() => { fetchRequests(); }, []);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/stop-change');
            setRequests(Array.isArray(data) ? data : []);
        } catch {
            setRequests([]);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (req: StopChangeRequest) => {
        setApprovingId(req.id);
        try {
            await api.put(`/stop-change/${req.id}/approve`);
            setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'approved' } : r));
        } catch { /* ignore */ }
        setApprovingId(null);
    };

    const handleReject = async () => {
        if (!rejectModal) return;
        setIsSubmitting(true);
        try {
            await api.put(`/stop-change/${rejectModal.id}/reject`, { admin_note: adminNote });
            setRequests(prev => prev.map(r => r.id === rejectModal.id ? { ...r, status: 'rejected' } : r));
            setRejectModal(null);
            setAdminNote('');
        } catch { /* ignore */ }
        setIsSubmitting(false);
    };

    return (
        <div className="space-y-6 animate-in">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Stop Change Requests</h1>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Review parent requests to change student pickup / drop-off stops.</p>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-slate-800">
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">Student</th>
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">Current Stop</th>
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">Requested Stop</th>
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">Type</th>
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">Effective Date</th>
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">Reason</th>
                                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs uppercase text-gray-500 dark:text-slate-400 font-bold tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                            {loading ? (
                                <tr><td colSpan={8} className="px-6 py-12 text-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" /></td></tr>
                            ) : requests.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-16 text-center text-gray-400">
                                        <MapPin className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p className="font-bold">No stop change requests</p>
                                    </td>
                                </tr>
                            ) : requests.map(req => (
                                <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group">
                                    <td className="px-6 py-4 font-medium text-gray-800 dark:text-white">{req.student?.name || '—'}</td>
                                    <td className="px-6 py-4">
                                        <span className="flex items-center gap-1.5 text-gray-500 dark:text-slate-400">
                                            <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                            {req.current_stop?.name || '—'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium">
                                            <MapPin className="w-3.5 h-3.5" />
                                            {req.requested_stop?.name || '—'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 rounded-full text-xs font-bold capitalize">
                                            {req.change_type || '—'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-gray-400">
                                        {req.effective_date ? new Date(req.effective_date).toLocaleDateString('en-IN') : '—'}
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 dark:text-slate-400 max-w-[160px] truncate">{req.reason || '—'}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold capitalize ${statusBadge(req.status)}`}>
                                            {req.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {req.status === 'pending' && (
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleApprove(req)}
                                                    disabled={approvingId === req.id}
                                                    className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1 disabled:opacity-60"
                                                >
                                                    {approvingId === req.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => { setRejectModal(req); setAdminNote(''); }}
                                                    className="text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1"
                                                >
                                                    <XCircle className="w-3 h-3" /> Reject
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Reject Modal */}
            {rejectModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-lg w-full mx-4 shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-black text-gray-900 dark:text-white">Reject Request</h2>
                            <button onClick={() => setRejectModal(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl text-gray-400 transition-all"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="mb-4 p-3 bg-gray-50 dark:bg-slate-800 rounded-xl text-sm space-y-1">
                            <p className="text-gray-500 dark:text-slate-400">Student: <span className="font-bold text-gray-800 dark:text-white">{rejectModal.student?.name}</span></p>
                            <p className="text-gray-500 dark:text-slate-400">Requested: <span className="font-bold text-gray-800 dark:text-white">{rejectModal.requested_stop?.name}</span></p>
                        </div>
                        <div className="space-y-3">
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Reason for Rejection</label>
                            <textarea
                                rows={3}
                                placeholder="Explain why this request is being rejected..."
                                className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                value={adminNote}
                                onChange={e => setAdminNote(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setRejectModal(null)} className="flex-1 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl font-semibold text-sm hover:bg-gray-50 dark:hover:bg-slate-800 transition-all">Cancel</button>
                            <button
                                onClick={handleReject}
                                disabled={isSubmitting}
                                className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-60"
                            >
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Confirm Rejection'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
