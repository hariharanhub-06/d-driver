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
    if (s === 'approved') return 'inline-flex items-center bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full px-2.5 py-0.5 text-xs font-medium';
    if (s === 'rejected') return 'inline-flex items-center bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full px-2.5 py-0.5 text-xs font-medium';
    return 'inline-flex items-center bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full px-2.5 py-0.5 text-xs font-medium';
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
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Stop Change Requests</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Review parent requests to change student pickup / drop-off stops.</p>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Student</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Current Stop</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Requested Stop</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Type</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Effective Date</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Reason</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={8} className="px-4 py-3">
                                    <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin"></div></div>
                                </td></tr>
                            ) : requests.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-3">
                                        <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">
                                            <MapPin className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                            <p>No stop change requests</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : requests.map(req => (
                                <tr key={req.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 font-medium">{req.student?.name || '—'}</td>
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                        <span className="flex items-center gap-1.5">
                                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                            {req.current_stop?.name || '—'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                        <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium">
                                            <MapPin className="w-3.5 h-3.5" />
                                            {req.requested_stop?.name || '—'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                        <span className="inline-flex items-center bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize">
                                            {req.change_type || '—'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                        {req.effective_date ? new Date(req.effective_date).toLocaleDateString('en-IN') : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 max-w-[160px] truncate">{req.reason || '—'}</td>
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                        <span className={`${statusBadge(req.status)} capitalize`}>
                                            {req.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
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
                                                    className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white rounded-lg px-3 py-1.5 font-semibold text-xs"
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
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Reject Request</h2>
                            <button onClick={() => setRejectModal(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-400 transition-all"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl text-sm space-y-1">
                                <p className="text-slate-500 dark:text-slate-400">Student: <span className="font-bold text-slate-800 dark:text-white">{rejectModal.student?.name}</span></p>
                                <p className="text-slate-500 dark:text-slate-400">Requested: <span className="font-bold text-slate-800 dark:text-white">{rejectModal.requested_stop?.name}</span></p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Reason for Rejection</label>
                                <textarea
                                    rows={3}
                                    placeholder="Explain why this request is being rejected..."
                                    className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors resize-none"
                                    value={adminNote}
                                    onChange={e => setAdminNote(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setRejectModal(null)} className="flex-1 flex items-center gap-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-4 py-2.5 font-semibold text-sm justify-center">Cancel</button>
                                <button
                                    onClick={handleReject}
                                    disabled={isSubmitting}
                                    className="flex-1 flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white rounded-xl px-4 py-2.5 font-semibold text-sm justify-center disabled:opacity-60"
                                >
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Rejection'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
