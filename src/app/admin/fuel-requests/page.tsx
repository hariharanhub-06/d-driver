'use client';

import { useState, useEffect } from 'react';
import { Droplets, X, Loader2, CheckCircle2, XCircle, Fuel, Banknote, CreditCard, Clock, Gauge, Bus } from 'lucide-react';
import api from '@/lib/api';

type FuelRequest = {
    id: string;
    bus_id?: string;
    driver?: { user: { name: string } };
    bus?: { bus_number: string; fuel_liters?: number | null };
    amount_requested?: number;
    current_km?: number;
    reason?: string;
    status: 'pending' | 'approved' | 'rejected' | 'disbursed';
    admin_note?: string;
    payment_method?: string;
    transfer_id?: string;
    created_at?: string;
};

type BusFuelSummary = {
    bus_id: string;
    bus_number: string;
    current_fuel_liters: number;
    total_disbursed: number;
    total_approved: number;
    total_pending: number;
    total_liters_filled: number;
    fill_count: number;
    last_fill_at: string | null;
    last_fill_liters: number | null;
};

type FillEntry = {
    id: string;
    bus_id?: string;
    bus?: { bus_number: string };
    liters_filled: number;
    filled_at?: string;
    km_at_fill?: number | null;
    driver?: { user: { name: string } };
};

const STATUS_TABS = ['All', 'pending', 'approved', 'rejected', 'disbursed'] as const;

const statusBadge = (s: string) => {
    if (s === 'approved') return 'inline-flex items-center bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full px-2.5 py-0.5 text-xs font-medium';
    if (s === 'rejected') return 'inline-flex items-center bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full px-2.5 py-0.5 text-xs font-medium';
    if (s === 'disbursed') return 'inline-flex items-center bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full px-2.5 py-0.5 text-xs font-medium';
    return 'inline-flex items-center bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full px-2.5 py-0.5 text-xs font-medium';
};

const fmtDateTime = (s?: string) => {
    if (!s) return '—';
    try {
        return new Date(s).toLocaleString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true,
        });
    } catch { return '—'; }
};

export default function FuelRequestsPage() {
    const [requests, setRequests] = useState<FuelRequest[]>([]);
    const [fillEntries, setFillEntries] = useState<FillEntry[]>([]);
    const [busSummaries, setBusSummaries] = useState<BusFuelSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<typeof STATUS_TABS[number]>('All');
    const [actionModal, setActionModal] = useState<{ req: FuelRequest; action: 'approve' | 'reject' } | null>(null);
    const [adminNote, setAdminNote] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'account_transfer'>('cash');
    const [transferId, setTransferId] = useState('');
    const [transferIdError, setTransferIdError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => { fetchRequests(); }, []);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const [reqRes, fillRes, summaryRes] = await Promise.allSettled([
                api.get('/fuel/requests'),
                api.get('/fuel/fills'),
                api.get('/fuel/bus-summary'),
            ]);
            if (reqRes.status === 'fulfilled') {
                const d = reqRes.value.data;
                setRequests(Array.isArray(d) ? d : (Array.isArray(d?.requests) ? d.requests : []));
            }
            if (fillRes.status === 'fulfilled') {
                const d = fillRes.value.data;
                setFillEntries(Array.isArray(d) ? d : []);
            }
            if (summaryRes.status === 'fulfilled') {
                const d = summaryRes.value.data;
                setBusSummaries(Array.isArray(d) ? d : []);
            }
        } catch {
            setRequests([]);
        } finally {
            setLoading(false);
        }
    };

    const openModal = (req: FuelRequest, action: 'approve' | 'reject') => {
        setActionModal({ req, action });
        setAdminNote('');
        setPaymentMethod('cash');
        setTransferId('');
        setTransferIdError('');
    };

    const handleAction = async () => {
        if (!actionModal) return;

        if (actionModal.action === 'approve' && paymentMethod === 'account_transfer' && !transferId.trim()) {
            setTransferIdError('Transfer ID is required for account transfer.');
            return;
        }

        setIsSubmitting(true);
        // Approve = disburse in one step (admin picks payment method when approving,
        // which means they're handing over the money at the same time)
        const statusMap = { approve: 'disbursed', reject: 'rejected' };
        try {
            const payload: Record<string, string | undefined> = {
                status: statusMap[actionModal.action],
                admin_note: adminNote || undefined,
            };
            if (actionModal.action === 'approve') {
                payload.payment_method = paymentMethod;
                if (paymentMethod === 'account_transfer') payload.transfer_id = transferId.trim();
            }
            await api.put(`/fuel/requests/${actionModal.req.id}`, payload);
            setRequests(prev => prev.map(r => r.id === actionModal.req.id
                ? { ...r, status: statusMap[actionModal.action] as FuelRequest['status'], admin_note: adminNote }
                : r
            ));
            setActionModal(null);
        } catch { /* ignore */ }
        setIsSubmitting(false);
    };

    const filtered = requests.filter(r => tab === 'All' || r.status === tab);

    const totalDisbursed = requests
        .filter(r => r.status === 'disbursed')
        .reduce((sum, r) => sum + (r.amount_requested || 0), 0);
    const totalApproved = requests
        .filter(r => r.status === 'approved')
        .reduce((sum, r) => sum + (r.amount_requested || 0), 0);
    const totalPending = requests
        .filter(r => r.status === 'pending')
        .reduce((sum, r) => sum + (r.amount_requested || 0), 0);
    const totalLitersLogged = fillEntries.reduce((sum, f) => sum + (f.liters_filled || 0), 0);

    // Find most recent fill for a given bus_id
    const lastFillFor = (busId?: string): FillEntry | undefined => {
        if (!busId) return undefined;
        return fillEntries
            .filter(f => f.bus_id === busId)
            .sort((a, b) => new Date(b.filled_at || '').getTime() - new Date(a.filled_at || '').getTime())[0];
    };

    return (
        <div className="space-y-6 animate-in">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Fuel Requests</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Review driver fuel requests. Drivers log fills themselves.</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 shadow-sm">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Disbursed</p>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">₹{totalDisbursed.toLocaleString('en-IN')}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Funds given out</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 shadow-sm">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Fuel Logged</p>
                    <p className="text-2xl font-bold text-[var(--brand)]">{totalLitersLogged.toFixed(1)} L</p>
                    <p className="text-xs text-slate-400 mt-0.5">{fillEntries.length} fill{fillEntries.length !== 1 ? 's' : ''} recorded</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 shadow-sm">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Approved</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">₹{totalApproved.toLocaleString('en-IN')}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Approved, not yet disbursed</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 shadow-sm">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Awaiting Approval</p>
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">₹{totalPending.toLocaleString('en-IN')}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{requests.filter(r => r.status === 'pending').length} pending</p>
                </div>
            </div>

            {/* Per-Bus Fuel Status */}
            {busSummaries.length > 0 && (
                <div>
                    <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">Per Bus Status</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {busSummaries.map(b => {
                            const hasPending = b.total_pending > 0;
                            const hasApproved = b.total_approved > 0;
                            return (
                                <div key={b.bus_id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 shadow-sm space-y-3">
                                    {/* Bus header */}
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-9 h-9 rounded-xl bg-[var(--brand)]/10 flex items-center justify-center shrink-0">
                                            <Bus className="w-4 h-4 text-[var(--brand)]" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-white text-sm">Bus #{b.bus_number}</p>
                                            <p className="text-xs text-slate-400">{b.fill_count} fill{b.fill_count !== 1 ? 's' : ''} logged</p>
                                        </div>
                                        {hasPending && (
                                            <span className="ml-auto text-[10px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full">Pending</span>
                                        )}
                                    </div>

                                    {/* Fuel level bar */}
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-xs text-slate-500 dark:text-slate-400">Fuel Level</span>
                                            <span className="text-xs font-bold text-slate-800 dark:text-white">{b.current_fuel_liters.toFixed(1)} L</span>
                                        </div>
                                        <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-[var(--brand)] transition-all"
                                                style={{ width: `${Math.min((b.current_fuel_liters / Math.max(b.total_liters_filled, 60)) * 100, 100)}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Stats grid */}
                                    <div className="grid grid-cols-2 gap-2 pt-1">
                                        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl px-3 py-2">
                                            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Disbursed</p>
                                            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">₹{b.total_disbursed.toLocaleString('en-IN')}</p>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl px-3 py-2">
                                            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Total Filled</p>
                                            <p className="text-sm font-bold text-[var(--brand)]">{b.total_liters_filled.toFixed(1)} L</p>
                                        </div>
                                        {hasApproved && (
                                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl px-3 py-2 col-span-2">
                                                <p className="text-[10px] text-blue-500 uppercase tracking-wide">Approved (awaiting disbursement)</p>
                                                <p className="text-sm font-bold text-blue-600 dark:text-blue-400">₹{b.total_approved.toLocaleString('en-IN')}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Last fill */}
                                    {b.last_fill_at && (
                                        <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-700">
                                            <Clock className="w-3 h-3 shrink-0" />
                                            <span>Last fill: <span className="font-medium text-slate-600 dark:text-slate-300">{b.last_fill_liters?.toFixed(1)}L</span> on {new Date(b.last_fill_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Table Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
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
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Reason</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Requested</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Fill Info</th>
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
                            ) : filtered.map(req => {
                                const fill = lastFillFor(req.bus_id);
                                return (
                                    <tr key={req.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 font-medium">{req.driver?.user?.name || '—'}</td>
                                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{req.bus?.bus_number || '—'}</td>
                                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 font-bold">₹{req.amount_requested?.toLocaleString() || '—'}</td>
                                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 max-w-[180px] truncate">{req.reason || '—'}</td>
                                        <td className="px-4 py-3 text-sm">
                                            <span className={`${statusBadge(req.status)} capitalize`}>{req.status}</span>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                            {fmtDateTime(req.created_at)}
                                        </td>
                                        {/* Fill info — shows when driver filled + current balance */}
                                        <td className="px-4 py-3">
                                            {fill ? (
                                                <div className="space-y-0.5">
                                                    <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                                        <Clock className="w-3 h-3 shrink-0" />
                                                        {fmtDateTime(fill.filled_at)}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                                        <span className="font-semibold text-slate-700 dark:text-slate-300">{fill.liters_filled}L filled</span>
                                                        {req.bus?.fuel_liters != null && (
                                                            <span className="flex items-center gap-1">
                                                                <Gauge className="w-3 h-3 text-blue-400" />
                                                                {req.bus.fuel_liters.toFixed(1)}L bal
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-400 italic">No fill yet</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {req.status === 'pending' && (
                                                    <>
                                                        <button onClick={() => openModal(req, 'approve')} className="text-xs bg-[var(--brand)] hover:opacity-90 text-white px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1">
                                                            <CheckCircle2 className="w-3 h-3" /> Approve
                                                        </button>
                                                        <button onClick={() => openModal(req, 'reject')} className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white rounded-lg px-3 py-1.5 font-semibold text-xs">
                                                            <XCircle className="w-3 h-3" /> Reject
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Action Modal — approve or reject only */}
            {actionModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white capitalize">{actionModal.action} Request</h2>
                            <button onClick={() => setActionModal(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-400 transition-all"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl text-sm space-y-1.5">
                                <p className="text-slate-500 dark:text-slate-400">Driver: <span className="font-bold text-slate-800 dark:text-white">{actionModal.req.driver?.user?.name}</span></p>
                                <p className="text-slate-500 dark:text-slate-400">Bus: <span className="font-semibold text-slate-700 dark:text-slate-200">{actionModal.req.bus?.bus_number || '—'}</span></p>
                                <p className="text-slate-500 dark:text-slate-400">Amount Requested: <span className="font-bold text-slate-800 dark:text-white">₹{actionModal.req.amount_requested?.toLocaleString()}</span></p>
                                {actionModal.req.reason && <p className="text-slate-500 dark:text-slate-400">Reason: <span className="text-slate-700 dark:text-slate-300">{actionModal.req.reason}</span></p>}
                            </div>

                            {actionModal.action === 'approve' && (
                                <div className="space-y-3">
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Payment Method</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => { setPaymentMethod('cash'); setTransferId(''); setTransferIdError(''); }}
                                            className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                                                paymentMethod === 'cash'
                                                    ? 'border-[var(--brand)] bg-[var(--brand)]/5 text-[var(--brand)]'
                                                    : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500'
                                            }`}
                                        >
                                            <Banknote className="w-5 h-5 shrink-0" />
                                            <div>
                                                <p className="text-sm font-semibold">Cash</p>
                                                <p className="text-xs opacity-70">Paid in hand</p>
                                            </div>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setPaymentMethod('account_transfer'); setTransferIdError(''); }}
                                            className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                                                paymentMethod === 'account_transfer'
                                                    ? 'border-[var(--brand)] bg-[var(--brand)]/5 text-[var(--brand)]'
                                                    : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500'
                                            }`}
                                        >
                                            <CreditCard className="w-5 h-5 shrink-0" />
                                            <div>
                                                <p className="text-sm font-semibold">Account Transfer</p>
                                                <p className="text-xs opacity-70">Bank / UPI</p>
                                            </div>
                                        </button>
                                    </div>

                                    {paymentMethod === 'account_transfer' && (
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                                Transfer ID <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="e.g. UTR123456789"
                                                className={`w-full bg-slate-50 dark:bg-slate-700/50 border rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none transition-colors ${
                                                    transferIdError ? 'border-red-400' : 'border-slate-200 dark:border-slate-600 focus:border-[var(--brand)]'
                                                }`}
                                                value={transferId}
                                                onChange={e => { setTransferId(e.target.value); if (e.target.value.trim()) setTransferIdError(''); }}
                                            />
                                            {transferIdError && <p className="mt-1.5 text-xs text-red-500">{transferIdError}</p>}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Note (optional)</label>
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
                                        actionModal.action === 'reject' ? 'bg-red-600 hover:bg-red-500' : 'bg-[var(--brand)] hover:opacity-90'
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
