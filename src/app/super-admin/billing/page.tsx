'use client';

import { useState, useEffect } from 'react';
import { CreditCard, Plus, Loader2, X, Check, Building2 } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface Plan {
    id: string;
    name: string;
    description?: string;
    line_items?: { label: string; metric: string; unit_rate: number }[];
}

interface Invoice {
    id: string;
    school?: { id: string; name: string };
    billing_month: string;
    total_amount: number;
    status: string;
    paid_at?: string;
}

interface School {
    id: string;
    name: string;
}

type LineItem = { label: string; metric: string; unit_rate: string };

const METRICS = ['per_bus', 'per_student', 'per_driver', 'per_route', 'flat_fee'];

const inputCls = "w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors";

export default function BillingPage() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [schools, setSchools] = useState<School[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Plan modal
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [planForm, setPlanForm] = useState({ name: '', description: '' });
    const [lineItems, setLineItems] = useState<LineItem[]>([{ label: '', metric: 'per_bus', unit_rate: '' }]);

    // Invoice modal
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [invoiceForm, setInvoiceForm] = useState({ school_id: '', billing_month: new Date().toISOString().slice(0, 7) });
    const [generatingAll, setGeneratingAll] = useState(false);

    // Filters
    const [filterSchool, setFilterSchool] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [plansRes, invoicesRes, schoolsRes] = await Promise.allSettled([
                api.get('/billing/plans'),
                api.get('/billing/invoices'),
                api.get('/schools'),
            ]);
            if (plansRes.status === 'fulfilled') setPlans(Array.isArray(plansRes.value.data) ? plansRes.value.data : []);
            if (invoicesRes.status === 'fulfilled') setInvoices(Array.isArray(invoicesRes.value.data) ? invoicesRes.value.data : []);
            if (schoolsRes.status === 'fulfilled') setSchools(Array.isArray(schoolsRes.value.data) ? schoolsRes.value.data : []);
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePlan = async () => {
        if (!planForm.name) return;
        setSubmitting(true);
        try {
            await api.post('/billing/plans', {
                ...planForm,
                line_items: lineItems.map(li => ({
                    label: li.label,
                    metric: li.metric,
                    unit_rate: parseFloat(li.unit_rate) || 0,
                })),
            });
            setShowPlanModal(false);
            setPlanForm({ name: '', description: '' });
            setLineItems([{ label: '', metric: 'per_bus', unit_rate: '' }]);
            fetchAll();
        } catch (e: any) {
            alert(e.response?.data?.message || 'Failed to create plan');
        } finally {
            setSubmitting(false);
        }
    };

    const handleGenerateInvoice = async () => {
        if (!invoiceForm.school_id) return;
        setSubmitting(true);
        try {
            await api.post('/billing/generate', invoiceForm);
            setShowInvoiceModal(false);
            setInvoiceForm({ school_id: '', billing_month: new Date().toISOString().slice(0, 7) });
            fetchAll();
        } catch (e: any) {
            alert(e.response?.data?.message || 'Failed to generate invoice');
        } finally {
            setSubmitting(false);
        }
    };

    const handleGenerateAll = async () => {
        if (!confirm('Generate invoices for all active schools this month?')) return;
        setGeneratingAll(true);
        try {
            await api.post('/billing/generate-all', { billing_month: new Date().toISOString().slice(0, 7) });
            fetchAll();
            alert('Invoices generated for all schools.');
        } catch (e: any) {
            alert(e.response?.data?.message || 'Failed to generate all invoices');
        } finally {
            setGeneratingAll(false);
        }
    };

    const handleRecordPayment = async (invoiceId: string) => {
        if (!confirm('Mark this invoice as paid?')) return;
        try {
            await api.patch(`/billing/invoices/${invoiceId}/pay`);
            fetchAll();
        } catch (e: any) {
            alert(e.response?.data?.message || 'Failed to record payment');
        }
    };

    const filteredInvoices = invoices.filter(inv => {
        if (filterSchool && !inv.school?.name?.toLowerCase().includes(filterSchool.toLowerCase())) return false;
        if (filterStatus && inv.status?.toLowerCase() !== filterStatus.toLowerCase()) return false;
        return true;
    });

    const getStatusBadge = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'paid': return 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full px-2.5 py-0.5 text-xs font-medium';
            case 'overdue': return 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full px-2.5 py-0.5 text-xs font-medium';
            default: return 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full px-2.5 py-0.5 text-xs font-medium';
        }
    };

    return (
        <div className="space-y-6 animate-in">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <CreditCard className="w-7 h-7 text-[var(--brand)]" />
                        Billing
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Pricing plans and invoice management</p>
                </div>
            </div>

            {/* Pricing Plans */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Pricing Plans</h3>
                    <button
                        onClick={() => setShowPlanModal(true)}
                        className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95"
                    >
                        <Plus className="w-4 h-4" /> Create Plan
                    </button>
                </div>
                {loading ? (
                    <div className="flex justify-center py-16">
                        <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : plans.length === 0 ? (
                    <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">No pricing plans yet</div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                        {plans.map(plan => (
                            <div key={plan.id} className="bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-600 p-5 hover:border-[var(--brand)]/30 transition-colors">
                                <h4 className="font-semibold text-slate-900 dark:text-white mb-1">{plan.name}</h4>
                                {plan.description && <p className="text-slate-500 dark:text-slate-400 text-xs mb-4">{plan.description}</p>}
                                {plan.line_items && plan.line_items.length > 0 && (
                                    <div className="space-y-2">
                                        {plan.line_items.map((li, i) => (
                                            <div key={i} className="flex justify-between text-xs">
                                                <span className="text-slate-500 dark:text-slate-400 font-medium">{li.label || li.metric}</span>
                                                <span className="text-[var(--brand)] font-semibold">₹{li.unit_rate}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Invoices */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex flex-wrap gap-3 items-center justify-between">
                    <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Invoices</h3>
                    <div className="flex flex-wrap gap-2 items-center">
                        <input
                            type="text"
                            placeholder="Filter by school..."
                            value={filterSchool}
                            onChange={e => setFilterSchool(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-1.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-[var(--brand)] w-40"
                        />
                        <select
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-1.5 text-sm text-slate-900 dark:text-white outline-none focus:border-[var(--brand)]"
                        >
                            <option value="">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="paid">Paid</option>
                            <option value="overdue">Overdue</option>
                        </select>
                        <button
                            onClick={() => setShowInvoiceModal(true)}
                            className="flex items-center gap-1.5 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-3 py-1.5 text-sm font-semibold transition-all active:scale-95"
                        >
                            <Plus className="w-3.5 h-3.5" /> Generate Invoice
                        </button>
                        <button
                            onClick={handleGenerateAll}
                            disabled={generatingAll}
                            className="flex items-center gap-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-3 py-1.5 text-sm font-semibold transition-all active:scale-95 disabled:opacity-50"
                        >
                            {generatingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Building2 className="w-3.5 h-3.5" />}
                            Generate All
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-16">
                        <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filteredInvoices.length === 0 ? (
                    <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">No invoices found</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-700">
                                    {['School', 'Billing Month', 'Amount', 'Status', 'Actions'].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-700/50">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredInvoices.map(inv => (
                                    <tr key={inv.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                        <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">
                                            {inv.school?.name || '—'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                            {inv.billing_month}
                                        </td>
                                        <td className="px-4 py-3 text-sm font-bold text-slate-900 dark:text-white">
                                            ₹{(inv.total_amount || 0).toLocaleString('en-IN')}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={getStatusBadge(inv.status)}>
                                                {inv.status || 'pending'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {inv.status !== 'paid' && (
                                                <button
                                                    onClick={() => handleRecordPayment(inv.id)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-semibold border border-emerald-200 dark:border-emerald-800 transition-all active:scale-95"
                                                >
                                                    <Check className="w-3 h-3" /> Record Payment
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create Plan Modal */}
            {showPlanModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Create Pricing Plan</h3>
                            <button onClick={() => setShowPlanModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 transition-colors"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Plan Name</label>
                                <input
                                    type="text"
                                    value={planForm.name}
                                    onChange={e => setPlanForm({ ...planForm, name: e.target.value })}
                                    placeholder="e.g. Enterprise"
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Description</label>
                                <input
                                    type="text"
                                    value={planForm.description}
                                    onChange={e => setPlanForm({ ...planForm, description: e.target.value })}
                                    placeholder="Optional description"
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Line Items</label>
                                    <button
                                        onClick={() => setLineItems([...lineItems, { label: '', metric: 'per_bus', unit_rate: '' }])}
                                        className="text-xs font-semibold text-[var(--brand)] hover:opacity-80 flex items-center gap-1"
                                    >
                                        <Plus className="w-3 h-3" /> Add Row
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {lineItems.map((li, i) => (
                                        <div key={i} className="flex gap-2 items-center">
                                            <input
                                                type="text"
                                                placeholder="Label"
                                                value={li.label}
                                                onChange={e => setLineItems(prev => prev.map((l, idx) => idx === i ? { ...l, label: e.target.value } : l))}
                                                className="flex-1 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-[var(--brand)]"
                                            />
                                            <select
                                                value={li.metric}
                                                onChange={e => setLineItems(prev => prev.map((l, idx) => idx === i ? { ...l, metric: e.target.value } : l))}
                                                className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white outline-none"
                                            >
                                                {METRICS.map(m => <option key={m} value={m}>{m}</option>)}
                                            </select>
                                            <input
                                                type="number"
                                                placeholder="₹ rate"
                                                value={li.unit_rate}
                                                onChange={e => setLineItems(prev => prev.map((l, idx) => idx === i ? { ...l, unit_rate: e.target.value } : l))}
                                                className="w-20 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-[var(--brand)]"
                                            />
                                            {lineItems.length > 1 && (
                                                <button onClick={() => setLineItems(prev => prev.filter((_, idx) => idx !== i))} className="text-red-500 hover:text-red-600">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-100 dark:border-slate-700">
                            <button
                                onClick={handleCreatePlan}
                                disabled={submitting || !planForm.name}
                                className="w-full flex items-center justify-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95 disabled:opacity-50"
                            >
                                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Plan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Generate Invoice Modal */}
            {showInvoiceModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Generate Invoice</h3>
                            <button onClick={() => setShowInvoiceModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 transition-colors"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">School</label>
                                <select
                                    value={invoiceForm.school_id}
                                    onChange={e => setInvoiceForm({ ...invoiceForm, school_id: e.target.value })}
                                    className={inputCls}
                                >
                                    <option value="">Select school</option>
                                    {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Billing Month</label>
                                <input
                                    type="month"
                                    value={invoiceForm.billing_month}
                                    onChange={e => setInvoiceForm({ ...invoiceForm, billing_month: e.target.value })}
                                    className={inputCls}
                                />
                            </div>
                        </div>
                        <div className="px-6 pb-6 flex gap-3">
                            <button onClick={() => setShowInvoiceModal(false)} className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-4 py-2.5 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">Cancel</button>
                            <button
                                onClick={handleGenerateInvoice}
                                disabled={submitting || !invoiceForm.school_id}
                                className="flex-1 flex items-center justify-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95 disabled:opacity-50"
                            >
                                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Generate'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
