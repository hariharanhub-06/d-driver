'use client';

import { useState, useEffect } from 'react';
import {
  Receipt, CreditCard, CheckCircle2, AlertCircle, Clock,
  ChevronDown, ChevronUp, Loader2, IndianRupee,
} from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface LineItem {
  label: string;
  metric: string;
  quantity: number;
  unit_rate: number;
  charge: number;
}

interface Invoice {
  id: string;
  billing_month: string;
  subtotal: number;
  overdue_amount: number;
  total_amount: number;
  status: 'pending' | 'paid' | 'overdue' | 'partial';
  due_date?: string;
  paid_at?: string;
  payment_method?: string;
  razorpay_order_id?: string;
  line_items_snapshot?: {
    plan_name?: string;
    line_items?: LineItem[];
    usage?: Record<string, number>;
  };
}

const STATUS_BADGE: Record<string, string> = {
  paid: 'inline-flex items-center bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full px-2.5 py-0.5 text-xs font-medium',
  overdue: 'inline-flex items-center bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full px-2.5 py-0.5 text-xs font-medium',
  partial: 'inline-flex items-center bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full px-2.5 py-0.5 text-xs font-medium',
  pending: 'inline-flex items-center bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full px-2.5 py-0.5 text-xs font-medium',
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  paid: <CheckCircle2 className="w-3.5 h-3.5" />,
  overdue: <AlertCircle className="w-3.5 h-3.5" />,
  partial: <Clock className="w-3.5 h-3.5" />,
  pending: <Clock className="w-3.5 h-3.5" />,
};

export default function AdminBillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [paying, setPaying] = useState<string | null>(null);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/billing/my-invoices');
      setInvoices(Array.isArray(data) ? data : []);
    } catch {
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePayOnline = async (invoice: Invoice) => {
    setPaying(invoice.id);
    try {
      const { data } = await api.post(`/billing/invoices/${invoice.id}/pay-online`, {});
      const { order } = data;

      if (typeof window === 'undefined' || !(window as any).Razorpay) {
        alert('Razorpay SDK not loaded. Please refresh and try again.');
        return;
      }

      const rzp = new (window as any).Razorpay({
        key: order.key_id || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: 'Onlive Platform',
        description: `Invoice ${invoice.billing_month}`,
        order_id: order.id,
        theme: { color: 'var(--brand)' },
        handler: () => {
          fetchInvoices();
        },
      });
      rzp.open();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to initiate payment.');
    } finally {
      setPaying(null);
    }
  };

  // Stats
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentInvoice = invoices.find(inv => inv.billing_month === thisMonth);
  const totalPaid = invoices
    .filter(inv => inv.status === 'paid')
    .reduce((s, inv) => s + inv.total_amount, 0);
  const totalOverdue = invoices
    .filter(inv => inv.status === 'overdue')
    .reduce((s, inv) => s + inv.total_amount, 0);

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Receipt className="w-7 h-7 text-[var(--brand)]" />
            Billing &amp; Invoices
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            View your platform subscription invoices and payment history.
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Current month */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
          <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">This Month</p>
          <h3 className="text-3xl font-bold mt-2 text-slate-900 dark:text-white">
            {currentInvoice ? `₹${currentInvoice.total_amount.toLocaleString('en-IN')}` : '—'}
          </h3>
          {currentInvoice && (
            <div className="mt-3 flex items-center gap-1.5">
              <span className={cn(STATUS_BADGE[currentInvoice.status] || STATUS_BADGE.pending, 'gap-1')}>
                {STATUS_ICON[currentInvoice.status]}
                {currentInvoice.status}
              </span>
            </div>
          )}
        </div>

        {/* Total paid */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
          <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Paid</p>
          <h3 className="text-3xl font-bold mt-2 text-emerald-600 dark:text-emerald-400">
            ₹{totalPaid.toLocaleString('en-IN')}
          </h3>
          <div className="mt-3 text-xs text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            All time paid invoices
          </div>
        </div>

        {/* Overdue */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
          <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Overdue Balance</p>
          <h3 className={cn(
            'text-3xl font-bold mt-2',
            totalOverdue > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400 dark:text-slate-500'
          )}>
            ₹{totalOverdue.toLocaleString('en-IN')}
          </h3>
          <div className="mt-3 text-xs text-slate-400 flex items-center gap-1.5">
            <AlertCircle className={cn('w-3.5 h-3.5', totalOverdue > 0 ? 'text-red-500' : 'text-slate-400')} />
            {totalOverdue > 0 ? 'Immediate action required' : 'No overdue balance'}
          </div>
        </div>
      </div>

      {/* Invoice list */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="font-bold text-slate-900 dark:text-white text-sm">Invoice History</h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin"></div></div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">
            <Receipt className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">No invoices yet</p>
            <p className="text-sm mt-1">
              Invoices will appear here once generated by your platform provider.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {invoices.map(inv => {
              const isExpanded = expanded === inv.id;
              const lineItems: LineItem[] = inv.line_items_snapshot?.line_items || [];

              return (
                <div key={inv.id} className="transition-all">
                  {/* Row */}
                  <div className="px-6 py-4 flex flex-wrap gap-4 items-center hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    {/* Month */}
                    <div className="flex-1 min-w-[120px]">
                      <p className="font-bold text-slate-800 dark:text-white text-sm">{inv.billing_month}</p>
                      {inv.line_items_snapshot?.plan_name && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                          {inv.line_items_snapshot.plan_name}
                        </p>
                      )}
                    </div>

                    {/* Amount */}
                    <div className="min-w-[100px]">
                      <p className="font-bold text-slate-800 dark:text-white">
                        ₹{inv.total_amount.toLocaleString('en-IN')}
                      </p>
                      {inv.overdue_amount > 0 && (
                        <p className="text-xs text-red-400 font-semibold">
                          incl. ₹{inv.overdue_amount.toLocaleString('en-IN')} penalty
                        </p>
                      )}
                    </div>

                    {/* Status */}
                    <div className="min-w-[80px]">
                      <span className={cn(STATUS_BADGE[inv.status] || STATUS_BADGE.pending, 'gap-1 capitalize')}>
                        {STATUS_ICON[inv.status]}
                        {inv.status}
                      </span>
                    </div>

                    {/* Due date */}
                    <div className="min-w-[100px] text-xs text-slate-400 dark:text-slate-500">
                      {inv.due_date
                        ? `Due: ${new Date(inv.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`
                        : ''}
                    </div>

                    {/* Payment method */}
                    <div className="min-w-[80px] text-xs text-slate-400 dark:text-slate-500 capitalize">
                      {inv.payment_method || (inv.status === 'paid' ? 'online' : '—')}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-auto">
                      {(inv.status === 'pending' || inv.status === 'overdue') && (
                        <button
                          onClick={() => handlePayOnline(inv)}
                          disabled={paying === inv.id}
                          className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95 disabled:opacity-60"
                        >
                          {paying === inv.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <CreditCard className="w-3.5 h-3.5" />}
                          Pay Online
                        </button>
                      )}
                      {lineItems.length > 0 && (
                        <button
                          onClick={() => setExpanded(isExpanded ? null : inv.id)}
                          className="flex items-center gap-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl px-4 py-2.5 font-semibold text-sm"
                        >
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          Details
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded breakdown */}
                  {isExpanded && lineItems.length > 0 && (
                    <div className="px-6 pb-5 bg-slate-50 dark:bg-slate-700/30 border-t border-slate-100 dark:border-slate-700">
                      <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest pt-4 pb-3">
                        Invoice Breakdown
                      </p>
                      <div className="rounded-xl overflow-hidden border border-slate-100 dark:border-slate-700">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                              <tr>
                                {['Line Item', 'Metric', 'Usage', 'Rate', 'Amount'].map(h => (
                                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-slate-800">
                              {lineItems.map((li, i) => (
                                <tr key={i} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                  <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 font-medium">{li.label}</td>
                                  <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 font-mono text-xs">{li.metric}</td>
                                  <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 font-bold">
                                    {typeof li.quantity === 'number' ? li.quantity.toFixed(li.quantity % 1 === 0 ? 0 : 2) : li.quantity}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                    <div className="flex items-center gap-0.5">
                                      <IndianRupee className="w-3 h-3" />
                                      {li.unit_rate}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 font-bold">
                                    ₹{li.charge.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              ))}
                              {/* Subtotal */}
                              <tr className="bg-slate-50 dark:bg-slate-700/30">
                                <td colSpan={4} className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                  Subtotal
                                </td>
                                <td className="px-4 py-2.5 font-bold text-slate-800 dark:text-white">
                                  ₹{inv.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                              {inv.overdue_amount > 0 && (
                                <tr className="bg-red-50 dark:bg-red-900/10">
                                  <td colSpan={4} className="px-4 py-2.5 text-right text-xs font-semibold text-red-500 uppercase tracking-wider">
                                    Overdue Penalty
                                  </td>
                                  <td className="px-4 py-2.5 font-bold text-red-500">
                                    ₹{inv.overdue_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              )}
                              <tr className="bg-blue-50 dark:bg-blue-900/10">
                                <td colSpan={4} className="px-4 py-2.5 text-right text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                                  Total Due
                                </td>
                                <td className="px-4 py-2.5 font-bold text-blue-700 dark:text-blue-300 text-base">
                                  ₹{inv.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
