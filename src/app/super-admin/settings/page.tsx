'use client';

import { useState, useEffect } from 'react';
import { Settings, Key, Calendar, Shield, Loader2, Check, AlertCircle, Lock, Link, User, Truck, Users, ShieldCheck, ImageIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
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

const inputCls = "w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[var(--brand)] transition-colors";

const PORTAL_URL = 'https://d-driver.vercel.app/login';

const PORTAL_LINKS = [
  { icon: ShieldCheck, label: 'Super Admin Portal', url: PORTAL_URL },
  { icon: Users, label: 'School Admin Portal', url: PORTAL_URL },
  { icon: Truck, label: 'Driver Portal', url: PORTAL_URL },
  { icon: User, label: 'Parent Portal', url: PORTAL_URL },
];

function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 transition-all active:scale-95"
    >
      <Check className={`w-3.5 h-3.5 transition-colors ${copied ? 'text-emerald-500' : 'opacity-0'}`} />
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

export default function SASettingsPage() {
  const { user } = useAuth();
  const isDevSA = (user as any)?.is_dev_sa === true;

  // Platform branding state (DEV SA only)
  const [platformLogo, setPlatformLogo] = useState('');
  const [platformLogoSaving, setPlatformLogoSaving] = useState(false);
  const [platformLogoMsg, setPlatformLogoMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  // Change password state
  const [cpForm, setCpForm] = useState({ current: '', newPw: '', confirm: '' });
  const [cpError, setCpError] = useState('');
  const [cpSuccess, setCpSuccess] = useState(false);
  const [cpLoading, setCpLoading] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [rzRes, cfgRes, platformRes] = await Promise.allSettled([
        api.get('/billing/platform-razorpay'),
        api.get('/billing/config'),
        api.get('/platform/config'),
      ]);
      if (rzRes.status === 'fulfilled') {
        setRzConfigured(rzRes.value.data?.configured ?? false);
      }
      if (cfgRes.status === 'fulfilled' && cfgRes.value.data) {
        setConfig(prev => ({ ...prev, ...cfgRes.value.data }));
      }
      if (platformRes.status === 'fulfilled' && platformRes.value.data?.platform_logo_url) {
        setPlatformLogo(platformRes.value.data.platform_logo_url);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSavePlatformLogo = async () => {
    setPlatformLogoSaving(true);
    setPlatformLogoMsg(null);
    try {
      await api.put('/platform/config', { platform_logo_url: platformLogo.trim() });
      setPlatformLogoMsg({ type: 'success', text: 'Platform logo updated.' });
    } catch (err: any) {
      setPlatformLogoMsg({ type: 'error', text: err.response?.data?.error || 'Failed to save.' });
    } finally {
      setPlatformLogoSaving(false);
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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setCpError(''); setCpSuccess(false);
    if (cpForm.newPw !== cpForm.confirm) { setCpError('Passwords do not match'); return; }
    if (cpForm.newPw.length < 8) { setCpError('Minimum 8 characters'); return; }
    setCpLoading(true);
    try {
      await api.post('/auth/change-password', { current_password: cpForm.current, new_password: cpForm.newPw });
      setCpSuccess(true);
      setCpForm({ current: '', newPw: '', confirm: '' });
    } catch (err: any) {
      setCpError(err.response?.data?.error || 'Failed to update password');
    } finally { setCpLoading(false); }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Settings className="w-7 h-7 text-[var(--brand)]" />
            Platform Settings
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Razorpay credentials and billing configuration
          </p>
        </div>
      </div>

      {/* Platform Branding — DEV SA only */}
      {isDevSA && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
            <ImageIcon className="w-5 h-5 text-[var(--brand)]" />
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white text-sm">Platform Branding</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Logo shown on the main D-Driver login page</p>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {platformLogo && (
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
                <img src={platformLogo} alt="Platform logo" className="w-12 h-12 rounded-xl object-contain bg-white p-1" />
                <div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Current Logo</p>
                  <p className="text-xs text-slate-400 font-mono truncate max-w-xs">{platformLogo}</p>
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Logo URL</label>
              <input type="url" value={platformLogo} onChange={e => setPlatformLogo(e.target.value)} placeholder="https://imagekit.io/your-logo.png" className={inputCls} />
              <p className="text-xs text-slate-400 mt-1.5">Upload your image to ImageKit and paste the URL here. Recommended: 200×60px PNG with transparent background.</p>
            </div>
            {platformLogoMsg && (
              <div className={`flex items-center gap-2 text-sm rounded-xl px-4 py-2.5 ${platformLogoMsg.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'}`}>
                {platformLogoMsg.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {platformLogoMsg.text}
              </div>
            )}
            <button onClick={handleSavePlatformLogo} disabled={platformLogoSaving || !platformLogo.trim()} className="bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-5 py-2.5 font-semibold text-sm transition-all disabled:opacity-50 flex items-center gap-2">
              {platformLogoSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Save Logo
            </button>
          </div>
        </div>
      )}

      {/* Portal Login Links */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
          <Link className="w-5 h-5 text-[var(--brand)]" />
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white text-sm">Portal Login Links</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Share these URLs with your users to access their dashboards</p>
          </div>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {PORTAL_LINKS.map(({ icon: Icon, label, url }) => (
            <div key={label} className="flex items-center justify-between px-6 py-4 gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[var(--brand)]/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-[var(--brand)]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{label}</p>
                  <p className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate">{url}</p>
                </div>
              </div>
              <CopyButton url={url} />
            </div>
          ))}
        </div>
      </div>

      {/* Razorpay Platform Keys */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Key className="w-5 h-5 text-[var(--brand)]" />
            <h2 className="font-semibold text-slate-900 dark:text-white text-sm">Razorpay Platform Keys</h2>
          </div>
          <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
            rzConfigured
              ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
              : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
          }`}>
            {rzConfigured ? (
              <><Check className="w-3 h-3" /> Configured</>
            ) : (
              <><AlertCircle className="w-3 h-3" /> Not Configured</>
            )}
          </span>
        </div>

        <div className="px-6 py-6 space-y-4">
          <p className="text-slate-500 dark:text-slate-400 text-xs">
            These keys are encrypted and stored securely. Entering new keys will overwrite the existing ones.
          </p>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Platform Razorpay Key ID
            </label>
            <input
              type="text"
              value={rzKeyId}
              onChange={e => setRzKeyId(e.target.value)}
              placeholder="rzp_live_xxxxxxxxxxxxxxxxxx"
              autoComplete="off"
              className={`${inputCls} font-mono`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Platform Razorpay Secret Key
            </label>
            <input
              type="password"
              value={rzKeySecret}
              onChange={e => setRzKeySecret(e.target.value)}
              placeholder="••••••••••••••••••••••••"
              autoComplete="new-password"
              className={`${inputCls} font-mono`}
            />
          </div>

          {rzMsg && (
            <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-medium border ${
              rzMsg.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
            }`}>
              {rzMsg.type === 'success' ? <Check className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
              {rzMsg.text}
            </div>
          )}

          <button
            onClick={handleSaveRazorpay}
            disabled={rzSaving || !rzKeyId || !rzKeySecret}
            className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-all active:scale-95"
          >
            {rzSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
            Save Keys
          </button>
        </div>
      </div>

      {/* Billing Configuration */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
          <Calendar className="w-5 h-5 text-[var(--brand)]" />
          <h2 className="font-semibold text-slate-900 dark:text-white text-sm">Billing Configuration</h2>
        </div>

        <div className="px-6 py-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Grace Days Before Overdue Penalty
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={0}
                max={90}
                value={config.overdue_grace_days ?? 7}
                onChange={e => setConfig(prev => ({ ...prev, overdue_grace_days: parseInt(e.target.value) || 0 }))}
                className="w-28 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[var(--brand)] transition-colors"
              />
              <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">days after due date</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Penalty Type
              </label>
              <select
                value={config.overdue_rate_type ?? 'percentage'}
                onChange={e => setConfig(prev => ({ ...prev, overdue_rate_type: e.target.value as 'percentage' | 'fixed' }))}
                className={inputCls}
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (₹)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Penalty Rate {config.overdue_rate_type === 'percentage' ? '(%)' : '(₹)'}
              </label>
              <input
                type="number"
                min={0}
                step={0.1}
                value={config.overdue_rate ?? 2}
                onChange={e => setConfig(prev => ({ ...prev, overdue_rate: parseFloat(e.target.value) || 0 }))}
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
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
                className="w-28 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[var(--brand)] transition-colors"
              />
              <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">
                Invoices are due on day {config.billing_cycle_day ?? 1} of the month
              </span>
            </div>
          </div>

          {cfgMsg && (
            <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-medium border ${
              cfgMsg.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
            }`}>
              {cfgMsg.type === 'success' ? <Check className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
              {cfgMsg.text}
            </div>
          )}

          <button
            onClick={handleSaveConfig}
            disabled={cfgSaving}
            className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-all active:scale-95"
          >
            {cfgSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
            Save Config
          </button>
        </div>
      </div>

      {/* Security — Change Password */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
          <Lock className="w-5 h-5 text-[var(--brand)]" />
          <h2 className="font-semibold text-slate-900 dark:text-white text-sm">Security — Change Password</h2>
        </div>

        <form onSubmit={handleChangePassword} className="px-6 py-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Current Password
            </label>
            <input
              type="password"
              value={cpForm.current}
              onChange={e => setCpForm(p => ({ ...p, current: e.target.value }))}
              placeholder="••••••••"
              required
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              New Password <span className="text-slate-400 font-normal">(min. 8 characters)</span>
            </label>
            <input
              type="password"
              value={cpForm.newPw}
              onChange={e => setCpForm(p => ({ ...p, newPw: e.target.value }))}
              placeholder="••••••••"
              required
              minLength={8}
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Confirm New Password
            </label>
            <input
              type="password"
              value={cpForm.confirm}
              onChange={e => setCpForm(p => ({ ...p, confirm: e.target.value }))}
              placeholder="••••••••"
              required
              className={inputCls}
            />
          </div>

          {cpError && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-medium border bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {cpError}
            </div>
          )}

          {cpSuccess && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-medium border bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
              <Check className="w-3.5 h-3.5 shrink-0" />
              Password updated successfully.
            </div>
          )}

          <button
            type="submit"
            disabled={cpLoading}
            className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-all active:scale-95"
          >
            {cpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
}
