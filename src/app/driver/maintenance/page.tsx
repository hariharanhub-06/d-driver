'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, CheckCircle, AlertCircle, Loader2, Wrench } from 'lucide-react';
import api from '@/lib/api';
import { ta } from '@/lib/i18n';

interface MaintenanceItem {
    part: string;
    cost: string;
}

interface MaintenanceRecord {
    id: string;
    date: string;
    description: string;
    total_cost: number;
    status: string;
    admin_note?: string;
    items: MaintenanceItem[];
}

const todayStr = () => new Date().toLocaleDateString('en-CA');

const statusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export default function DriverMaintenancePage() {
    const [view, setView] = useState<'list' | 'form'>('list');
    const [records, setRecords] = useState<MaintenanceRecord[]>([]);
    const [loading, setLoading] = useState(true);

    // Form state
    const [date, setDate] = useState(todayStr());
    const [description, setDescription] = useState('');
    const [items, setItems] = useState<MaintenanceItem[]>([{ part: '', cost: '' }]);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/maintenance/mine');
            setRecords(Array.isArray(data) ? data : data.records || []);
        } catch { setRecords([]); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchRecords(); }, []);

    const addItem = () => setItems(prev => [...prev, { part: '', cost: '' }]);
    const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));
    const updateItem = (idx: number, field: 'part' | 'cost', val: string) =>
        setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item));

    const totalCost = items.reduce((sum, item) => sum + (parseFloat(item.cost) || 0), 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description.trim()) { setSubmitError('Description is required.'); return; }
        const validItems = items.filter(i => i.part.trim() && parseFloat(i.cost) > 0);
        if (validItems.length === 0) { setSubmitError('Add at least one item with part name and cost.'); return; }

        setSubmitError(''); setSubmitting(true);
        try {
            await api.post('/maintenance', {
                date,
                description: description.trim(),
                items: validItems.map(i => ({ part: i.part.trim(), cost: parseFloat(i.cost) })),
            });
            setSubmitted(true);
            fetchRecords();
        } catch (err: any) {
            setSubmitError(err?.response?.data?.error || 'Failed to submit maintenance record.');
        } finally { setSubmitting(false); }
    };

    const resetForm = () => {
        setDate(todayStr()); setDescription(''); setItems([{ part: '', cost: '' }]);
        setSubmitError(''); setSubmitted(false); setView('list');
    };

    const inputCls = 'w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors';

    return (
        <div className="min-h-screen bg-slate-900">
            {/* Header */}
            <div className="bg-slate-800 px-4 pt-12 pb-4 flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-white">Maintenance / {ta.maintenance}</h1>
                    <p className="text-slate-400 text-sm mt-0.5">Expense records & submissions</p>
                </div>
                {view === 'list' && (
                    <button onClick={() => setView('form')} className="flex items-center gap-2 bg-[var(--brand)] text-white px-4 py-2 rounded-xl text-sm font-semibold active:scale-95 transition-all">
                        <Plus className="w-4 h-4" /> Add
                    </button>
                )}
            </div>

            {view === 'form' ? (
                submitted ? (
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                        <div className="w-20 h-20 bg-emerald-900/30 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle className="w-12 h-12 text-emerald-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Submitted!</h3>
                        <p className="text-sm text-slate-400 mb-6">Admin will review and approve your maintenance record.</p>
                        <button onClick={resetForm} className="bg-slate-700 border border-slate-600 text-white rounded-xl px-5 py-2.5 font-semibold text-sm">
                            Back to Records
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="px-4 py-4 space-y-4">
                        <button type="button" onClick={() => setView('list')} className="text-sm text-slate-400 hover:text-white flex items-center gap-1 mb-2">
                            ← Back to list
                        </button>

                        {submitError && (
                            <div className="flex items-center gap-2 bg-red-900/20 border border-red-800 text-red-400 rounded-xl px-4 py-3 text-sm">
                                <AlertCircle className="w-4 h-4 shrink-0" /> {submitError}
                            </div>
                        )}

                        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-300 mb-2">Date / தேதி</label>
                                <input type="date" value={date} max={todayStr()} onChange={e => setDate(e.target.value)} required className={inputCls} />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-300 mb-2">Description / விவரம்</label>
                                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="e.g. Tyre replacement, oil change..." required className={inputCls + ' resize-none'} />
                            </div>
                        </div>

                        {/* Items table */}
                        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-bold text-white">Items / பாகங்கள்</h3>
                                <button type="button" onClick={addItem} className="flex items-center gap-1 text-xs text-[var(--brand)] font-semibold">
                                    <Plus className="w-3.5 h-3.5" /> Add Row
                                </button>
                            </div>

                            {/* Header */}
                            <div className="grid grid-cols-[1fr_100px_32px] gap-2 mb-2">
                                <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Part Name</span>
                                <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Cost (₹)</span>
                                <span />
                            </div>

                            {items.map((item, idx) => (
                                <div key={idx} className="grid grid-cols-[1fr_100px_32px] gap-2 mb-2">
                                    <input
                                        value={item.part}
                                        onChange={e => updateItem(idx, 'part', e.target.value)}
                                        placeholder="e.g. Tyre"
                                        className={inputCls}
                                    />
                                    <input
                                        type="number"
                                        value={item.cost}
                                        onChange={e => updateItem(idx, 'cost', e.target.value)}
                                        placeholder="0"
                                        min="0"
                                        step="0.01"
                                        className={inputCls + ' text-right'}
                                    />
                                    <button type="button" onClick={() => removeItem(idx)} disabled={items.length === 1} className="flex items-center justify-center w-8 h-10 rounded-xl text-slate-500 hover:text-red-400 disabled:opacity-30 transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}

                            <div className="border-t border-slate-700 mt-3 pt-3 flex items-center justify-between">
                                <span className="text-sm font-bold text-white">Total / மொத்தம்</span>
                                <span className="text-base font-black text-[var(--brand)]">₹{totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        </div>

                        <button type="submit" disabled={submitting} className="w-full bg-[var(--brand)] text-white rounded-2xl py-3 font-semibold text-sm disabled:opacity-50 active:scale-95 transition-all">
                            {submitting ? (
                                <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</span>
                            ) : 'Submit for Approval / அனுமதிக்கு சமர்ப்பி'}
                        </button>
                    </form>
                )
            ) : (
                // Records list
                <div className="px-4 py-4 space-y-3">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                        </div>
                    ) : records.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
                                <Wrench className="w-8 h-8 text-slate-500" />
                            </div>
                            <p className="text-slate-400 text-sm">No maintenance records yet.</p>
                            <p className="text-slate-500 text-xs mt-1">Tap "Add" to submit an expense.</p>
                        </div>
                    ) : (
                        records.map(rec => (
                            <div key={rec.id} className="bg-slate-800 rounded-2xl border border-slate-700 p-4">
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <p className="text-white font-semibold text-sm">{rec.description}</p>
                                        <p className="text-slate-400 text-xs mt-0.5">{new Date(rec.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${statusColors[rec.status] || 'bg-slate-700 text-slate-400'}`}>
                                        {rec.status}
                                    </span>
                                </div>

                                {rec.items?.length > 0 && (
                                    <div className="space-y-1 mt-3 mb-2">
                                        {rec.items.map((item, i) => (
                                            <div key={i} className="flex items-center justify-between text-xs text-slate-400">
                                                <span>• {item.part}</span>
                                                <span>₹{(item.cost as number | string)}  </span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="flex items-center justify-between border-t border-slate-700 pt-2 mt-2">
                                    <span className="text-xs text-slate-400">Total</span>
                                    <span className="text-sm font-bold text-white">₹{rec.total_cost.toLocaleString('en-IN')}</span>
                                </div>

                                {rec.admin_note && (
                                    <div className="mt-2 bg-slate-700/50 rounded-xl px-3 py-2 text-xs text-slate-300">
                                        <span className="font-semibold text-slate-400">Admin note: </span>{rec.admin_note}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
