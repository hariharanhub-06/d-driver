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

    const getStatusStyle = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'paid': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'overdue': return 'bg-red-500/10 text-red-400 border-red-500/20';
            default: return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
        }
    };

    return (
        <div className="space-y-8 animate-in">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-black text-white tracking-tighter flex items-center gap-3">
                    <CreditCard className="w-7 h-7 text-primary-400" />
                    Billing
                </h1>
                <p className="text-white/30 text-xs font-bold uppercase tracking-widest mt-1">Pricing plans and invoice management</p>
            </div>

            {/* Pricing Plans */}
            <div className="bg-[#111827] rounded-2xl border border-white/5 overflow-hidden">
                <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center">
                    <h3 className="font-black text-white text-sm">Pricing Plans</h3>
                    <button
                        onClick={() => setShowPlanModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-black transition-all active:scale-95"
                    >
                        <Plus className="w-3.5 h-3.5" /> Create Plan
                    </button>
                </div>
                {loading ? (
                    <div className="flex justify-center p-10"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
                ) : plans.length === 0 ? (
                    <div className="p-10 text-center text-white/20 font-bold text-sm">No pricing plans yet</div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                        {plans.map(plan => (
                            <div key={plan.id} className="bg-[#0d1117] rounded-xl border border-white/5 p-5 hover:border-primary-500/20 transition-all">
                                <h4 className="font-black text-white mb-1">{plan.name}</h4>
                                {plan.description && <p className="text-white/30 text-xs mb-4">{plan.description}</p>}
                                {plan.line_items && plan.line_items.length > 0 && (
                                    <div className="space-y-2">
                                        {plan.line_items.map((li, i) => (
                                            <div key={i} className="flex justify-between text-xs">
                                                <span className="text-white/40 font-bold">{li.label || li.metric}</span>
                                                <span className="text-primary-400 font-black">₹{li.unit_rate}</span>
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
            <div className="bg-[#111827] rounded-2xl border border-white/5 overflow-hidden">
                <div className="px-6 py-5 border-b border-white/5 flex flex-wrap gap-3 items-center justify-between">
                    <h3 className="font-black text-white text-sm">Invoices</h3>
                    <div className="flex flex-wrap gap-2 items-center">
                        <input
                            type="text"
                            placeholder="Filter by school..."
                            value={filterSchool}
                            onChange={e => setFilterSchool(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-white text-xs font-bold placeholder:text-white/20 outline-none focus:border-primary-500 w-36"
                        />
                        <select
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-white text-xs font-bold outline-none focus:border-primary-500"
                        >
                            <option value="">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="paid">Paid</option>
                            <option value="overdue">Overdue</option>
                        </select>
                        <button
                            onClick={() => setShowInvoiceModal(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-black transition-all active:scale-95"
                        >
                            <Plus className="w-3 h-3" /> Generate Invoice
                        </button>
                        <button
                            onClick={handleGenerateAll}
                            disabled={generatingAll}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-black transition-all active:scale-95 disabled:opacity-50"
                        >
                            {generatingAll ? <Loader2 className="w-3 h-3 animate-spin" /> : <Building2 className="w-3 h-3" />}
                            Generate All
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center p-10"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
                ) : filteredInvoices.length === 0 ? (
                    <div className="p-10 text-center text-white/20 font-bold text-sm">No invoices found</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/5">
                                    {['School', 'Billing Month', 'Amount', 'Status', 'Actions'].map(h => (
                                        <th key={h} className="px-5 py-3 text-left text-[10px] font-black text-white/30 uppercase tracking-widest">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredInvoices.map(inv => (
                                    <tr key={inv.id} className="hover:bg-white/5 transition-all">
                                        <td className="px-5 py-4">
                                            <p className="text-white font-bold text-sm">{inv.school?.name || '—'}</p>
                                        </td>
                                        <td className="px-5 py-4">
                                            <p className="text-white/60 font-bold text-sm">{inv.billing_month}</p>
                                        </td>
                                        <td className="px-5 py-4">
                                            <p className="text-white font-black text-sm">₹{(inv.total_amount || 0).toLocaleString('en-IN')}</p>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className={cn('px-2 py-0.5 rounded-full text-[9px] font-black uppercase border', getStatusStyle(inv.status))}>
                                                {inv.status || 'pending'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            {inv.status !== 'paid' && (
                                                <button
                                                    onClick={() => handleRecordPayment(inv.id)}
                                                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-[10px] font-black border border-emerald-500/20 transition-all active:scale-95"
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
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
                    <div className="bg-[#111827] border border-white/10 rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden">
                        <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center">
                            <h3 className="text-xl font-black text-white">Create Pricing Plan</h3>
                            <button onClick={() => setShowPlanModal(false)} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="px-8 py-6 space-y-5 max-h-[70vh] overflow-y-auto">
                            <div>
                                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest block mb-2">Plan Name</label>
                                <input
                                    type="text"
                                    value={planForm.name}
                                    onChange={e => setPlanForm({ ...planForm, name: e.target.value })}
                                    placeholder="e.g. Enterprise"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold outline-none focus:border-primary-500"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest block mb-2">Description</label>
                                <input
                                    type="text"
                                    value={planForm.description}
                                    onChange={e => setPlanForm({ ...planForm, description: e.target.value })}
                                    placeholder="Optional description"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold outline-none focus:border-primary-500"
                                />
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Line Items</label>
                                    <button
                                        onClick={() => setLineItems([...lineItems, { label: '', metric: 'per_bus', unit_rate: '' }])}
                                        className="text-[10px] font-black text-primary-400 hover:text-primary-300 flex items-center gap-1"
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
                                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-bold outline-none focus:border-primary-500"
                                            />
                                            <select
                                                value={li.metric}
                                                onChange={e => setLineItems(prev => prev.map((l, idx) => idx === i ? { ...l, metric: e.target.value } : l))}
                                                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-bold outline-none"
                                            >
                                                {METRICS.map(m => <option key={m} value={m}>{m}</option>)}
                                            </select>
                                            <input
                                                type="number"
                                                placeholder="₹ rate"
                                                value={li.unit_rate}
                                                onChange={e => setLineItems(prev => prev.map((l, idx) => idx === i ? { ...l, unit_rate: e.target.value } : l))}
                                                className="w-20 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-bold outline-none focus:border-primary-500"
                                            />
                                            {lineItems.length > 1 && (
                                                <button onClick={() => setLineItems(prev => prev.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-300">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="px-8 py-5 border-t border-white/5">
                            <button
                                onClick={handleCreatePlan}
                                disabled={submitting || !planForm.name}
                                className="w-full py-3.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-black text-sm disabled:opacity-50 active:scale-95 transition-all"
                            >
                                {submitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Create Plan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Generate Invoice Modal */}
            {showInvoiceModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
                    <div className="bg-[#111827] border border-white/10 rounded-[2rem] w-full max-w-sm shadow-2xl">
                        <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center">
                            <h3 className="text-xl font-black text-white">Generate Invoice</h3>
                            <button onClick={() => setShowInvoiceModal(false)} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="px-8 py-6 space-y-5">
                            <div>
                                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest block mb-2">School</label>
                                <select
                                    value={invoiceForm.school_id}
                                    onChange={e => setInvoiceForm({ ...invoiceForm, school_id: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold outline-none focus:border-primary-500"
                                >
                                    <option value="">Select school</option>
                                    {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest block mb-2">Billing Month</label>
                                <input
                                    type="month"
                                    value={invoiceForm.billing_month}
                                    onChange={e => setInvoiceForm({ ...invoiceForm, billing_month: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold outline-none focus:border-primary-500"
                                />
                            </div>
                        </div>
                        <div className="px-8 pb-6 flex gap-3">
                            <button onClick={() => setShowInvoiceModal(false)} className="flex-1 py-3 bg-white/5 text-white/60 rounded-xl font-bold">Cancel</button>
                            <button
                                onClick={handleGenerateInvoice}
                                disabled={submitting || !invoiceForm.school_id}
                                className="flex-1 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-black disabled:opacity-50 active:scale-95 transition-all"
                            >
                                {submitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Generate'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
