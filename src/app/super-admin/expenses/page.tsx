'use client';

import { useState, useEffect } from 'react';
import {
  TrendingUp, Mail, Image, Zap, Database, Plus,
  Loader2, X, Trash2, AlertTriangle, Info, ShieldCheck,
} from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useT } from '@/lib/i18n';

interface SchoolUsageRow {
  school_id: string | null;
  name: string;
  resend_sent: number;
  resend_failed: number;
  imagekit_storage_gb: number;
  imagekit_bandwidth_gb: number;
  razorpay_fees: number;
  location_rows: number;
  neon_mb: number;
}
interface PlatformUsage {
  resend: { used: number; limit: number; unit: string; used_today?: number; daily_limit?: number };
  imagekit: { used_gb: number; limit_gb: number };
  razorpay: { fees_this_month: number };
  neon: { estimated_mb: number; limit_mb?: number; location_rows?: number; retention_days?: number | null };
  schools_usage?: SchoolUsageRow[];
}

interface RevenueData {
  total_collected: number;
  active_schools: number;
  monthly_revenue: { month: string; billed: number; collected: number }[];
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

// Upgrade thresholds — DEV SA only. Figures assume an average school of 10 buses /
// 400 students, 2 trips a day of ~1.75 h, 22 school days a month.
const UPGRADE_THRESHOLDS = [
  { service: 'Render', upgradeAt: 1, nextUsd: 7, reason: 'Free tier spins down — WebSocket connections drop on idle', nextPlan: 'Starter ($7/mo)' },
  // Not a bandwidth trigger: Vercel's Hobby plan forbids commercial use, and we bill
  // schools through Razorpay. Pro is required by their terms from the first paying school.
  { service: 'Vercel', upgradeAt: 1, nextUsd: 20, reason: 'Hobby plan prohibits commercial use — we bill schools, so Pro is required from school #1', nextPlan: 'Pro ($20/mo)' },
  // The binding cap is 512 MB of storage, not compute hours. Location holds ~18.5 MB per
  // bus per month of live tracking; at the 90-day retention we promise schools, one
  // 10-bus school settles at ~690 MB (incl. index overhead) and exceeds the free tier by
  // itself. Free tier is not viable at any paying scale — budget Launch from school #1.
  { service: 'Neon DB', upgradeAt: 1, nextUsd: 19, reason: 'One 10-bus school settles at ~690 MB of location history at 90-day retention — over the 512 MB free cap on its own', nextPlan: 'Launch ($19/mo)' },
  // Render bundles 100 GB/month. Post-optimisation each school pushes ~5.3 GB of socket
  // traffic; without the per-bus-room fix it is ~158 GB and a single school blows the cap.
  { service: 'Render bandwidth', upgradeAt: 18, nextUsd: 25, reason: '~5.3 GB/month of socket egress per school against 100 GB included', nextPlan: 'Standard ($25/mo)' },
  // Resend's free tier is 100/day as well as 3,000/month. The daily cap binds first.
  { service: 'Resend', upgradeAt: 5, nextUsd: 20, reason: 'Free tier caps at 100 emails/DAY (not just 3,000/month) — fee reminders trip it early', nextPlan: 'Pro ($20/mo)' },
  { service: 'ImageKit', upgradeAt: 40, nextUsd: 9, reason: 'Bandwidth approaches the 20 GB/month limit at ~40 schools', nextPlan: 'Lite ($9/mo)' },
];

function upgradeStatus(upgradeAt: number, schoolCount: number): 'urgent' | 'soon' | 'safe' {
  if (schoolCount >= upgradeAt) return 'urgent';
  if (schoolCount >= Math.floor(upgradeAt * 0.7)) return 'soon';
  return 'safe';
}

function StatusBadge({ status }: { status: 'urgent' | 'soon' | 'safe' }) {
  if (status === 'urgent') return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400">
      🔴 Upgrade Now
    </span>
  );
  if (status === 'soon') return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">
      🟡 Plan Soon
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400">
      🟢 Safe
    </span>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  const clamped = Math.min(100, Math.max(0, pct));
  const color = clamped > 80 ? 'bg-red-500' : clamped > 60 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mt-1.5">
      <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${clamped}%` }} />
    </div>
  );
}

const inputCls = "w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors";

export default function SAExpensesPage() {
  const t = useT();
  const { user } = useAuth();
  const isDevSA = (user as any)?.is_dev_sa === true;

  const [usage, setUsage] = useState<PlatformUsage | null>(null);
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [expenses, setExpenses] = useState<ManualExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

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

  useEffect(() => { fetchAll(); }, []);

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
    if (!confirm(t('Delete this expense record?', 'இந்த செலவு பதிவை நீக்கவா?'))) return;
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
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Resend bills against a daily cap (100) as well as a monthly one (3,000). Show
  // whichever is closer to blowing, otherwise the daily limit is hit while the
  // monthly gauge still reads comfortably green.
  const resendMonthlyPct = usage ? (usage.resend.used / usage.resend.limit) * 100 : 0;
  const resendDailyPct =
    usage?.resend.used_today != null && usage?.resend.daily_limit
      ? (usage.resend.used_today / usage.resend.daily_limit) * 100
      : 0;
  const resendPct = Math.max(resendMonthlyPct, resendDailyPct);
  const imagekitPct = usage ? (usage.imagekit.used_gb / usage.imagekit.limit_gb) * 100 : 0;
  const neonPct = Math.min(100, ((usage?.neon.estimated_mb ?? 0) / (usage?.neon.limit_mb ?? 512)) * 100);
  const activeSchools = revenue?.active_schools ?? 0;

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <TrendingUp className="w-7 h-7 text-[var(--brand)]" />
            {t('Platform Expenses', 'தளச் செலவுகள்')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {t('Service usage, revenue vs costs', 'சேவை பயன்பாடு, வருவாய் vs செலவுகள்')}
          </p>
        </div>
      </div>

      {/* Service Cards */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Platform Services — This Month
          </p>
          {/* DEV SA only: infrastructure upgrade info button */}
          {isDevSA && (
            <button
              onClick={() => setShowUpgradeModal(true)}
              title="Infrastructure upgrade thresholds (visible to you only)"
              className="ml-1 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-[var(--brand)] transition-colors"
            >
              <Info className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Resend */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-slate-900 dark:text-white font-semibold text-xs">Resend</p>
                <p className="text-slate-500 dark:text-slate-400 text-xs">{t('Email service', 'மின்னஞ்சல் சேவை')}</p>
              </div>
            </div>
            <p className={cn('text-2xl font-bold', resendPct > 80 ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white')}>
              {usage?.resend.used.toLocaleString() ?? 0}
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
              {t('emails this month', 'இந்த மாத மின்னஞ்சல்கள்')}
            </p>
            <ProgressBar pct={resendPct} />
            <p className={cn('text-xs font-semibold mt-1.5', resendPct > 80 ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400')}>
              {resendPct.toFixed(0)}% used
            </p>
            {usage?.resend.used_today != null && usage?.resend.daily_limit && (
              <p className={cn(
                'text-xs mt-1',
                resendDailyPct > 80 ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-slate-400 dark:text-slate-500'
              )}>
                {usage.resend.used_today}/{usage.resend.daily_limit} {t('today', 'இன்று')}
                {resendDailyPct > 80 && ' — daily cap'}
              </p>
            )}
          </div>

          {/* ImageKit */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center">
                <Image className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-slate-900 dark:text-white font-semibold text-xs">ImageKit</p>
                <p className="text-slate-500 dark:text-slate-400 text-xs">{t('Media storage', 'மீடியா சேமிப்பு')}</p>
              </div>
            </div>
            <p className={cn('text-2xl font-bold', imagekitPct > 80 ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white')}>
              {usage?.imagekit.used_gb.toFixed(1) ?? 0} GB
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
              {t('media storage', 'மீடியா சேமிப்பு')}
            </p>
            <ProgressBar pct={imagekitPct} />
            <p className={cn('text-xs font-semibold mt-1.5', imagekitPct > 80 ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400')}>
              {imagekitPct.toFixed(0)}% used
            </p>
          </div>

          {/* Razorpay */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-slate-900 dark:text-white font-semibold text-xs">Razorpay</p>
                <p className="text-slate-500 dark:text-slate-400 text-xs">{t('Payment fees', 'கட்டண கட்டணங்கள்')} (~2%)</p>
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              ₹{(usage?.razorpay.fees_this_month ?? 0).toLocaleString('en-IN')}
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">{t('Estimated usage', 'மதிப்பிடப்பட்ட பயன்பாடு')}</p>
            <div className="mt-3 text-xs font-medium text-slate-400 dark:text-slate-500">Per-transaction cost</div>
          </div>

          {/* Neon DB */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
                <Database className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-slate-900 dark:text-white font-semibold text-xs">{t('Database', 'தரவுத்தளம்')}</p>
                <p className="text-slate-500 dark:text-slate-400 text-xs">Postgres storage</p>
              </div>
            </div>
            <p className={cn('text-2xl font-bold', neonPct > 80 ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white')}>
              {usage?.neon.estimated_mb ?? 0} MB
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
              {t('of', 'இல்')} {usage?.neon.limit_mb ?? 512} MB {t('free tier', 'இலவசம்')}
            </p>
            <ProgressBar pct={neonPct} />
            <p className={cn('text-xs font-semibold mt-1.5', neonPct > 80 ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400')}>
              {neonPct.toFixed(0)}% {t('used', 'பயன்படுத்தப்பட்டது')}
            </p>
            {usage?.neon.location_rows != null && (
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                {usage.neon.location_rows.toLocaleString()} {t('location rows', 'இருப்பிட வரிசைகள்')}
                {usage.neon.retention_days
                  ? ` — ${usage.neon.retention_days}d retention`
                  : ' — never purged'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Per-school usage — every integration as a column, one row per school */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700">
          <h2 className="font-semibold text-slate-900 dark:text-white text-sm">{t('Usage by School', 'பள்ளி வாரியான பயன்பாடு')}</h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">{t('Per-school usage across every integration this month', 'இந்த மாதம் ஒவ்வொரு பள்ளியின் பயன்பாடு')}</p>
        </div>
        {(usage?.schools_usage?.length ?? 0) === 0 ? (
          <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">{t('No usage data yet', 'தரவு இல்லை')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 text-left">
                  <th className="px-6 py-3 font-semibold text-slate-500 dark:text-slate-400">{t('School', 'பள்ளி')}</th>
                  <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">Resend ({t('Sent / Failed', 'அனுப்பியது / தோல்வி')})</th>
                  <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">ImageKit ({t('Store / Bandwidth', 'சேமிப்பு / பேண்ட்விட்த்')})</th>
                  <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">Razorpay</th>
                  <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">Neon ({t('Rows / Size', 'வரிசைகள் / அளவு')})</th>
                </tr>
              </thead>
              <tbody>
                {usage!.schools_usage!.map((s, i) => (
                  <tr key={(s.school_id || 'platform') + i} className="border-b border-slate-50 dark:border-slate-700/50 last:border-0">
                    <td className="px-6 py-3 font-medium text-slate-900 dark:text-white">{s.name}</td>
                    <td className="px-4 py-3">
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{s.resend_sent}</span>
                      <span className="text-slate-400"> / </span>
                      <span className={cn('font-semibold', s.resend_failed > 0 ? 'text-red-500' : 'text-slate-400')}>{s.resend_failed}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{s.imagekit_storage_gb} / {s.imagekit_bandwidth_gb} GB</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">₹{s.razorpay_fees.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      <span className="text-slate-400">{(s.location_rows ?? 0).toLocaleString('en-IN')}</span>
                      <span className="text-slate-300 dark:text-slate-600"> / </span>
                      <span className="font-semibold">{s.neon_mb} MB</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Revenue vs Expenses Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700">
          <h2 className="font-semibold text-slate-900 dark:text-white text-sm">{t('Revenue vs Costs', 'வருவாய் vs செலவுகள்')} — Last 6 Months</h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Expenses = Razorpay fees (est.) + manual expenses logged below</p>
        </div>
        {revenueVsExpenses.length === 0 ? (
          <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">{t('No expenses recorded', 'செலவுகள் பதிவு இல்லை')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700">
                  {[
                    'Month',
                    t('Revenue', 'வருவாய்'),
                    'Expenses (est.)',
                    'Net Profit',
                    'Margin',
                  ].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-700/50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {revenueVsExpenses.map(row => (
                  <tr key={row.month} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white text-sm">{row.month}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400 text-sm">
                      ₹{row.collected.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 font-medium text-red-600 dark:text-red-400 text-sm">
                      ₹{row.totalExpenses.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 font-semibold text-sm">
                      <span className={row.net >= 0 ? 'text-slate-900 dark:text-white' : 'text-red-600 dark:text-red-400'}>
                        {row.net < 0 ? '-' : ''}₹{Math.abs(row.net).toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'text-xs font-medium px-2.5 py-0.5 rounded-full',
                        row.margin > 50
                          ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                          : row.margin > 0
                            ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                            : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'
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

      {/* Manual Expense Log */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white text-sm">{t('Manual Expenses', 'கைமுறை செலவுகள்')}</h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Track hosting, domain, and other operational costs</p>
          </div>
          <button
            onClick={() => { setShowModal(true); setFormError(''); }}
            className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" /> {t('Add Expense', 'செலவு சேர்க்கவும்')}
          </button>
        </div>

        {expenses.length === 0 ? (
          <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">{t('No expenses recorded', 'செலவுகள் பதிவு இல்லை')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700">
                  {['Label', t('Category', 'வகை'), t('Amount', 'தொகை'), 'Month', 'Notes', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-700/50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expenses.map(exp => (
                  <tr key={exp.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white text-sm">{exp.label}</td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        {CATEGORY_LABEL[exp.category] || exp.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white text-sm">
                      ₹{exp.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300 text-sm">{exp.month}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs max-w-[200px] truncate">{exp.notes || '—'}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(exp.id)}
                        disabled={deletingId === exp.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-xl text-xs font-semibold border border-red-200 dark:border-red-800 transition-all active:scale-95 disabled:opacity-50"
                      >
                        {deletingId === exp.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                        {t('Delete', 'நீக்கு')}
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('Add Expense', 'செலவு சேர்க்கவும்')}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddExpense} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Label *</label>
                <input
                  type="text" value={form.label}
                  onChange={e => setForm(p => ({ ...p, label: e.target.value }))}
                  placeholder="e.g. Render hosting — May" required className={inputCls}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('Category', 'வகை')}</label>
                  <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value as typeof CATEGORIES[number] }))} className={inputCls}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('Amount', 'தொகை')} (₹) *</label>
                  <input
                    type="number" min={0} step={0.01} value={form.amount}
                    onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                    placeholder="0.00" required className={inputCls}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('Date', 'தேதி')} *</label>
                <input type="month" value={form.month} onChange={e => setForm(p => ({ ...p, month: e.target.value }))} required className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('Description', 'விளக்கம்')} (optional)</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Any additional details..." rows={2} className={`${inputCls} resize-none`} />
              </div>
              {formError && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-xs font-medium">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />{formError}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-4 py-2.5 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                  {t('Cancel', 'ரத்து செய்')}
                </button>
                <button type="submit" disabled={submitting} className="flex-1 flex items-center justify-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95 disabled:opacity-50">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('Add Expense', 'செலவு சேர்க்கவும்')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEV SA Only — Infrastructure Upgrade Thresholds Modal */}
      {isDevSA && showUpgradeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[var(--brand)]/10 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-[var(--brand)]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('Infrastructure Costs', 'உள்கட்டமைப்பு செலவுகள்')}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Based on active schools: <span className="font-semibold text-slate-700 dark:text-slate-300">{activeSchools}</span></p>
                </div>
              </div>
              <button onClick={() => setShowUpgradeModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-700">
                      {[t('Service', 'சேவை'), 'Upgrade At', 'Next Plan', 'Cost/mo', 'Reason', 'Status'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-700/50 first:rounded-tl-xl last:rounded-tr-xl whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {UPGRADE_THRESHOLDS.map((t, i) => {
                      const status = upgradeStatus(t.upgradeAt, activeSchools);
                      return (
                        <tr key={i} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                          <td className="px-3 py-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">{t.service}</td>
                          <td className="px-3 py-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">{t.upgradeAt === 1 ? 'Immediately' : `${t.upgradeAt} schools`}</td>
                          <td className="px-3 py-3 text-slate-700 dark:text-slate-300 whitespace-nowrap text-xs">{t.nextPlan}</td>
                          <td className="px-3 py-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">${t.nextUsd}</td>
                          <td className="px-3 py-3 text-slate-500 dark:text-slate-400 text-xs max-w-[200px]">{t.reason}</td>
                          <td className="px-3 py-3"><StatusBadge status={status} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Cost projection summary */}
              <div className="bg-slate-50 dark:bg-slate-700/40 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Cost Projection by Scale</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  {[
                    { label: '1 school',      usd: 27,  note: 'Render Starter + Vercel Pro' },
                    { label: '2–7 schools',   usd: 46,  note: '+ Neon Launch' },
                    { label: '8–17 schools',  usd: 66,  note: '+ Resend Pro' },
                    { label: '18–39 schools', usd: 91,  note: '+ Render Standard' },
                    { label: '40–70 schools', usd: 123, note: '+ ImageKit Lite + egress' },
                    { label: '71–100 schools', usd: 273, note: '+ Render Pro + Neon Scale' },
                  ].map(row => (
                    <div key={row.label} className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-600">
                      <p className="font-semibold text-slate-800 dark:text-white">{row.label}</p>
                      <p className="text-[var(--brand)] font-bold text-base">${row.usd}/mo</p>
                      <p className="text-slate-400 dark:text-slate-500 text-[10px] mt-0.5">{row.note}</p>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                This information is only visible to you.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
