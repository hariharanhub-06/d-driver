'use client';

import { useState, useEffect } from 'react';
import { Settings, Key, Calendar, Shield, Loader2, Check, AlertCircle } from 'lucide-react';
import api from '@/lib/api';

interface BillingConfig {
  overdue_grace_days?: number;
  overdue_rate_type?: 'percentage' | 'fixed';
  overdue_rate?: number;
  billing_cycle_day?: number;
}

interface RazorpayStatus {
  configured: boolean;
}

export default function SASettingsPage() {
  // Razorpay state
  const [rzKeyId, setRzKeyId] = useState('');
  const [rzKeySecret, setRzKeySecret] = useState('');
  const [rzConfigured, setRzConfigured] = useState(false);
  const [rzSaving, setRzSaving] = useState(false);
  const [rzMsg, setRzMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Billing config state
  const [config, setConfig] = useState<BillingConfig>({
    overdue_grace_days: 7,
    overdue_rate_type: 'percentage',
    overdue_rate: 2,
    billing_cycle_day: 1,
  });
  const [cfgSaving, setCfgSaving] = useState(false);
  const [cfgMsg, setCfgMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [rzRes, cfgRes] = await Promise.allSettled([
        api.get('/billing/platform-razorpay'),
        api.get('/billing/config'),
      ]);
      if (rzRes.status === 'fulfilled') {
        setRzConfigured(rzRes.value.data?.configured ?? false);
      }
      if (cfgRes.status === 'fulfilled' && cfgRes.value.data) {
        setConfig(prev => ({ ...prev, ...cfgRes.value.data }));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRazorpay = async () => {
    if (!rzKeyId.trim() || !rzKeySecret.trim()) {
      setRzMsg({ type: 'error', text: 'Both Key ID and Key Secret are required.' });
      return;
    }
    setRzSaving(true);
    setRzMsg(null);
    try {
      await api.put('/billing/platform-razorpay', { key_id: rzKeyId.trim(), key_secret: rzKeySecret.trim() });
      setRzConfigured(true);
      setRzKeyId('');
      setRzKeySecret('');
      setRzMsg({ type: 'success', text: 'Razorpay keys saved successfully.' });
    } catch (err: any) {
      setRzMsg({ type: 'error', text: err.response?.data?.error || 'Failed to save keys.' });
    } finally {
      setRzSaving(false);
    }
  };

  const handleSaveConfig = async () => {
    setCfgSaving(true);
    setCfgMsg(null);
    try {
      const payload = {
        overdue_grace_days: Number(config.overdue_grace_days),
        overdue_rate_type: config.overdue_rate_type,
        overdue_rate: Number(config.overdue_rate),
        billing_cycle_day: Math.min(28, Math.max(1, Number(config.billing_cycle_day))),
      };
      await api.put('/billing/config', payload);
      setCfgMsg({ type: 'success', text: 'Billing configuration saved.' });
    } catch (err: any) {
      setCfgMsg({ type: 'error', text: err.response?.data?.error || 'Failed to save config.' });
    } finally {
      setCfgSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tighter flex items-center gap-3">
          <Settings className="w-7 h-7 text-primary-400" />
          Platform Settings
        </h1>
        <p className="text-white/30 text-xs font-bold uppercase tracking-widest mt-1">
          Razorpay credentials and billing configuration
        </p>
      </div>

      {/* ── Section 1: Razorpay Platform Keys ─────────────────────────────── */}
      <div className="bg-[#161b22] rounded-2xl border border-[#30363d] overflow-hidden">
        <div className="px-6 py-5 border-b border-[#30363d] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Key className="w-5 h-5 text-primary-400" />
            <h2 className="font-black text-white text-sm">Razorpay Platform Keys</h2>
          </div>
          <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
            rzConfigured
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          }`}>
            {rzConfigured ? (
              <><Check className="w-3 h-3" /> Configured</>
            ) : (
              <><AlertCircle className="w-3 h-3" /> Not Configured</>
            )}
          </span>
        </div>

        <div className="px-6 py-6 space-y-4">
          <p className="text-white/30 text-xs font-bold">
            These keys are encrypted and stored securely. Entering new keys will overwrite the existing ones.
          </p>

          <div>
            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-2">
              Platform Razorpay Key ID
            </label>
            <input
              type="text"
              value={rzKeyId}
              onChange={e => setRzKeyId(e.target.value)}
              placeholder="rzp_live_xxxxxxxxxxxxxxxxxx"
              autoComplete="off"
              className="w-full bg-white/5 border border-[#30363d] rounded-xl px-4 py-3 text-white text-sm font-mono outline-none focus:border-primary-500 transition-colors placeholder:text-white/20"
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-2">
              Platform Razorpay Secret Key
            </label>
            <input
              type="password"
              value={rzKeySecret}
              onChange={e => setRzKeySecret(e.target.value)}
              placeholder="••••••••••••••••••••••••"
              autoComplete="new-password"
              className="w-full bg-white/5 border border-[#30363d] rounded-xl px-4 py-3 text-white text-sm font-mono outline-none focus:border-primary-500 transition-colors placeholder:text-white/20"
            />
          </div>

          {rzMsg && (
            <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold border ${
              rzMsg.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-red-500/10 text-red-400 border-red-500/20'
            }`}>
              {rzMsg.type === 'success' ? <Check className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
              {rzMsg.text}
            </div>
          )}

          <button
            onClick={handleSaveRazorpay}
            disabled={rzSaving || !rzKeyId || !rzKeySecret}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#3B82F6] hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95"
          >
            {rzSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
            Save Keys
          </button>
        </div>
      </div>

      {/* ── Section 2: Billing Configuration ──────────────────────────────── */}
      <div className="bg-[#161b22] rounded-2xl border border-[#30363d] overflow-hidden">
        <div className="px-6 py-5 border-b border-[#30363d] flex items-center gap-3">
          <Calendar className="w-5 h-5 text-primary-400" />
          <h2 className="font-black text-white text-sm">Billing Configuration</h2>
        </div>

        <div className="px-6 py-6 space-y-5">
          {/* Grace days */}
          <div>
            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-2">
              Grace Days Before Overdue Penalty
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={0}
                max={90}
                value={config.overdue_grace_days ?? 7}
                onChange={e => setConfig(prev => ({ ...prev, overdue_grace_days: parseInt(e.target.value) || 0 }))}
                className="w-28 bg-white/5 border border-[#30363d] rounded-xl px-4 py-3 text-white text-sm font-bold outline-none focus:border-primary-500 transition-colors"
              />
              <span className="text-white/30 text-xs font-bold">days after due date</span>
            </div>
          </div>

          {/* Penalty type + rate */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-2">
                Penalty Type
              </label>
              <select
                value={config.overdue_rate_type ?? 'percentage'}
                onChange={e => setConfig(prev => ({ ...prev, overdue_rate_type: e.target.value as 'percentage' | 'fixed' }))}
                className="w-full bg-white/5 border border-[#30363d] rounded-xl px-4 py-3 text-white text-sm font-bold outline-none focus:border-primary-500 transition-colors"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (₹)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-2">
                Penalty Rate {config.overdue_rate_type === 'percentage' ? '(%)' : '(₹)'}
              </label>
              <input
                type="number"
                min={0}
                step={0.1}
                value={config.overdue_rate ?? 2}
                onChange={e => setConfig(prev => ({ ...prev, overdue_rate: parseFloat(e.target.value) || 0 }))}
                className="w-full bg-white/5 border border-[#30363d] rounded-xl px-4 py-3 text-white text-sm font-bold outline-none focus:border-primary-500 transition-colors"
              />
            </div>
          </div>

          {/* Billing cycle day */}
          <div>
            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-2">
              Billing Cycle Day (1–28)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={28}
                value={config.billing_cycle_day ?? 1}
                onChange={e => setConfig(prev => ({
                  ...prev,
                  billing_cycle_day: Math.min(28, Math.max(1, parseInt(e.target.value) || 1)),
                }))}
                className="w-28 bg-white/5 border border-[#30363d] rounded-xl px-4 py-3 text-white text-sm font-bold outline-none focus:border-primary-500 transition-colors"
              />
              <span className="text-white/30 text-xs font-bold">
                Invoices are due on day {config.billing_cycle_day ?? 1} of the month
              </span>
            </div>
          </div>

          {cfgMsg && (
            <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold border ${
              cfgMsg.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-red-500/10 text-red-400 border-red-500/20'
            }`}>
              {cfgMsg.type === 'success' ? <Check className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
              {cfgMsg.text}
            </div>
          )}

          <button
            onClick={handleSaveConfig}
            disabled={cfgSaving}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#3B82F6] hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95"
          >
            {cfgSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
            Save Config
          </button>
        </div>
      </div>
    </div>
  );
}
