'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CreditCard, Plus, Loader2, X, Check, Building2, TrendingDown, IndianRupee, Pencil, Trash2, GraduationCap, Eye, Download } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n';
import { PLAN_FEATURES } from '@/lib/planFeatures';

interface Plan {
    id: string;
    name: string;
    description?: string;
    plan_type?: string;
    permissions?: Record<string, boolean>;
    lineItems?: { label: string; metric: string; unit_rate: number }[];
}

// Every feature is included by default; the SA toggles OFF what a given tier excludes.
const ALL_FEATURES_ON = (): Record<string, boolean> =>
    Object.fromEntries(PLAN_FEATURES.map(f => [f.key, true]));

interface InvoiceLineItem { label: string; metric?: string; unit_rate?: number; quantity?: number; charge: number }
interface Invoice {
    id: string;
    school?: { id: string; name: string };
    billing_month: string;
    total_amount: number;
    subtotal?: number;
    overdue_amount?: number;
    due_date?: string;
    line_items_snapshot?: { usage?: any; line_items?: InvoiceLineItem[]; plan_name?: string };
    status: string;
    paid_at?: string;
    payment_method?: string;
    razorpay_payment_id?: string;
    tax_rate?: number;
    tax_amount?: number;
    pdf_url?: string;
}

interface School {
    id: string;
    name: string;
}

type RevenueItem = { label: string; metric: string; unit_rate: string };
type ExpenseItem = { label: string; unit_rate: string };

const REVENUE_METRICS = ['per_bus', 'per_student', 'per_driver', 'per_route', 'flat_fee'];

const METRIC_QTY = (metric: string, buses: number, students: number, routes: number): number => {
    switch (metric) {
        case 'per_bus': return buses;
        case 'per_student': return students;
        case 'per_driver': return buses;
        case 'per_route': return routes;
        case 'flat_fee': return 1;
        default: return 0;
    }
};

const inputCls = "w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors";
const smallInput = "bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-[var(--brand)]";

const DEFAULT_EXPENSE_ITEMS: ExpenseItem[] = [
    { label: 'Vercel Hosting', unit_rate: '1660' },
    { label: 'Neon Database', unit_rate: '1660' },
    { label: 'Render Server', unit_rate: '580' },
];

export default function BillingPage() {
    const t = useT();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [schools, setSchools] = useState<School[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);
    const [editingPlanId, setEditingPlanId] = useState<string | null>(null);

    // Plan modal
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [planForm, setPlanForm] = useState({ name: '', description: '', plan_type: 'school' });
    const [planPermissions, setPlanPermissions] = useState<Record<string, boolean>>(ALL_FEATURES_ON());
    const [revenueItems, setRevenueItems] = useState<RevenueItem[]>([{ label: '', metric: 'per_bus', unit_rate: '' }]);
    const [expenseItems, setExpenseItems] = useState<ExpenseItem[]>(DEFAULT_EXPENSE_ITEMS);
    const [profitAmount, setProfitAmount] = useState('');
    const [sample, setSample] = useState({ buses: '10', students: '200', routes: '3', schools: '10' });

    // Invoice modal
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [invoiceForm, setInvoiceForm] = useState({ school_id: '', billing_month: new Date().toISOString().slice(0, 7) });
    const [generatingAll, setGeneratingAll] = useState(false);
    const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);

    // Filters
    const [filterSchool, setFilterSchool] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    useEffect(() => { fetchAll(); }, []);

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

    const resetPlanModal = () => {
        setShowPlanModal(false);
        setEditingPlanId(null);
        setPlanForm({ name: '', description: '', plan_type: 'school' });
        setPlanPermissions(ALL_FEATURES_ON());
        setRevenueItems([{ label: '', metric: 'per_bus', unit_rate: '' }]);
        setExpenseItems(DEFAULT_EXPENSE_ITEMS);
        setProfitAmount('');
        setSample({ buses: '10', students: '200', routes: '3', schools: '10' });
    };

    const openEditModal = (plan: Plan) => {
        setEditingPlanId(plan.id);
        setPlanForm({ name: plan.name, description: plan.description || '', plan_type: plan.plan_type || 'school' });
        // Merge saved permissions over the all-on default so newly-added features default to included.
        setPlanPermissions({ ...ALL_FEATURES_ON(), ...(plan.permissions || {}) });
        const allItems = plan.lineItems || [];
        const revenueRows = allItems
            .filter(li => !['expense', 'profit'].includes(li.metric))
            .map(li => ({ label: li.label, metric: li.metric, unit_rate: String(li.unit_rate) }));
        setRevenueItems(revenueRows.length > 0 ? revenueRows : [{ label: '', metric: 'per_bus', unit_rate: '' }]);
        const expenseRows = allItems
            .filter(li => li.metric === 'expense')
            .map(li => ({ label: li.label, unit_rate: String(li.unit_rate) }));
        setExpenseItems(expenseRows.length > 0 ? expenseRows : DEFAULT_EXPENSE_ITEMS);
        const profitLine = allItems.find(li => li.metric === 'profit');
        setProfitAmount(profitLine ? String(profitLine.unit_rate) : '');
        setSample({ buses: '10', students: '200', routes: '3', schools: '10' });
        setShowPlanModal(true);
    };

    const handleSavePlan = async () => {
        if (!planForm.name) return;
        setSubmitting(true);
        try {
            const allLineItems = [
                ...revenueItems.map(li => ({ label: li.label, metric: li.metric, unit_rate: parseFloat(li.unit_rate) || 0 })),
                ...expenseItems.filter(e => e.label.trim()).map(e => ({ label: e.label, metric: 'expense', unit_rate: parseFloat(e.unit_rate) || 0 })),
                ...(profitAmount ? [{ label: 'Profit Target', metric: 'profit', unit_rate: parseFloat(profitAmount) || 0 }] : []),
            ];
            if (editingPlanId) {
                await api.put(`/billing/plans/${editingPlanId}`, { ...planForm, permissions: planPermissions, lineItems: allLineItems });
            } else {
                await api.post('/billing/plans', { ...planForm, permissions: planPermissions, lineItems: allLineItems });
            }
            resetPlanModal();
            fetchAll();
        } catch (e: any) {
            alert(e.response?.data?.error || e.response?.data?.message || `Failed to ${editingPlanId ? 'update' : 'create'} plan`);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeletePlan = async (id: string, name: string) => {
        if (!confirm(t('Delete this plan? This cannot be undone.', 'இந்த திட்டத்தை நீக்கவா? இதை மீண்டும் செய்ய முடியாது.'))) return;
        setDeletingPlanId(id);
        try {
            await api.delete(`/billing/plans/${id}`);
            setPlans(prev => prev.filter(p => p.id !== id));
        } catch (e: any) {
            alert(e.response?.data?.error || 'Failed to delete plan');
        } finally {
            setDeletingPlanId(null);
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
            alert(e.response?.data?.error || e.response?.data?.message || 'Failed to generate invoice');
        } finally {
            setSubmitting(false);
        }
    };

    const handleGenerateAll = async () => {
        if (!confirm(t('Generate invoices for all active schools this month?', 'இந்த மாதம் அனைத்து பள்ளிகளுக்கும் விலைப்பட்டியல் உருவாக்கவா?'))) return;
        setGeneratingAll(true);
        try {
            await api.post('/billing/generate-all', { billing_month: new Date().toISOString().slice(0, 7) });
            fetchAll();
            alert('Invoices generated for all schools.');
        } catch (e: any) {
            alert(e.response?.data?.error || e.response?.data?.message || 'Failed to generate all invoices');
        } finally {
            setGeneratingAll(false);
        }
    };

    const handleRecordPayment = async (invoiceId: string) => {
        if (!confirm(t('Mark this invoice as paid?', 'இந்த விலைப்பட்டியலை செலுத்தியதாக குறிக்கவா?'))) return;
        try {
            await api.post(`/billing/invoices/${invoiceId}/pay-cash`, {});
            fetchAll();
        } catch (e: any) {
            alert(e.response?.data?.error || e.response?.data?.message || 'Failed to record payment');
        }
    };

    // Live calculation
    const buses = parseInt(sample.buses) || 0;
    const students = parseInt(sample.students) || 0;
    const routes = parseInt(sample.routes) || 0;
    const totalSchools = parseInt(sample.schools) || 1;

    const sampleRevenue = revenueItems.reduce((sum, li) => {
        const qty = METRIC_QTY(li.metric, buses, students, routes);
        return sum + ((parseFloat(li.unit_rate) || 0) * qty);
    }, 0);

    const totalExpenses = expenseItems.reduce((s, e) => s + (parseFloat(e.unit_rate) || 0), 0);
    const perSchoolExpense = totalExpenses / totalSchools;
    const profitTarget = parseFloat(profitAmount) || 0;
    const netSurplus = sampleRevenue - perSchoolExpense - profitTarget;
    const margin = sampleRevenue > 0 ? ((sampleRevenue - perSchoolExpense) / sampleRevenue * 100) : 0;

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

    const getStatusLabel = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'paid': return t('Paid', 'செலுத்தப்பட்டது');
            case 'overdue': return t('Overdue', 'தாமதமானது');
            case 'pending': return t('Pending', 'நிலுவையில்');
            default: return t('Pending', 'நிலுவையில்');
        }
    };

    return (
        <div className="space-y-6 animate-in">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <CreditCard className="w-7 h-7 text-[var(--brand)]" />
                        {t('Billing', 'பில்லிங்')}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('School billing management', 'பள்ளி பில்லிங் மேலாண்மை')}</p>
                </div>
                <Link
                    href="/super-admin/billing/individual"
                    className="flex items-center gap-2 bg-[var(--accent)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95"
                >
                    <GraduationCap className="w-4 h-4" /> {t('Individual Charging', 'தனிநபர் கட்டணம்')}
                </Link>
            </div>

            {/* Pricing Plans */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="font-semibold text-slate-900 dark:text-white text-sm">{t('Pricing Plans', 'விலை நிர்ணய திட்டங்கள்')}</h3>
                    <button
                        onClick={() => setShowPlanModal(true)}
                        className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95"
                    >
                        <Plus className="w-4 h-4" /> {t('Add Plan', 'திட்டம் சேர்க்கவும்')}
                    </button>
                </div>
                {loading ? (
                    <div className="flex justify-center py-16">
                        <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : plans.length === 0 ? (
                    <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">{t('No billing records', 'பில்லிங் பதிவுகள் இல்லை')}</div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                        {plans.map(plan => {
                            const revenueLines = plan.lineItems?.filter(li => !['expense', 'profit'].includes(li.metric)) || [];
                            const expenseLines = plan.lineItems?.filter(li => li.metric === 'expense') || [];
                            const profitLine = plan.lineItems?.find(li => li.metric === 'profit');
                            return (
                                <div key={plan.id} className="bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-600 p-5 hover:border-[var(--brand)]/30 transition-colors">
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                        <h4 className="font-semibold text-slate-900 dark:text-white">{plan.name}</h4>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button
                                                onClick={() => openEditModal(plan)}
                                                title={t('Edit', 'திருத்து')}
                                                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-400 hover:text-[var(--brand)] transition-colors"
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => handleDeletePlan(plan.id, plan.name)}
                                                disabled={deletingPlanId === plan.id}
                                                title={t('Delete', 'நீக்கு')}
                                                className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                                            >
                                                {deletingPlanId === plan.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                            </button>
                                        </div>
                                    </div>
                                    {plan.description && <p className="text-slate-500 dark:text-slate-400 text-xs mb-3">{plan.description}</p>}
                                    {revenueLines.length > 0 && (
                                        <div className="space-y-1.5 mb-3">
                                            {revenueLines.map((li, i) => (
                                                <div key={i} className="flex justify-between text-xs">
                                                    <span className="text-slate-500 dark:text-slate-400">{li.label || li.metric}</span>
                                                    <span className="text-[var(--brand)] font-semibold">₹{li.unit_rate}/{li.metric.replace('per_', '')}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {(expenseLines.length > 0 || profitLine) && (
                                        <div className="pt-2 border-t border-slate-200 dark:border-slate-600 space-y-1">
                                            {expenseLines.map((li, i) => (
                                                <div key={i} className="flex justify-between text-xs">
                                                    <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1"><TrendingDown className="w-3 h-3" />{li.label}</span>
                                                    <span className="text-slate-500 dark:text-slate-400">₹{li.unit_rate}/mo</span>
                                                </div>
                                            ))}
                                            {profitLine && (
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><IndianRupee className="w-3 h-3" />Profit target</span>
                                                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">₹{profitLine.unit_rate}/school</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Invoices */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex flex-wrap gap-3 items-center justify-between">
                    <h3 className="font-semibold text-slate-900 dark:text-white text-sm">{t('Invoices', 'விலைப்பட்டியல்கள்')}</h3>
                    <div className="flex flex-wrap gap-2 items-center">
                        <input
                            type="text" placeholder={t('Filter by school...', 'பள்ளி மூலம் வடிகட்டு...')} value={filterSchool}
                            onChange={e => setFilterSchool(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-1.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-[var(--brand)] w-40"
                        />
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-1.5 text-sm text-slate-900 dark:text-white outline-none focus:border-[var(--brand)]">
                            <option value="">{t('All Schools', 'அனைத்து பள்ளிகள்')}</option>
                            <option value="pending">{t('Pending', 'நிலுவையில்')}</option>
                            <option value="paid">{t('Paid', 'செலுத்தப்பட்டது')}</option>
                            <option value="overdue">{t('Overdue', 'தாமதமானது')}</option>
                        </select>
                        <button onClick={() => setShowInvoiceModal(true)}
                            className="flex items-center gap-1.5 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-3 py-1.5 text-sm font-semibold transition-all active:scale-95">
                            <Plus className="w-3.5 h-3.5" /> {t('Generate Invoice', 'விலைப்பட்டியல் உருவாக்கு')}
                        </button>
                        <button onClick={handleGenerateAll} disabled={generatingAll}
                            className="flex items-center gap-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-3 py-1.5 text-sm font-semibold transition-all active:scale-95 disabled:opacity-50">
                            {generatingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Building2 className="w-3.5 h-3.5" />}
                            {t('Generate All', 'அனைத்தும் உருவாக்கு')}
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-16">
                        <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filteredInvoices.length === 0 ? (
                    <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">{t('No billing records', 'பில்லிங் பதிவுகள் இல்லை')}</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-700">
                                    {[
                                        t('School', 'பள்ளி'),
                                        t('Billing Month', 'பில்லிங் மாதம்'),
                                        t('Amount', 'தொகை'),
                                        t('Status', 'நிலை'),
                                        t('Payment ID / Paid On', 'கட்டண ஐடி / செலுத்திய நேரம்'),
                                        t('Actions', 'செயல்கள்'),
                                    ].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-700/50">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredInvoices.map(inv => (
                                    <tr key={inv.id} onClick={() => setViewInvoice(inv)} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer">
                                        <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">{inv.school?.name || '—'}</td>
                                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{inv.billing_month}</td>
                                        <td className="px-4 py-3 text-sm font-bold text-slate-900 dark:text-white">₹{(inv.total_amount || 0).toLocaleString('en-IN')}</td>
                                        <td className="px-4 py-3"><span className={getStatusBadge(inv.status)}>{getStatusLabel(inv.status || 'pending')}</span></td>
                                        {/* Razorpay payment reference + when it was paid — the value to
                                            reconcile against the Razorpay dashboard. Cash payments have a
                                            paid_at but no payment id. */}
                                        <td className="px-4 py-3">
                                            {inv.paid_at ? (
                                                <div className="min-w-[150px]">
                                                    {inv.razorpay_payment_id ? (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(inv.razorpay_payment_id!); }}
                                                            title={t('Copy payment ID', 'கட்டண ஐடியை நகலெடு')}
                                                            className="font-mono text-xs text-slate-900 dark:text-white hover:text-[var(--brand)] transition-colors block truncate max-w-[180px]"
                                                        >
                                                            {inv.razorpay_payment_id}
                                                        </button>
                                                    ) : (
                                                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 capitalize">
                                                            {inv.payment_method || t('Cash', 'ரொக்கம்')}
                                                        </span>
                                                    )}
                                                    <span className="block text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                                                        {new Date(inv.paid_at).toLocaleString('en-IN', {
                                                            day: '2-digit', month: 'short', year: 'numeric',
                                                            hour: '2-digit', minute: '2-digit', hour12: true,
                                                        })}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <button onClick={(e) => { e.stopPropagation(); setViewInvoice(inv); }} title={t('View breakup', 'விவரம் காண்க')}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-[var(--brand)] hover:bg-[var(--brand)]/10 transition-all">
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                {inv.pdf_url && (
                                                    <a href={inv.pdf_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} title={t('Download PDF', 'PDF பதிவிறக்கம்')}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-[var(--brand)] hover:bg-[var(--brand)]/10 transition-all">
                                                        <Download className="w-4 h-4" />
                                                    </a>
                                                )}
                                                {inv.status !== 'paid' && (
                                                    <button onClick={(e) => { e.stopPropagation(); handleRecordPayment(inv.id); }}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-semibold border border-emerald-200 dark:border-emerald-800 transition-all active:scale-95">
                                                        <Check className="w-3 h-3" /> {t('Mark as Paid', 'செலுத்தியதாக குறி')}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Invoice breakup modal */}
            {viewInvoice && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setViewInvoice(null)}>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{viewInvoice.school?.name || '—'}</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{t('Invoice', 'விலைப்பட்டியல்')} · {viewInvoice.billing_month}{viewInvoice.line_items_snapshot?.plan_name ? ` · ${viewInvoice.line_items_snapshot.plan_name}` : ''}</p>
                            </div>
                            <button onClick={() => setViewInvoice(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500 dark:text-slate-400">{t('Due date', 'செலுத்த வேண்டிய தேதி')}</span>
                                <span className="font-semibold text-slate-900 dark:text-white">{viewInvoice.due_date ? new Date(viewInvoice.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500 dark:text-slate-400">{t('Status', 'நிலை')}</span>
                                <span className={getStatusBadge(viewInvoice.status)}>{getStatusLabel(viewInvoice.status || 'pending')}</span>
                            </div>

                            {/* Line items */}
                            <div className="rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                                <div className="px-4 py-2 bg-slate-50 dark:bg-slate-700/40 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex justify-between">
                                    <span>{t('Item', 'விவரம்')}</span><span>{t('Amount', 'தொகை')}</span>
                                </div>
                                {(viewInvoice.line_items_snapshot?.line_items?.length ?? 0) === 0 ? (
                                    <p className="px-4 py-3 text-xs text-slate-400">{t('No breakup available', 'விவரம் இல்லை')}</p>
                                ) : viewInvoice.line_items_snapshot!.line_items!.map((li, i) => (
                                    <div key={i} className="px-4 py-2.5 flex items-center justify-between text-sm border-t border-slate-50 dark:border-slate-700/50">
                                        <div>
                                            <p className="text-slate-800 dark:text-slate-200">{li.label}</p>
                                            {(li.quantity !== undefined && li.unit_rate !== undefined) && (
                                                <p className="text-[11px] text-slate-400">{li.quantity} × ₹{li.unit_rate.toLocaleString('en-IN')}{li.metric ? ` · ${li.metric.replace(/_/g, ' ')}` : ''}</p>
                                            )}
                                        </div>
                                        <span className="font-semibold text-slate-900 dark:text-white">₹{(li.charge || 0).toLocaleString('en-IN')}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Totals */}
                            <div className="space-y-1.5 text-sm">
                                <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">{t('Subtotal', 'கூட்டுத்தொகை')}</span><span className="text-slate-800 dark:text-slate-200">₹{(viewInvoice.subtotal ?? 0).toLocaleString('en-IN')}</span></div>
                                {/* GST — split into equal CGST/SGST halves for intra-state supply. */}
                                {(viewInvoice.tax_amount ?? 0) > 0 && (
                                    <>
                                        <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">CGST @ {((viewInvoice.tax_rate ?? 18) / 2)}%</span><span className="text-slate-800 dark:text-slate-200">₹{((viewInvoice.tax_amount ?? 0) / 2).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>
                                        <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">SGST @ {((viewInvoice.tax_rate ?? 18) / 2)}%</span><span className="text-slate-800 dark:text-slate-200">₹{((viewInvoice.tax_amount ?? 0) / 2).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>
                                    </>
                                )}
                                {(viewInvoice.overdue_amount ?? 0) > 0 && (
                                    <div className="flex justify-between"><span className="text-red-500">{t('Overdue penalty', 'தாமத அபராதம்')}</span><span className="text-red-500">₹{(viewInvoice.overdue_amount ?? 0).toLocaleString('en-IN')}</span></div>
                                )}
                                <div className="flex justify-between pt-1.5 border-t border-slate-100 dark:border-slate-700 font-bold text-base"><span className="text-slate-900 dark:text-white">{t('Total', 'மொத்தம்')}</span><span className="text-slate-900 dark:text-white">₹{(viewInvoice.total_amount || 0).toLocaleString('en-IN')}</span></div>
                            </div>

                            {viewInvoice.status !== 'paid' && (
                                <button onClick={() => { handleRecordPayment(viewInvoice.id); setViewInvoice(null); }}
                                    className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-2.5 font-semibold text-sm transition-all active:scale-95">
                                    <Check className="w-4 h-4" /> {t('Mark as Paid', 'செலுத்தியதாக குறி')}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Create / Edit Plan Modal */}
            {showPlanModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{editingPlanId ? t('Edit Plan', 'திட்டம் திருத்து') : t('Add Plan', 'திட்டம் சேர்க்கவும்')}</h3>
                            <button onClick={resetPlanModal} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 transition-colors"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Plan type — School (billed to the school) vs Individual (billed per student) */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('Plan Type', 'திட்ட வகை')}</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { key: 'school', label: t('School', 'பள்ளி'), desc: t('Billed to the school', 'பள்ளிக்கு கட்டணம்') },
                                        { key: 'individual', label: t('Individual', 'தனிநபர்'), desc: t('Billed per student', 'மாணவருக்கு கட்டணம்') },
                                    ].map(opt => (
                                        <button
                                            key={opt.key}
                                            type="button"
                                            onClick={() => setPlanForm({ ...planForm, plan_type: opt.key })}
                                            className={cn(
                                                "rounded-xl border px-4 py-3 text-left transition-all",
                                                planForm.plan_type === opt.key
                                                    ? "border-[var(--brand)] bg-[var(--brand)]/10"
                                                    : "border-slate-200 dark:border-slate-600 hover:border-slate-300"
                                            )}
                                        >
                                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{opt.label}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{opt.desc}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Name & Description */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('Plan Name', 'திட்டப் பெயர்')} *</label>
                                    <input type="text" value={planForm.name}
                                        onChange={e => setPlanForm({ ...planForm, name: e.target.value })}
                                        placeholder="e.g. Standard" className={inputCls} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('Description', 'விளக்கம்')}</label>
                                    <input type="text" value={planForm.description}
                                        onChange={e => setPlanForm({ ...planForm, description: e.target.value })}
                                        placeholder="Optional" className={inputCls} />
                                </div>
                            </div>

                            {/* ── Revenue Line Items ── */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('Revenue Line Items', 'வருவாய் வரி உருப்படிகள்')}</p>
                                        <p className="text-xs text-slate-400 dark:text-slate-500">{t('What you charge each school', 'ஒவ்வொரு பள்ளிக்கும் நீங்கள் வசூலிப்பது')}</p>
                                    </div>
                                    <button
                                        onClick={() => setRevenueItems(p => [...p, { label: '', metric: 'per_bus', unit_rate: '' }])}
                                        className="text-xs font-semibold text-[var(--brand)] hover:opacity-80 flex items-center gap-1"
                                    >
                                        <Plus className="w-3 h-3" /> {t('Add Row', 'வரிசை சேர்')}
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {revenueItems.map((li, i) => (
                                        <div key={i} className="flex gap-2 items-center">
                                            <input type="text" placeholder="Label" value={li.label}
                                                onChange={e => setRevenueItems(p => p.map((l, idx) => idx === i ? { ...l, label: e.target.value } : l))}
                                                className={cn(smallInput, 'flex-1')} />
                                            <select value={li.metric}
                                                onChange={e => setRevenueItems(p => p.map((l, idx) => idx === i ? { ...l, metric: e.target.value } : l))}
                                                className={smallInput}>
                                                {REVENUE_METRICS.map(m => <option key={m} value={m}>{m}</option>)}
                                            </select>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                                                <input type="number" placeholder="rate" value={li.unit_rate}
                                                    onChange={e => setRevenueItems(p => p.map((l, idx) => idx === i ? { ...l, unit_rate: e.target.value } : l))}
                                                    className={cn(smallInput, 'w-24 pl-7')} />
                                            </div>
                                            {revenueItems.length > 1 && (
                                                <button onClick={() => setRevenueItems(p => p.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600 p-1">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* ── Included Features (permissions this plan grants) ── */}
                            <div className="border-t border-slate-100 dark:border-slate-700 pt-5">
                                <div className="mb-3">
                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                        <Check className="w-4 h-4 text-emerald-500" /> {t('Included Features', 'உள்ளடங்கிய அம்சங்கள்')}
                                    </p>
                                    <p className="text-xs text-slate-400 dark:text-slate-500">{t('Turn OFF what this plan does not include. On assignment these toggles are enforced.', 'இந்த திட்டத்தில் இல்லாதவற்றை அணைக்கவும். ஒதுக்கும்போது இவை அமல்படுத்தப்படும்.')}</p>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {PLAN_FEATURES.map(f => {
                                        const on = planPermissions[f.key] !== false;
                                        return (
                                            <button
                                                key={f.key}
                                                type="button"
                                                onClick={() => setPlanPermissions(p => ({ ...p, [f.key]: !on }))}
                                                className={cn(
                                                    'flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all',
                                                    on
                                                        ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-900/20'
                                                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 opacity-70'
                                                )}
                                            >
                                                <span className={cn('mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0', on ? 'bg-emerald-500 text-white' : 'bg-slate-300 dark:bg-slate-600')}>
                                                    {on && <Check className="w-3 h-3" />}
                                                </span>
                                                <span className="min-w-0">
                                                    <span className="block text-xs font-semibold text-slate-800 dark:text-white">{f.label}</span>
                                                    <span className="block text-[11px] text-slate-400 dark:text-slate-500 leading-tight">{f.description}</span>
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* ── Monthly Operating Expenses ── */}
                            <div className="border-t border-slate-100 dark:border-slate-700 pt-5">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                            <TrendingDown className="w-4 h-4 text-red-400" /> {t('Monthly Operating Expenses', 'மாதாந்திர செயல்பாட்டு செலவுகள்')}
                                        </p>
                                        <p className="text-xs text-slate-400 dark:text-slate-500">{t('Your infrastructure costs (for planning only — not billed to schools)', 'உங்கள் உள்கட்டமைப்பு செலவுகள் (திட்டமிடலுக்கு மட்டும்)')}</p>
                                    </div>
                                    <button
                                        onClick={() => setExpenseItems(p => [...p, { label: '', unit_rate: '' }])}
                                        className="text-xs font-semibold text-red-400 hover:opacity-80 flex items-center gap-1"
                                    >
                                        <Plus className="w-3 h-3" /> {t('Add Row', 'வரிசை சேர்')}
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {expenseItems.map((e, i) => (
                                        <div key={i} className="flex gap-2 items-center">
                                            <input type="text" placeholder="e.g. Vercel Hosting" value={e.label}
                                                onChange={ev => setExpenseItems(p => p.map((x, idx) => idx === i ? { ...x, label: ev.target.value } : x))}
                                                className={cn(smallInput, 'flex-1')} />
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                                                <input type="number" placeholder="monthly cost" value={e.unit_rate}
                                                    onChange={ev => setExpenseItems(p => p.map((x, idx) => idx === i ? { ...x, unit_rate: ev.target.value } : x))}
                                                    className={cn(smallInput, 'w-36 pl-7')} />
                                            </div>
                                            <button onClick={() => setExpenseItems(p => p.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600 p-1">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* ── Profit Target ── */}
                            <div className="border-t border-slate-100 dark:border-slate-700 pt-5">
                                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-3">
                                    <IndianRupee className="w-4 h-4 text-emerald-500" /> {t('Profit Target', 'லாப இலக்கு')}
                                </p>
                                <div className="flex items-center gap-3">
                                    <div className="relative flex-1 max-w-[200px]">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                                        <input type="number" placeholder="e.g. 2000" value={profitAmount}
                                            onChange={e => setProfitAmount(e.target.value)}
                                            className={cn(inputCls, 'pl-7')} />
                                    </div>
                                    <p className="text-xs text-slate-400 dark:text-slate-500">{t('desired profit per school per month', 'ஒரு பள்ளிக்கு மாதம் விரும்பிய லாபம்')}</p>
                                </div>
                            </div>

                            {/* ── Live Calculation Preview ── */}
                            <div className="border-t border-slate-100 dark:border-slate-700 pt-5">
                                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">{t('Live Calculation Preview', 'நேரடி கணக்கீட்டு முன்னோட்டம்')}</p>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                                    {[
                                        { key: 'buses', label: 'Buses', icon: '🚌' },
                                        { key: 'students', label: 'Students', icon: '👦' },
                                        { key: 'routes', label: 'Routes', icon: '🗺️' },
                                        { key: 'schools', label: 'Total Schools', icon: '🏫' },
                                    ].map(({ key, label, icon }) => (
                                        <div key={key}>
                                            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">{icon} {label}</label>
                                            <input type="number" min="1" value={sample[key as keyof typeof sample]}
                                                onChange={e => setSample(p => ({ ...p, [key]: e.target.value }))}
                                                className={cn(smallInput, 'w-full')} />
                                        </div>
                                    ))}
                                </div>

                                <div className="bg-slate-50 dark:bg-slate-700/40 rounded-xl p-4 space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500 dark:text-slate-400">{t('Revenue from line items (this school)', 'வரி உருப்படிகளிலிருந்து வருவாய் (இந்த பள்ளி)')}</span>
                                        <span className="font-semibold text-slate-900 dark:text-white">₹{sampleRevenue.toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500 dark:text-slate-400">
                                            − {t('Expenses shared per school', 'பள்ளிக்கு பகிரப்பட்ட செலவுகள்')} (÷ {totalSchools})
                                        </span>
                                        <span className="font-semibold text-red-500 dark:text-red-400">− ₹{Math.round(perSchoolExpense).toLocaleString('en-IN')}</span>
                                    </div>
                                    {profitTarget > 0 && (
                                        <div className="flex justify-between">
                                            <span className="text-slate-500 dark:text-slate-400">− {t('Profit target', 'லாப இலக்கு')}</span>
                                            <span className="font-semibold text-slate-500 dark:text-slate-400">− ₹{profitTarget.toLocaleString('en-IN')}</span>
                                        </div>
                                    )}
                                    <div className="border-t border-slate-200 dark:border-slate-600 pt-2 flex justify-between items-center">
                                        <span className="font-semibold text-slate-700 dark:text-slate-300">{t('Net surplus / deficit', 'நிகர உபரி / பற்றாக்குறை')}</span>
                                        <span className={cn('font-bold text-base', netSurplus >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400')}>
                                            {netSurplus >= 0 ? '✅' : '❌'} ₹{Math.round(netSurplus).toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-400 dark:text-slate-500">{t('Effective margin', 'பயனுள்ள விளிம்பு')}</span>
                                        <span className={cn('font-semibold', margin >= 50 ? 'text-emerald-600 dark:text-emerald-400' : margin >= 0 ? 'text-amber-500' : 'text-red-500')}>
                                            {margin.toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 dark:border-slate-700 sticky bottom-0 bg-white dark:bg-slate-800">
                            <div className="flex gap-3">
                                <button onClick={resetPlanModal}
                                    className="flex-1 flex items-center justify-center bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-4 py-2.5 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                                    {t('Cancel', 'ரத்து செய்')}
                                </button>
                                <button onClick={handleSavePlan} disabled={submitting || !planForm.name}
                                    className="flex-1 flex items-center justify-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95 disabled:opacity-50">
                                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : editingPlanId ? t('Save Changes', 'மாற்றங்களை சேமி') : t('Add Plan', 'திட்டம் சேர்க்கவும்')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Generate Invoice Modal */}
            {showInvoiceModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('Generate Invoice', 'விலைப்பட்டியல் உருவாக்கு')}</h3>
                            <button onClick={() => setShowInvoiceModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 transition-colors"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('School', 'பள்ளி')}</label>
                                <select value={invoiceForm.school_id}
                                    onChange={e => setInvoiceForm({ ...invoiceForm, school_id: e.target.value })}
                                    className={inputCls}>
                                    <option value="">{t('Select school', 'பள்ளி தேர்வு செய்யுங்கள்')}</option>
                                    {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('Billing Month', 'பில்லிங் மாதம்')}</label>
                                <input type="month" value={invoiceForm.billing_month}
                                    onChange={e => setInvoiceForm({ ...invoiceForm, billing_month: e.target.value })}
                                    className={inputCls} />
                            </div>
                        </div>
                        <div className="px-6 pb-6 flex gap-3">
                            <button onClick={() => setShowInvoiceModal(false)} className="flex-1 flex items-center justify-center bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-4 py-2.5 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">{t('Cancel', 'ரத்து செய்')}</button>
                            <button onClick={handleGenerateInvoice} disabled={submitting || !invoiceForm.school_id}
                                className="flex-1 flex items-center justify-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95 disabled:opacity-50">
                                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : t('Generate', 'உருவாக்கு')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
