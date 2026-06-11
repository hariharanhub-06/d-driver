'use client';

import { useState, useEffect } from 'react';
import {
  Settings, Key, Calendar, Shield, Loader2, Check, AlertCircle, Lock,
  Link, User, Truck, Users, ShieldCheck, ImageIcon, Globe, Plus, Pencil,
  Trash2, X, Building2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import ImageUpload from '@/components/ui/ImageUpload';

interface BillingConfig {
  overdue_grace_days?: number;
  overdue_rate_type?: 'percentage' | 'fixed';
  overdue_rate?: number;
  billing_cycle_day?: number;
}

interface RazorpayStatus {
  configured: boolean;
}

interface Partner {
  id: number;
  name: string;
  logo_url?: string;
  website?: string;
  sort_order?: number;
}

interface Founder {
  id: number;
  name: string;
  title?: string;
  photo_url?: string;
  linkedin?: string;
  sort_order?: number;
}

interface LandingConfig {
  product_name?: string;
  landing_badge?: string;
  landing_title?: string;
  landing_subtitle?: string;
  landing_cta_text?: string;
  landing_footer_tagline?: string;
  landing_footer_email?: string;
  landing_footer_phone?: string;
  landing_footer_address?: string;
  landing_footer_copyright?: string;
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

function MsgBanner({ msg }: { msg: { type: 'success' | 'error'; text: string } }) {
  return (
    <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-medium border ${
      msg.type === 'success'
        ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
        : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
    }`}>
      {msg.type === 'success' ? <Check className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
      {msg.text}
    </div>
  );
}

// ─── Landing Page Tab ────────────────────────────────────────────────────────

function LandingPageTab() {
  // Hero & Footer
  const [heroForm, setHeroForm] = useState<LandingConfig>({});
  const [heroLoading, setHeroLoading] = useState(true);
  const [heroSaving, setHeroSaving] = useState(false);
  const [heroMsg, setHeroMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Partners
  const [partners, setPartners] = useState<Partner[]>([]);
  const [partnersLoading, setPartnersLoading] = useState(true);
  const [showAddPartner, setShowAddPartner] = useState(false);
  const [partnerForm, setPartnerForm] = useState({ name: '', logo_url: '', website: '', sort_order: '' });
  const [partnerSaving, setPartnerSaving] = useState(false);
  const [partnerMsg, setPartnerMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [editPartnerForm, setEditPartnerForm] = useState({ name: '', logo_url: '', website: '', sort_order: '' });
  const [editPartnerSaving, setEditPartnerSaving] = useState(false);

  // Founders
  const [founders, setFounders] = useState<Founder[]>([]);
  const [foundersLoading, setFoundersLoading] = useState(true);
  const [showAddFounder, setShowAddFounder] = useState(false);
  const [founderForm, setFounderForm] = useState({ name: '', title: '', photo_url: '', linkedin: '', sort_order: '' });
  const [founderSaving, setFounderSaving] = useState(false);
  const [founderMsg, setFounderMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingFounder, setEditingFounder] = useState<Founder | null>(null);
  const [editFounderForm, setEditFounderForm] = useState({ name: '', title: '', photo_url: '', linkedin: '', sort_order: '' });
  const [editFounderSaving, setEditFounderSaving] = useState(false);

  useEffect(() => {
    fetchHero();
    fetchPartners();
    fetchFounders();
  }, []);

  // ── Hero & Footer ──────────────────────────────────────────────────────────

  const fetchHero = async () => {
    setHeroLoading(true);
    try {
      const res = await api.get('/platform/config');
      if (res.data) {
        setHeroForm({
          product_name: res.data.product_name ?? '',
          landing_badge: res.data.landing_badge ?? '',
          landing_title: res.data.landing_title ?? '',
          landing_subtitle: res.data.landing_subtitle ?? '',
          landing_cta_text: res.data.landing_cta_text ?? '',
          landing_footer_tagline: res.data.landing_footer_tagline ?? '',
          landing_footer_email: res.data.landing_footer_email ?? '',
          landing_footer_phone: res.data.landing_footer_phone ?? '',
          landing_footer_address: res.data.landing_footer_address ?? '',
          landing_footer_copyright: res.data.landing_footer_copyright ?? '',
        });
      }
    } catch {
      // silently ignore
    } finally {
      setHeroLoading(false);
    }
  };

  const handleSaveHero = async () => {
    setHeroSaving(true);
    setHeroMsg(null);
    try {
      await api.put('/platform/config', heroForm);
      setHeroMsg({ type: 'success', text: 'Landing page content saved.' });
    } catch (err: any) {
      setHeroMsg({ type: 'error', text: err.response?.data?.error || 'Failed to save.' });
    } finally {
      setHeroSaving(false);
    }
  };

  // ── Partners ───────────────────────────────────────────────────────────────

  const fetchPartners = async () => {
    setPartnersLoading(true);
    try {
      const res = await api.get('/platform/partners');
      setPartners(res.data ?? []);
    } catch {
      setPartners([]);
    } finally {
      setPartnersLoading(false);
    }
  };

  const handleAddPartner = async () => {
    if (!partnerForm.name.trim()) {
      setPartnerMsg({ type: 'error', text: 'Partner name is required.' });
      return;
    }
    setPartnerSaving(true);
    setPartnerMsg(null);
    try {
      await api.post('/platform/partners', {
        name: partnerForm.name.trim(),
        logo_url: partnerForm.logo_url.trim() || undefined,
        website: partnerForm.website.trim() || undefined,
        sort_order: partnerForm.sort_order ? parseInt(partnerForm.sort_order) : undefined,
      });
      setPartnerForm({ name: '', logo_url: '', website: '', sort_order: '' });
      setShowAddPartner(false);
      setPartnerMsg({ type: 'success', text: 'Partner added.' });
      fetchPartners();
    } catch (err: any) {
      setPartnerMsg({ type: 'error', text: err.response?.data?.error || 'Failed to add partner.' });
    } finally {
      setPartnerSaving(false);
    }
  };

  const handleStartEditPartner = (p: Partner) => {
    setEditingPartner(p);
    setEditPartnerForm({
      name: p.name,
      logo_url: p.logo_url ?? '',
      website: p.website ?? '',
      sort_order: p.sort_order != null ? String(p.sort_order) : '',
    });
  };

  const handleSaveEditPartner = async () => {
    if (!editingPartner) return;
    if (!editPartnerForm.name.trim()) return;
    setEditPartnerSaving(true);
    try {
      await api.put(`/platform/partners/${editingPartner.id}`, {
        name: editPartnerForm.name.trim(),
        logo_url: editPartnerForm.logo_url.trim() || undefined,
        website: editPartnerForm.website.trim() || undefined,
        sort_order: editPartnerForm.sort_order ? parseInt(editPartnerForm.sort_order) : undefined,
      });
      setEditingPartner(null);
      setPartnerMsg({ type: 'success', text: 'Partner updated.' });
      fetchPartners();
    } catch (err: any) {
      setPartnerMsg({ type: 'error', text: err.response?.data?.error || 'Failed to update partner.' });
    } finally {
      setEditPartnerSaving(false);
    }
  };

  const handleDeletePartner = async (id: number) => {
    if (!confirm('Delete this partner?')) return;
    try {
      await api.delete(`/platform/partners/${id}`);
      setPartnerMsg({ type: 'success', text: 'Partner deleted.' });
      fetchPartners();
    } catch (err: any) {
      setPartnerMsg({ type: 'error', text: err.response?.data?.error || 'Failed to delete partner.' });
    }
  };

  // ── Founders ───────────────────────────────────────────────────────────────

  const fetchFounders = async () => {
    setFoundersLoading(true);
    try {
      const res = await api.get('/platform/founders');
      setFounders(res.data ?? []);
    } catch {
      setFounders([]);
    } finally {
      setFoundersLoading(false);
    }
  };

  const handleAddFounder = async () => {
    if (!founderForm.name.trim()) {
      setFounderMsg({ type: 'error', text: 'Founder name is required.' });
      return;
    }
    setFounderSaving(true);
    setFounderMsg(null);
    try {
      await api.post('/platform/founders', {
        name: founderForm.name.trim(),
        title: founderForm.title.trim() || undefined,
        photo_url: founderForm.photo_url.trim() || undefined,
        linkedin: founderForm.linkedin.trim() || undefined,
        sort_order: founderForm.sort_order ? parseInt(founderForm.sort_order) : undefined,
      });
      setFounderForm({ name: '', title: '', photo_url: '', linkedin: '', sort_order: '' });
      setShowAddFounder(false);
      setFounderMsg({ type: 'success', text: 'Founder added.' });
      fetchFounders();
    } catch (err: any) {
      setFounderMsg({ type: 'error', text: err.response?.data?.error || 'Failed to add founder.' });
    } finally {
      setFounderSaving(false);
    }
  };

  const handleStartEditFounder = (f: Founder) => {
    setEditingFounder(f);
    setEditFounderForm({
      name: f.name,
      title: f.title ?? '',
      photo_url: f.photo_url ?? '',
      linkedin: f.linkedin ?? '',
      sort_order: f.sort_order != null ? String(f.sort_order) : '',
    });
  };

  const handleSaveEditFounder = async () => {
    if (!editingFounder) return;
    if (!editFounderForm.name.trim()) return;
    setEditFounderSaving(true);
    try {
      await api.put(`/platform/founders/${editingFounder.id}`, {
        name: editFounderForm.name.trim(),
        title: editFounderForm.title.trim() || undefined,
        photo_url: editFounderForm.photo_url.trim() || undefined,
        linkedin: editFounderForm.linkedin.trim() || undefined,
        sort_order: editFounderForm.sort_order ? parseInt(editFounderForm.sort_order) : undefined,
      });
      setEditingFounder(null);
      setFounderMsg({ type: 'success', text: 'Founder updated.' });
      fetchFounders();
    } catch (err: any) {
      setFounderMsg({ type: 'error', text: err.response?.data?.error || 'Failed to update founder.' });
    } finally {
      setEditFounderSaving(false);
    }
  };

  const handleDeleteFounder = async (id: number) => {
    if (!confirm('Delete this founder?')) return;
    try {
      await api.delete(`/platform/founders/${id}`);
      setFounderMsg({ type: 'success', text: 'Founder deleted.' });
      fetchFounders();
    } catch (err: any) {
      setFounderMsg({ type: 'error', text: err.response?.data?.error || 'Failed to delete founder.' });
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Section 1: Hero & Footer Content */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
          <Globe className="w-5 h-5 text-[var(--brand)]" />
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white text-sm">Hero & Footer Content</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Text shown on the public landing page</p>
          </div>
        </div>

        {heroLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--brand)]" />
          </div>
        ) : (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Product Name</label>
                <input
                  type="text"
                  value={heroForm.product_name ?? ''}
                  onChange={e => setHeroForm(p => ({ ...p, product_name: e.target.value }))}
                  placeholder="D-Driver"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Hero Badge Text</label>
                <input
                  type="text"
                  value={heroForm.landing_badge ?? ''}
                  onChange={e => setHeroForm(p => ({ ...p, landing_badge: e.target.value }))}
                  placeholder="School Transport OS"
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Hero Title</label>
              <textarea
                rows={2}
                value={heroForm.landing_title ?? ''}
                onChange={e => setHeroForm(p => ({ ...p, landing_title: e.target.value }))}
                placeholder="The modern platform for school bus management"
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Hero Subtitle</label>
              <textarea
                rows={2}
                value={heroForm.landing_subtitle ?? ''}
                onChange={e => setHeroForm(p => ({ ...p, landing_subtitle: e.target.value }))}
                placeholder="Track buses in real-time, manage fees, and keep parents informed."
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">CTA Button Text</label>
              <input
                type="text"
                value={heroForm.landing_cta_text ?? ''}
                onChange={e => setHeroForm(p => ({ ...p, landing_cta_text: e.target.value }))}
                placeholder="Get Started"
                className={inputCls}
              />
            </div>

            <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Footer</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Footer Tagline</label>
                  <textarea
                    rows={2}
                    value={heroForm.landing_footer_tagline ?? ''}
                    onChange={e => setHeroForm(p => ({ ...p, landing_footer_tagline: e.target.value }))}
                    placeholder="Powering safe, connected school transport."
                    className={inputCls}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Footer Email</label>
                    <input
                      type="email"
                      value={heroForm.landing_footer_email ?? ''}
                      onChange={e => setHeroForm(p => ({ ...p, landing_footer_email: e.target.value }))}
                      placeholder="hello@example.com"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Footer Phone <span className="text-slate-400 font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={heroForm.landing_footer_phone ?? ''}
                      onChange={e => setHeroForm(p => ({ ...p, landing_footer_phone: e.target.value }))}
                      placeholder="+91 98765 43210"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Footer Address <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={heroForm.landing_footer_address ?? ''}
                    onChange={e => setHeroForm(p => ({ ...p, landing_footer_address: e.target.value }))}
                    placeholder="123 Main Street, Chennai, India"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Footer Copyright</label>
                  <input
                    type="text"
                    value={heroForm.landing_footer_copyright ?? ''}
                    onChange={e => setHeroForm(p => ({ ...p, landing_footer_copyright: e.target.value }))}
                    placeholder="© 2026 D-Driver. All rights reserved."
                    className={inputCls}
                  />
                </div>
              </div>
            </div>

            {heroMsg && <MsgBanner msg={heroMsg} />}

            <button
              onClick={handleSaveHero}
              disabled={heroSaving}
              className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-all active:scale-95"
            >
              {heroSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Save Changes
            </button>
          </div>
        )}
      </div>

      {/* Section 2: Partners */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-[var(--brand)]" />
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white text-sm">Partners</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Logos shown in the partners section of the landing page</p>
            </div>
          </div>
          <button
            onClick={() => { setShowAddPartner(v => !v); setPartnerMsg(null); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--brand)]/10 hover:bg-[var(--brand)]/20 text-[var(--brand)] rounded-xl text-xs font-semibold transition-all"
          >
            {showAddPartner ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {showAddPartner ? 'Cancel' : 'Add Partner'}
          </button>
        </div>

        <div className="p-6 space-y-4">
          {partnerMsg && <MsgBanner msg={partnerMsg} />}

          {/* Add Partner form */}
          {showAddPartner && (
            <div className="bg-slate-50 dark:bg-slate-700/40 rounded-xl p-4 space-y-3 border border-slate-200 dark:border-slate-600">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">New Partner</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Name *</label>
                  <input type="text" value={partnerForm.name} onChange={e => setPartnerForm(p => ({ ...p, name: e.target.value }))} placeholder="Acme Corp" className={inputCls} />
                </div>
                <div>
                  <ImageUpload
                    value={partnerForm.logo_url}
                    onChange={url => setPartnerForm(p => ({ ...p, logo_url: url }))}
                    folder="partners"
                    label="Logo"
                    shape="square"
                    previewSize="sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Website</label>
                  <input type="url" value={partnerForm.website} onChange={e => setPartnerForm(p => ({ ...p, website: e.target.value }))} placeholder="https://acme.com" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Sort Order</label>
                  <input type="number" value={partnerForm.sort_order} onChange={e => setPartnerForm(p => ({ ...p, sort_order: e.target.value }))} placeholder="1" className={inputCls} />
                </div>
              </div>
              <button
                onClick={handleAddPartner}
                disabled={partnerSaving}
                className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 disabled:opacity-50 text-white rounded-xl px-4 py-2 text-xs font-semibold transition-all active:scale-95"
              >
                {partnerSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Add Partner
              </button>
            </div>
          )}

          {/* Partners list */}
          {partnersLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-[var(--brand)]" />
            </div>
          ) : partners.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-6">No partners yet. Click "+ Add Partner" to add one.</p>
          ) : (
            <div className="space-y-2">
              {partners.map(p => (
                <div key={p.id} className="border border-slate-200 dark:border-slate-600 rounded-xl overflow-hidden">
                  {editingPartner?.id === p.id ? (
                    <div className="bg-slate-50 dark:bg-slate-700/40 p-4 space-y-3">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Edit Partner</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Name *</label>
                          <input type="text" value={editPartnerForm.name} onChange={e => setEditPartnerForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
                        </div>
                        <div>
                          <ImageUpload
                            value={editPartnerForm.logo_url}
                            onChange={url => setEditPartnerForm(f => ({ ...f, logo_url: url }))}
                            folder="partners"
                            label="Logo"
                            shape="square"
                            previewSize="sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Website</label>
                          <input type="url" value={editPartnerForm.website} onChange={e => setEditPartnerForm(f => ({ ...f, website: e.target.value }))} className={inputCls} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Sort Order</label>
                          <input type="number" value={editPartnerForm.sort_order} onChange={e => setEditPartnerForm(f => ({ ...f, sort_order: e.target.value }))} className={inputCls} />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleSaveEditPartner}
                          disabled={editPartnerSaving}
                          className="flex items-center gap-1.5 bg-[var(--brand)] hover:opacity-90 disabled:opacity-50 text-white rounded-xl px-3 py-2 text-xs font-semibold transition-all active:scale-95"
                        >
                          {editPartnerSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          Save
                        </button>
                        <button
                          onClick={() => setEditingPartner(null)}
                          className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-xl px-3 py-2 text-xs font-semibold transition-all"
                        >
                          <X className="w-3.5 h-3.5" /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between px-4 py-3 gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {p.logo_url ? (
                          <img src={p.logo_url} alt={p.name} className="w-10 h-10 rounded-lg object-contain bg-slate-100 dark:bg-slate-700 p-1 shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                            <Building2 className="w-4 h-4 text-slate-400" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{p.name}</p>
                          {p.website && <p className="text-xs text-slate-400 truncate">{p.website}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleStartEditPartner(p)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-all"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeletePartner(p.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-500 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Section 3: Founders */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-[var(--brand)]" />
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white text-sm">Founders</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Shown in the "Meet the team" section of the landing page</p>
            </div>
          </div>
          <button
            onClick={() => { setShowAddFounder(v => !v); setFounderMsg(null); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--brand)]/10 hover:bg-[var(--brand)]/20 text-[var(--brand)] rounded-xl text-xs font-semibold transition-all"
          >
            {showAddFounder ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {showAddFounder ? 'Cancel' : 'Add Founder'}
          </button>
        </div>

        <div className="p-6 space-y-4">
          {founderMsg && <MsgBanner msg={founderMsg} />}

          {/* Add Founder form */}
          {showAddFounder && (
            <div className="bg-slate-50 dark:bg-slate-700/40 rounded-xl p-4 space-y-3 border border-slate-200 dark:border-slate-600">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">New Founder</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Name *</label>
                  <input type="text" value={founderForm.name} onChange={e => setFounderForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Doe" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Title</label>
                  <input type="text" value={founderForm.title} onChange={e => setFounderForm(f => ({ ...f, title: e.target.value }))} placeholder="Co-Founder & CEO" className={inputCls} />
                </div>
                <div>
                  <ImageUpload
                    value={founderForm.photo_url}
                    onChange={url => setFounderForm(f => ({ ...f, photo_url: url }))}
                    folder="founders"
                    label="Photo"
                    shape="circle"
                    previewSize="sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">LinkedIn URL</label>
                  <input type="url" value={founderForm.linkedin} onChange={e => setFounderForm(f => ({ ...f, linkedin: e.target.value }))} placeholder="https://linkedin.com/in/..." className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Sort Order</label>
                  <input type="number" value={founderForm.sort_order} onChange={e => setFounderForm(f => ({ ...f, sort_order: e.target.value }))} placeholder="1" className={inputCls} />
                </div>
              </div>
              <button
                onClick={handleAddFounder}
                disabled={founderSaving}
                className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 disabled:opacity-50 text-white rounded-xl px-4 py-2 text-xs font-semibold transition-all active:scale-95"
              >
                {founderSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Add Founder
              </button>
            </div>
          )}

          {/* Founders list */}
          {foundersLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-[var(--brand)]" />
            </div>
          ) : founders.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-6">No founders yet. Click "+ Add Founder" to add one.</p>
          ) : (
            <div className="space-y-2">
              {founders.map(f => (
                <div key={f.id} className="border border-slate-200 dark:border-slate-600 rounded-xl overflow-hidden">
                  {editingFounder?.id === f.id ? (
                    <div className="bg-slate-50 dark:bg-slate-700/40 p-4 space-y-3">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Edit Founder</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Name *</label>
                          <input type="text" value={editFounderForm.name} onChange={e => setEditFounderForm(ef => ({ ...ef, name: e.target.value }))} className={inputCls} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Title</label>
                          <input type="text" value={editFounderForm.title} onChange={e => setEditFounderForm(ef => ({ ...ef, title: e.target.value }))} className={inputCls} />
                        </div>
                        <div>
                          <ImageUpload
                            value={editFounderForm.photo_url}
                            onChange={url => setEditFounderForm(ef => ({ ...ef, photo_url: url }))}
                            folder="founders"
                            label="Photo"
                            shape="circle"
                            previewSize="sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">LinkedIn URL</label>
                          <input type="url" value={editFounderForm.linkedin} onChange={e => setEditFounderForm(ef => ({ ...ef, linkedin: e.target.value }))} className={inputCls} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Sort Order</label>
                          <input type="number" value={editFounderForm.sort_order} onChange={e => setEditFounderForm(ef => ({ ...ef, sort_order: e.target.value }))} className={inputCls} />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleSaveEditFounder}
                          disabled={editFounderSaving}
                          className="flex items-center gap-1.5 bg-[var(--brand)] hover:opacity-90 disabled:opacity-50 text-white rounded-xl px-3 py-2 text-xs font-semibold transition-all active:scale-95"
                        >
                          {editFounderSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          Save
                        </button>
                        <button
                          onClick={() => setEditingFounder(null)}
                          className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-xl px-3 py-2 text-xs font-semibold transition-all"
                        >
                          <X className="w-3.5 h-3.5" /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between px-4 py-3 gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {f.photo_url ? (
                          <img src={f.photo_url} alt={f.name} className="w-10 h-10 rounded-full object-cover bg-slate-100 dark:bg-slate-700 shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-[var(--brand)]/10 flex items-center justify-center shrink-0">
                            <span className="text-sm font-bold text-[var(--brand)]">
                              {f.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{f.name}</p>
                          {f.title && <p className="text-xs text-slate-400 truncate">{f.title}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleStartEditFounder(f)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-all"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteFounder(f.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-500 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function SASettingsPage() {
  const { user } = useAuth();
  const isDevSA = (user as any)?.is_dev_sa === true;

  // Tab state
  const tabs = [
    { id: 'general', label: 'General' },
    ...(isDevSA ? [{ id: 'landing', label: 'Landing Page' }] : []),
  ];
  const [activeTab, setActiveTab] = useState('general');

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

      {/* Tab bar — only shown when there is more than one tab (i.e. dev SA) */}
      {tabs.length > 1 && (
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* ── General tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'general' && (
        <>
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
                <ImageUpload
                  value={platformLogo}
                  onChange={setPlatformLogo}
                  folder="platform"
                  label="Platform Logo"
                  shape="square"
                  previewSize="md"
                />
                {platformLogoMsg && <MsgBanner msg={platformLogoMsg} />}
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

              {rzMsg && <MsgBanner msg={rzMsg} />}

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

              {cfgMsg && <MsgBanner msg={cfgMsg} />}

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
        </>
      )}

      {/* ── Landing Page tab (dev SA only) ──────────────────────────────────── */}
      {activeTab === 'landing' && isDevSA && <LandingPageTab />}
    </div>
  );
}
