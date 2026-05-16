'use client';

import { useState, useEffect } from 'react';
import {
  TrendingUp, Mail, Image, Zap, Database, Plus,
  Loader2, X, Trash2, AlertTriangle,
} from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface PlatformUsage {
  resend: { used: number; limit: number; unit: string };
  imagekit: { used_gb: number; limit_gb: number };
  razorpay: { fees_this_month: number };
  neon: { estimated_mb: number };
}

interface RevenueMonth {
  month: string;
  billed: number;
  collected: number;
}

interface RevenueData {
  total_collected: number;
  monthly_revenue: RevenueMonth[];
}

interface ManualExpense {
  id: string;
  label: string;
  category: string;
  amount: number;
  month: string;
  notes?: string;
  created_at: string;
}

const CATEGORIES = ['hosting', 'storage', 'email', 'payment', 'misc'] as const;

const CATEGORY_LABEL: Record<string, string> = {
  hosting: 'Hosting',
  storage: 'Storage',
  email: 'Email',
  payment: 'Payment Gateway',
  misc: 'Miscellaneous',
};

function ProgressBar({ pct }: { pct: number }) {
  const clamped = Math.min(100, Math.max(0, pct));
  const color = clamped > 80 ? 'bg-red-500' : clamped > 60 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mt-1.5">
      <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${clamped}%` }} />
    </div>
  );
}

export default function SAExpensesPage() {
  const [usage, setUsage] = useState<PlatformUsage | null>(null);
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [expenses, setExpenses] = useState<ManualExpense[]>([]);
  const [loading, setLoading] = useState(true);

  // Add expense modal
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    label: '',
    category: 'misc' as typeof CATEGORIES[number],
    amount: '',
    month: new Date().toISOString().slice(0, 7),
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [usageRes, revenueRes, expensesRes] = await Promise.allSettled([
      api.get('/billing/platform-usage'),
      api.get('/billing/revenue'),
      api.get('/billing/manual-expenses'),
    ]);
    if (usageRes.status === 'fulfilled') setUsage(usageRes.value.data);
    if (revenueRes.status === 'fulfilled') setRevenue(revenueRes.value.data);
    if (expensesRes.status === 'fulfilled') setExpenses(Array.isArray(expensesRes.value.data) ? expensesRes.value.data : []);
    setLoading(false);
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.label.trim() || !form.amount || !form.month) {
      setFormError('Label, amount and month are required.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/billing/manual-expenses', {
        label: form.label.trim(),
        category: form.category,
        amount: parseFloat(form.amount),
        month: form.month,
        notes: form.notes.trim() || undefined,
      });
      setShowModal(false);
      setForm({ label: '', category: 'misc', amount: '', month: new Date().toISOString().slice(0, 7), notes: '' });
      fetchAll();
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Failed to add expense.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this expense record?')) return;
    setDeletingId(id);
    try {
      await api.delete(`/billing/manual-expenses/${id}`);
      setExpenses(prev => prev.filter(e => e.id !== id));
    } catch {
      alert('Failed to delete expense.');
    } finally {
      setDeletingId(null);
    }
  };

  // Build revenue-vs-expenses table
  const revenueVsExpenses = (revenue?.monthly_revenue || []).map(m => {
    const manualForMonth = expenses
      .filter(e => e.month === m.month)
      .reduce((s, e) => s + e.amount, 0);
    const razorpayEst = m.collected * 0.02;
    const totalExpenses = manualForMonth + razorpayEst;
    const net = m.collected - totalExpenses;
    const margin = m.collected > 0 ? (net / m.collected) * 100 : 0;
    return { ...m, totalExpenses: Math.round(totalExpenses), net: Math.round(net), margin: Math.round(margin) };
  }).slice(-6).reverse();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const resendPct = usage ? (usage.resend.used / usage.resend.limit) * 100 : 0;
  const imagekitPct = usage ? (usage.imagekit.used_gb / usage.imagekit.limit_gb) * 100 : 0;
  const neonPct = Math.min(100, ((usage?.neon.estimated_mb ?? 0) / 512) * 100); // 512 MB free tier estimate

  return (
    <div className="space-y-8 animate-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tighter flex items-center gap-3">
          <TrendingUp className="w-7 h-7 text-primary-400" />
          Platform Expenses
        </h1>
        <p className="text-white/30 text-xs font-bold uppercase tracking-widest mt-1">
          Service usage, revenue vs costs, and manual expense log
        </p>
      </div>

      {/* ── Section 1: Service Cards ───────────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-4">Platform Services — This Month</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Resend */}
          <div className="bg-[#161b22] rounded-2xl border border-[#30363d] p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Mail className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="text-white font-black text-xs">Resend</p>
                <p className="text-white/30 text-[10px] font-bold">Email service</p>
              </div>
            </div>
            <p className={cn('text-2xl font-black', resendPct > 80 ? 'text-red-400' : 'text-white')}>
              {usage?.resend.used.toLocaleString() ?? 0}
            </p>
            <p className="text-white/30 text-[10px] font-bold mt-0.5">
              of {usage?.resend.limit.toLocaleString()} emails free
            </p>
            <ProgressBar pct={resendPct} />
            <p className={cn('text-[10px] font-black mt-1.5', resendPct > 80 ? 'text-red-400' : 'text-white/40')}>
              {resendPct.toFixed(0)}% used
            </p>
          </div>

          {/* ImageKit */}
          <div className="bg-[#161b22] rounded-2xl border border-[#30363d] p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <Image className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <p className="text-white font-black text-xs">ImageKit</p>
                <p className="text-white/30 text-[10px] font-bold">Media storage</p>
              </div>
            </div>
            <p className={cn('text-2xl font-black', imagekitPct > 80 ? 'text-red-400' : 'text-white')}>
              {usage?.imagekit.used_gb.toFixed(1) ?? 0} GB
            </p>
            <p className="text-white/30 text-[10px] font-bold mt-0.5">
              of {usage?.imagekit.limit_gb} GB free
            </p>
            <ProgressBar pct={imagekitPct} />
            <p className={cn('text-[10px] font-black mt-1.5', imagekitPct > 80 ? 'text-red-400' : 'text-white/40')}>
              {imagekitPct.toFixed(0)}% used
            </p>
          </div>

          {/* Razorpay */}
          <div className="bg-[#161b22] rounded-2xl border border-[#30363d] p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Zap className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-white font-black text-xs">Razorpay</p>
                <p className="text-white/30 text-[10px] font-bold">Payment fees (~2%)</p>
              </div>
            </div>
            <p className="text-2xl font-black text-white">
              ₹{(usage?.razorpay.fees_this_month ?? 0).toLocaleString('en-IN')}
            </p>
            <p className="text-white/30 text-[10px] font-bold mt-0.5">estimated this month</p>
            <div className="mt-3 text-[10px] font-bold text-white/30">Per-transaction cost</div>
          </div>

          {/* Neon DB */}
          <div className="bg-[#161b22] rounded-2xl border border-[#30363d] p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Database className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className="text-white font-black text-xs">Neon DB</p>
                <p className="text-white/30 text-[10px] font-bold">Postgres storage</p>
              </div>
            </div>
            <p className={cn('text-2xl font-black', neonPct > 80 ? 'text-red-400' : 'text-white')}>
              {usage?.neon.estimated_mb ?? 0} MB
            </p>
            <p className="text-white/30 text-[10px] font-bold mt-0.5">estimated usage</p>
            <ProgressBar pct={neonPct} />
            <p className={cn('text-[10px] font-black mt-1.5', neonPct > 80 ? 'text-red-400' : 'text-white/40')}>
              {neonPct.toFixed(0)}% of free tier
            </p>
          </div>
        </div>
      </div>

      {/* ── Section 2: Revenue vs Expenses ───────────────────────────────── */}
      <div className="bg-[#161b22] rounded-2xl border border-[#30363d] overflow-hidden">
        <div className="px-6 py-5 border-b border-[#30363d]">
          <h2 className="font-black text-white text-sm">Revenue vs Expenses — Last 6 Months</h2>
          <p className="text-white/30 text-[10px] font-bold mt-0.5">Expenses = Razorpay fees (est.) + manual expenses logged below</p>
        </div>
        {revenueVsExpenses.length === 0 ? (
          <div className="p-8 text-center text-white/20 font-bold text-sm">No revenue data available</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#30363d]">
                  {['Month', 'Revenue', 'Expenses (est.)', 'Net Profit', 'Margin'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[10px] font-black text-white/30 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30363d]">
                {revenueVsExpenses.map(row => (
                  <tr key={row.month} className="hover:bg-white/[0.02] transition-all">
                    <td className="px-5 py-4 font-bold text-white text-sm">{row.month}</td>
                    <td className="px-5 py-4 font-black text-emerald-400 text-sm">
                      ₹{row.collected.toLocaleString('en-IN')}
                    </td>
                    <td className="px-5 py-4 font-bold text-red-400 text-sm">
                      ₹{row.totalExpenses.toLocaleString('en-IN')}
                    </td>
                    <td className="px-5 py-4 font-black text-sm">
                      <span className={row.net >= 0 ? 'text-white' : 'text-red-400'}>
                        {row.net < 0 ? '-' : ''}₹{Math.abs(row.net).toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn(
                        'text-xs font-black px-2 py-0.5 rounded-full border',
                        row.margin > 50
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : row.margin > 0
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                      )}>
                        {row.margin}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Section 3: Manual Expense Log ────────────────────────────────── */}
      <div className="bg-[#161b22] rounded-2xl border border-[#30363d] overflow-hidden">
        <div className="px-6 py-5 border-b border-[#30363d] flex items-center justify-between">
          <div>
            <h2 className="font-black text-white text-sm">Manual Expense Log</h2>
            <p className="text-white/30 text-[10px] font-bold mt-0.5">Track hosting, domain, and other operational costs</p>
          </div>
          <button
            onClick={() => { setShowModal(true); setFormError(''); }}
            className="flex items-center gap-2 px-4 py-2 bg-[#3B82F6] hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" /> Add Expense
          </button>
        </div>

        {expenses.length === 0 ? (
          <div className="p-8 text-center text-white/20 font-bold text-sm">No manual expenses logged</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#30363d]">
                  {['Label', 'Category', 'Amount', 'Month', 'Notes', ''].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[10px] font-black text-white/30 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30363d]">
                {expenses.map(exp => (
                  <tr key={exp.id} className="hover:bg-white/[0.02] transition-all">
                    <td className="px-5 py-4 font-bold text-white text-sm">{exp.label}</td>
                    <td className="px-5 py-4">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-white/5 text-white/50 border border-white/10">
                        {CATEGORY_LABEL[exp.category] || exp.category}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-black text-white text-sm">
                      ₹{exp.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-5 py-4 font-bold text-white/60 text-sm">{exp.month}</td>
                    <td className="px-5 py-4 text-white/30 text-xs max-w-[200px] truncate">{exp.notes || '—'}</td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => handleDelete(exp.id)}
                        disabled={deletingId === exp.id}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-[10px] font-black border border-red-500/20 transition-all active:scale-95 disabled:opacity-50"
                      >
                        {deletingId === exp.id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <Trash2 className="w-3 h-3" />}
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-[#161b22] border border-[#30363d] rounded-[2rem] w-full max-w-md shadow-2xl">
            <div className="px-8 py-6 border-b border-[#30363d] flex items-center justify-between">
              <h3 className="text-lg font-black text-white">Add Expense</h3>
              <button onClick={() => setShowModal(false)} className="text-white/40 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="px-8 py-6 space-y-4">
              <div>
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-2">Label *</label>
                <input
                  type="text"
                  value={form.label}
                  onChange={e => setForm(p => ({ ...p, label: e.target.value }))}
                  placeholder="e.g. Render hosting — May"
                  required
                  className="w-full bg-white/5 border border-[#30363d] rounded-xl px-4 py-3 text-white text-sm font-bold outline-none focus:border-primary-500 transition-colors placeholder:text-white/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-2">Category</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(p => ({ ...p, category: e.target.value as typeof CATEGORIES[number] }))}
                    className="w-full bg-white/5 border border-[#30363d] rounded-xl px-4 py-3 text-white text-sm font-bold outline-none focus:border-primary-500 transition-colors"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-2">Amount (₹) *</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.amount}
                    onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                    placeholder="0.00"
                    required
                    className="w-full bg-white/5 border border-[#30363d] rounded-xl px-4 py-3 text-white text-sm font-bold outline-none focus:border-primary-500 transition-colors placeholder:text-white/20"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-2">Month *</label>
                <input
                  type="month"
                  value={form.month}
                  onChange={e => setForm(p => ({ ...p, month: e.target.value }))}
                  required
                  className="w-full bg-white/5 border border-[#30363d] rounded-xl px-4 py-3 text-white text-sm font-bold outline-none focus:border-primary-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-2">Notes (optional)</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Any additional details..."
                  rows={2}
                  className="w-full bg-white/5 border border-[#30363d] rounded-xl px-4 py-3 text-white text-sm font-bold outline-none focus:border-primary-500 transition-colors placeholder:text-white/20 resize-none"
                />
              </div>

              {formError && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {formError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white/60 rounded-xl font-bold text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-[#3B82F6] hover:bg-blue-500 text-white rounded-xl font-black text-sm disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
