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

const STATUS_STYLES: Record<string, string> = {
  paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  partial: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
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
        name: 'D-Driver Platform',
        description: `Invoice ${invoice.billing_month}`,
        order_id: order.id,
        theme: { color: '#3B82F6' },
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
      <div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
          <Receipt className="w-7 h-7 text-blue-600 dark:text-blue-400" />
          Billing &amp; Invoices
        </h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
          View your platform subscription invoices and payment history.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Current month */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-2xl p-5 shadow-sm">
          <p className="text-blue-100 text-[10px] font-black uppercase tracking-widest">This Month</p>
          <h3 className="text-3xl font-black mt-2">
            {currentInvoice ? `₹${currentInvoice.total_amount.toLocaleString('en-IN')}` : '—'}
          </h3>
          {currentInvoice && (
            <div className="mt-3 flex items-center gap-1.5">
              <span className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase',
                currentInvoice.status === 'paid'
                  ? 'bg-white/20 text-white'
                  : 'bg-amber-400/20 text-amber-200'
              )}>
                {STATUS_ICON[currentInvoice.status]}
                {currentInvoice.status}
              </span>
            </div>
          )}
        </div>

        {/* Total paid */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm">
          <p className="text-gray-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">Total Paid</p>
          <h3 className="text-3xl font-black mt-2 text-emerald-600 dark:text-emerald-400">
            ₹{totalPaid.toLocaleString('en-IN')}
          </h3>
          <div className="mt-3 text-[10px] text-gray-400 font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            All time paid invoices
          </div>
        </div>

        {/* Overdue */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm">
          <p className="text-gray-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">Overdue Balance</p>
          <h3 className={cn(
            'text-3xl font-black mt-2',
            totalOverdue > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-slate-500'
          )}>
            ₹{totalOverdue.toLocaleString('en-IN')}
          </h3>
          <div className="mt-3 text-[10px] text-gray-400 font-bold flex items-center gap-1.5">
            <AlertCircle className={cn('w-3.5 h-3.5', totalOverdue > 0 ? 'text-red-500' : 'text-gray-400')} />
            {totalOverdue > 0 ? 'Immediate action required' : 'No overdue balance'}
          </div>
        </div>
      </div>

      {/* Invoice list */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800">
          <h2 className="font-black text-gray-900 dark:text-white text-sm">Invoice History</h2>
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Receipt className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-bold">No invoices yet</p>
            <p className="text-sm mt-1 text-gray-300 dark:text-slate-500">
              Invoices will appear here once generated by your platform provider.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-slate-800">
            {invoices.map(inv => {
              const isExpanded = expanded === inv.id;
              const lineItems: LineItem[] = inv.line_items_snapshot?.line_items || [];

              return (
                <div key={inv.id} className="transition-all">
                  {/* Row */}
                  <div className="px-6 py-4 flex flex-wrap gap-4 items-center hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                    {/* Month */}
                    <div className="flex-1 min-w-[120px]">
                      <p className="font-bold text-gray-800 dark:text-white text-sm">{inv.billing_month}</p>
                      {inv.line_items_snapshot?.plan_name && (
                        <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                          {inv.line_items_snapshot.plan_name}
                        </p>
                      )}
                    </div>

                    {/* Amount */}
                    <div className="min-w-[100px]">
                      <p className="font-black text-gray-800 dark:text-white">
                        ₹{inv.total_amount.toLocaleString('en-IN')}
                      </p>
                      {inv.overdue_amount > 0 && (
                        <p className="text-[10px] text-red-400 font-bold">
                          incl. ₹{inv.overdue_amount.toLocaleString('en-IN')} penalty
                        </p>
                      )}
                    </div>

                    {/* Status */}
                    <div className="min-w-[80px]">
                      <span className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black capitalize',
                        STATUS_STYLES[inv.status] || STATUS_STYLES.pending
                      )}>
                        {STATUS_ICON[inv.status]}
                        {inv.status}
                      </span>
                    </div>

                    {/* Due date */}
                    <div className="min-w-[100px] text-xs text-gray-400 dark:text-slate-500">
                      {inv.due_date
                        ? `Due: ${new Date(inv.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`
                        : ''}
                    </div>

                    {/* Payment method */}
                    <div className="min-w-[80px] text-xs text-gray-400 dark:text-slate-500 capitalize">
                      {inv.payment_method || (inv.status === 'paid' ? 'online' : '—')}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-auto">
                      {(inv.status === 'pending' || inv.status === 'overdue') && (
                        <button
                          onClick={() => handlePayOnline(inv)}
                          disabled={paying === inv.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all active:scale-95 disabled:opacity-60"
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
                          className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 rounded-lg text-xs font-bold transition-all"
                        >
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          Details
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded breakdown */}
                  {isExpanded && lineItems.length > 0 && (
                    <div className="px-6 pb-5 bg-gray-50 dark:bg-slate-800/40 border-t border-gray-100 dark:border-slate-800">
                      <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest pt-4 pb-3">
                        Invoice Breakdown
                      </p>
                      <div className="rounded-xl overflow-hidden border border-gray-100 dark:border-slate-700">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-100 dark:bg-slate-800">
                              {['Line Item', 'Metric', 'Usage', 'Rate', 'Amount'].map(h => (
                                <th key={h} className="px-4 py-2.5 text-left text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-slate-700 bg-white dark:bg-slate-900">
                            {lineItems.map((li, i) => (
                              <tr key={i} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                                <td className="px-4 py-3 font-medium text-gray-800 dark:text-white">{li.label}</td>
                                <td className="px-4 py-3 text-gray-500 dark:text-slate-400 font-mono text-xs">{li.metric}</td>
                                <td className="px-4 py-3 text-gray-700 dark:text-slate-300 font-bold">
                                  {typeof li.quantity === 'number' ? li.quantity.toFixed(li.quantity % 1 === 0 ? 0 : 2) : li.quantity}
                                </td>
                                <td className="px-4 py-3 text-gray-700 dark:text-slate-300">
                                  <div className="flex items-center gap-0.5">
                                    <IndianRupee className="w-3 h-3" />
                                    {li.unit_rate}
                                  </div>
                                </td>
                                <td className="px-4 py-3 font-black text-gray-800 dark:text-white">
                                  ₹{li.charge.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </tr>
                            ))}
                            {/* Subtotal */}
                            <tr className="bg-gray-50 dark:bg-slate-800">
                              <td colSpan={4} className="px-4 py-2.5 text-right text-xs font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                                Subtotal
                              </td>
                              <td className="px-4 py-2.5 font-black text-gray-800 dark:text-white">
                                ₹{inv.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                            {inv.overdue_amount > 0 && (
                              <tr className="bg-red-50 dark:bg-red-900/10">
                                <td colSpan={4} className="px-4 py-2.5 text-right text-xs font-black text-red-500 uppercase tracking-wider">
                                  Overdue Penalty
                                </td>
                                <td className="px-4 py-2.5 font-black text-red-500">
                                  ₹{inv.overdue_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                            )}
                            <tr className="bg-blue-50 dark:bg-blue-900/10">
                              <td colSpan={4} className="px-4 py-2.5 text-right text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                                Total Due
                              </td>
                              <td className="px-4 py-2.5 font-black text-blue-700 dark:text-blue-300 text-base">
                                ₹{inv.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          </tbody>
                        </table>
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
