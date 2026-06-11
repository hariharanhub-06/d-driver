'use client';

import { useState, useEffect } from 'react';
import { Wrench, CheckCircle2, XCircle, Loader2, Search, ChevronDown, ChevronUp } from 'lucide-react';
import api from '@/lib/api';
import { useT } from '@/lib/i18n';

type MaintenanceRecord = {
    id: string;
    date: string;
    description: string;
    total_cost: number;
    status: string;
    admin_note?: string;
    items: { part: string; cost: number }[];
    driver?: { user?: { name: string; phone?: string } };
    bus?: { bus_number: string };
    school_id: string;
};

const statusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export default function AdminMaintenancePage() {
    const t = useT();
    const [records, setRecords] = useState<MaintenanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
    const [expanded, setExpanded] = useState<string | null>(null);
    const [actionModal, setActionModal] = useState<{ record: MaintenanceRecord; action: 'approved' | 'rejected' } | null>(null);
    const [adminNote, setAdminNote] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/maintenance');
            setRecords(Array.isArray(data) ? data : data.records || []);
        } catch { setRecords([]); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchRecords(); }, []);

    const handleAction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!actionModal) return;
        setActionLoading(true);
        try {
            await api.put(`/maintenance/${actionModal.record.id}`, {
                status: actionModal.action,
                admin_note: adminNote || undefined,
            });
            setActionModal(null);
            fetchRecords();
        } catch (err: any) {
            alert(err?.response?.data?.error || 'Action failed');
        } finally { setActionLoading(false); }
    };

    const filtered = records.filter(r => {
        const s = search.toLowerCase();
        const matchSearch = !search ||
            (r.description || '').toLowerCase().includes(s) ||
            (r.driver?.user?.name || '').toLowerCase().includes(s) ||
            (r.bus?.bus_number || '').toLowerCase().includes(s);
        const matchStatus = statusFilter === 'all' || r.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const pendingCount = records.filter(r => r.status === 'pending').length;

    return (
        <div className="space-y-6 animate-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('Maintenance', 'பராமரிப்பு')}</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('Driver-submitted expense records', 'ஓட்டுநர் சமர்ப்பித்த செலவு பதிவுகள்')}</p>
                </div>
                {pendingCount > 0 && (
                    <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-sm font-bold px-3 py-1.5 rounded-full">
                        {pendingCount} {t('pending', 'நிலுவையில்')}
                    </span>
                )}
            </div>

            {/* Filters */}
            <div className="flex gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder={t('Search driver, bus, description...', 'ஓட்டுநர், பேருந்து, விவரம் தேடு...')} value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 pl-9 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)]" />
                </div>
                <div className="flex gap-1">
                    {(['all', 'pending', 'approved', 'rejected'] as const).map(s => (
                        <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-2 rounded-xl text-xs font-semibold capitalize transition-all ${statusFilter === s ? 'bg-[var(--brand)] text-white' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                            {s === 'all' ? t('All', 'அனைத்தும்')
                                : s === 'pending' ? t('Pending', 'நிலுவையில்')
                                : s === 'approved' ? t('Approved', 'அனுமதிக்கப்பட்டது')
                                : t('Rejected', 'நிராகரிக்கப்பட்டது')}
                        </button>
                    ))}
                </div>
            </div>

            {/* Records */}
            {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
            ) : filtered.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-center py-16">
                    <Wrench className="w-12 h-12 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm">{t('No records found', 'பதிவுகள் இல்லை')}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(rec => (
                        <div key={rec.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                            <div className="p-5">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="font-bold text-slate-900 dark:text-white">{rec.description}</p>
                                            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${statusColors[rec.status] || 'bg-slate-100 text-slate-600'}`}>{rec.status}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                                            {rec.driver?.user?.name && <span>{t('Driver', 'ஓட்டுநர்')}: {rec.driver.user.name}</span>}
                                            {rec.bus?.bus_number && <span>{t('Bus', 'பேருந்து')}: {rec.bus.bus_number}</span>}
                                            <span>{new Date(rec.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-xl font-black text-slate-900 dark:text-white">₹{rec.total_cost.toLocaleString('en-IN')}</p>
                                        <button onClick={() => setExpanded(expanded === rec.id ? null : rec.id)} className="text-xs text-[var(--brand)] font-medium flex items-center gap-1 ml-auto mt-1">
                                            {expanded === rec.id ? <><ChevronUp className="w-3 h-3" /> {t('Less', 'குறைவு')}</> : <><ChevronDown className="w-3 h-3" /> {t('Items', 'பொருட்கள்')}</>}
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded items */}
                                {expanded === rec.id && rec.items?.length > 0 && (
                                    <div className="mt-3 border-t border-slate-100 dark:border-slate-700 pt-3 space-y-1">
                                        {rec.items.map((item, i) => (
                                            <div key={i} className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                                                <span>• {item.part}</span>
                                                <span>₹{item.cost.toLocaleString('en-IN')}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {rec.admin_note && (
                                    <p className="mt-3 text-xs text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-700 pt-2">{t('Admin note', 'நிர்வாக குறிப்பு')}: {rec.admin_note}</p>
                                )}

                                {rec.status === 'pending' && (
                                    <div className="flex gap-2 mt-4">
                                        <button onClick={() => { setActionModal({ record: rec, action: 'approved' }); setAdminNote(''); }} className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-2.5 text-sm font-semibold transition-all">
                                            <CheckCircle2 className="w-4 h-4" /> {t('Approve', 'அனுமதி')}
                                        </button>
                                        <button onClick={() => { setActionModal({ record: rec, action: 'rejected' }); setAdminNote(''); }} className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white rounded-xl py-2.5 text-sm font-semibold transition-all">
                                            <XCircle className="w-4 h-4" /> {t('Reject', 'நிராகரி')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Action Modal */}
            {actionModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-700">
                            <h2 className="text-base font-bold text-slate-900 dark:text-white capitalize">{actionModal.action === 'approved' ? t('Approve', 'அனுமதி') : t('Reject', 'நிராகரி')} {t('Maintenance Record', 'பராமரிப்பு பதிவு')}</h2>
                        </div>
                        <form onSubmit={handleAction} className="p-5 space-y-4">
                            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3">
                                <p className="font-semibold text-slate-800 dark:text-white text-sm">{actionModal.record.description}</p>
                                <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">₹{actionModal.record.total_cost.toLocaleString('en-IN')} · {actionModal.record.driver?.user?.name}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('Note to driver', 'ஓட்டுநருக்கு குறிப்பு')} <span className="text-slate-400 font-normal">({t('optional', 'விருப்பமானது')})</span></label>
                                <input type="text" value={adminNote} onChange={e => setAdminNote(e.target.value)} placeholder={t('e.g. Approved. Will reimburse by Friday.', 'எ.கா. அனுமதிக்கப்பட்டது. வெள்ளிக்கிழமைக்குள் திருப்பி செலுத்தப்படும்.')} className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[var(--brand)]" />
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setActionModal(null)} className="flex-1 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl py-2.5 text-sm font-semibold">{t('Cancel', 'ரத்து செய்')}</button>
                                <button type="submit" disabled={actionLoading} className={`flex-1 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50 ${actionModal.action === 'approved' ? 'bg-emerald-600' : 'bg-red-600'}`}>
                                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : `${t('Confirm', 'உறுதிப்படுத்து')} ${actionModal.action === 'approved' ? t('Approve', 'அனுமதி') : t('Reject', 'நிராகரி')}`}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
