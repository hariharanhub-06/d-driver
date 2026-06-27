'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import LandingInstallButton from '@/components/LandingInstallButton';
import {
  Bus,
  Users,
  CheckCircle2,
  MapPin,
  Navigation,
  Menu,
  X,
  Linkedin,
  Mail,
  Phone,
  ChevronRight,
  Sun,
  Moon,
} from 'lucide-react';
import { mergeLandingContent, iconFor, colorFor, type LandingContent } from '@/lib/landingContent';

// ─── TypeScript interfaces ────────────────────────────────────────────────────

interface Config {
  product_name: string;
  platform_logo_url: string | null;
  landing_badge: string;
  landing_title: string;
  landing_subtitle: string;
  landing_cta_text: string;
  landing_footer_tagline: string;
  landing_footer_email: string | null;
  landing_footer_phone: string | null;
  landing_footer_address: string | null;
  landing_footer_copyright: string;
  landing_content?: LandingContent | null;
}

interface Stats {
  schools: number;
  parents: number;
  buses_live: number;
  drivers: number;
  staff_admins: number;
}

interface Partner {
  id: string;
  name: string;
  logo_url: string | null;
}

interface Founder {
  id: string;
  name: string;
  title: string;
  photo_url: string | null;
  linkedin: string | null;
}

interface School {
  id: string;
  name: string;
  logo_url: string | null;
}

interface LandingData {
  config: Config;
  stats: Stats;
  partners: Partner[];
  founders: Founder[];
  schools: School[];
}

// ─── Default / fallback values ────────────────────────────────────────────────

const DEFAULT_CONFIG: Config = {
  product_name: 'ONLIVE',
  platform_logo_url: null,
  landing_badge: 'School Transport OS',
  landing_title: 'Every Mile, Every Child, Safe.',
  landing_subtitle:
    'Complete school bus management — live GPS tracking for parents, digital attendance for drivers, and full ERP control for admins.',
  landing_cta_text: 'Get Started Free',
  landing_footer_tagline:
    'The complete school bus ERP — built for safety, transparency, and operational efficiency.',
  landing_footer_email: 'support@onlive.app',
  landing_footer_phone: null,
  landing_footer_address: null,
  landing_footer_copyright: 'ONLIVE. All rights reserved.',
};

const DEFAULT_STATS: Stats = {
  schools: 0,
  parents: 0,
  buses_live: 0,
  drivers: 0,
  staff_admins: 0,
};

// ─── Helper: initials avatar ──────────────────────────────────────────────────

function InitialsAvatar({
  name,
  size = 'md',
  className = '',
}: {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const sizeClasses = {
    sm: 'w-10 h-10 text-sm',
    md: 'w-14 h-14 text-base',
    lg: 'w-20 h-20 text-xl',
  };

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-[#0F172A] flex items-center justify-center text-white font-bold flex-shrink-0 ${className}`}
    >
      {initials}
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-white animate-pulse">
      {/* Nav skeleton */}
      <div className="h-16 bg-gray-100 border-b border-gray-200" />
      {/* Hero skeleton */}
      <div className="max-w-7xl mx-auto px-6 md:px-20 py-24 grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-5">
          <div className="h-6 w-40 bg-gray-200 rounded-full" />
          <div className="h-14 w-full bg-gray-200 rounded-xl" />
          <div className="h-14 w-3/4 bg-gray-200 rounded-xl" />
          <div className="h-5 w-full bg-gray-100 rounded" />
          <div className="h-5 w-4/5 bg-gray-100 rounded" />
          <div className="flex gap-6 pt-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-1">
                <div className="h-8 w-16 bg-gray-200 rounded" />
                <div className="h-3 w-16 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
          <div className="flex gap-4 pt-2">
            <div className="h-12 w-44 bg-gray-200 rounded-2xl" />
            <div className="h-12 w-44 bg-gray-100 rounded-2xl" />
          </div>
        </div>
        <div className="h-64 bg-gray-100 rounded-3xl" />
      </div>
    </div>
  );
}

// ─── Main page component ──────────────────────────────────────────────────────

export default function LandingPage() {
  const [data, setData] = useState<LandingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      setData({
        config: DEFAULT_CONFIG,
        stats: DEFAULT_STATS,
        partners: [],
        founders: [],
        schools: [],
      });
      setLoading(false);
      return;
    }

    fetch(`${apiUrl}/platform/landing`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch landing data');
        return res.json();
      })
      .then((json: LandingData) => {
        setData({
          config: { ...DEFAULT_CONFIG, ...json.config },
          stats: { ...DEFAULT_STATS, ...json.stats },
          partners: json.partners ?? [],
          founders: json.founders ?? [],
          schools: json.schools ?? [],
        });
      })
      .catch(() => {
        setData({
          config: DEFAULT_CONFIG,
          stats: DEFAULT_STATS,
          partners: [],
          founders: [],
          schools: [],
        });
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton />;

  const { config, stats, partners, founders, schools } = data!;
  // All editable landing copy/icons/images (defaults merged with the super-admin's saved content).
  const c = mergeLandingContent(config.landing_content);

  const statItems = [
    { value: stats.schools, label: c.statLabels.schools },
    { value: stats.parents, label: c.statLabels.parents },
    { value: stats.buses_live, label: c.statLabels.buses_live },
    { value: stats.drivers, label: c.statLabels.drivers },
    { value: stats.staff_admins, label: c.statLabels.staff_admins },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 font-sans">

      {/* ── NAVBAR ──────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-[#0a0f1e] flex items-center justify-center shadow flex-shrink-0">
              {config.platform_logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={config.platform_logo_url} alt={config.product_name} className="w-full h-full object-contain" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src="/icons/onlive-logo.png" alt={config.product_name} className="w-full h-full object-contain" />
              )}
            </div>
            <span className="text-xl font-bold text-[#0F172A] dark:text-white tracking-tight">
              {config.product_name}
            </span>
          </div>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600 dark:text-gray-300">
            <Link href="#features" className="hover:text-[#22c55e] transition-colors">
              {c.nav.features}
            </Link>
            <Link href="#how-it-works" className="hover:text-[#22c55e] transition-colors">
              {c.nav.how}
            </Link>
            <Link href="#schools" className="hover:text-[#22c55e] transition-colors">
              {c.nav.schools}
            </Link>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-9 h-9 flex items-center justify-center rounded-full text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4.5 h-4.5 w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
            </button>
            <LandingInstallButton />
            <Link
              href="/login"
              className="bg-[#22c55e] text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-green-600 transition-colors shadow shadow-green-400/20"
            >
              {c.nav.signIn}
            </Link>
          </div>

          {/* Mobile: install + hamburger */}
          <div className="md:hidden flex items-center gap-1.5">
            <LandingInstallButton />
            <button
              className="p-2 rounded-lg text-gray-600 hover:text-[#0F172A] hover:bg-gray-50 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-6 py-4 space-y-3">
            {['#features', '#how-it-works', '#schools'].map((href) => (
              <Link
                key={href}
                href={href}
                className="block text-sm font-medium text-gray-600 py-2 hover:text-[#22c55e] transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {href === '#features'
                  ? c.nav.features
                  : href === '#how-it-works'
                  ? c.nav.how
                  : c.nav.schools}
              </Link>
            ))}
            <Link
              href="/login"
              className="block w-full text-center bg-[#22c55e] text-white py-2.5 rounded-full text-sm font-semibold hover:bg-green-600 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              {c.nav.signIn}
            </Link>
          </div>
        )}
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section className="bg-white pt-16 pb-20 px-6 md:px-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left — copy */}
          <div className="space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-green-200 bg-green-50">
              <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
              <span className="text-xs font-bold text-green-700 uppercase tracking-wider">
                {config.landing_badge}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-5xl md:text-6xl font-bold text-[#0F172A] leading-[1.08] tracking-tight">
              {config.landing_title}
            </h1>

            {/* Subtitle */}
            <p className="text-lg text-gray-500 leading-relaxed max-w-lg">
              {config.landing_subtitle}
            </p>

            {/* Real stats row */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-4 py-2 border-t border-b border-gray-100">
              {statItems.map(({ value, label }) => (
                <div key={label} className="text-center sm:text-left">
                  <p className="text-2xl font-bold text-[#0F172A]">{value.toLocaleString()}</p>
                  <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide leading-tight mt-0.5">
                    {label}
                  </p>
                </div>
              ))}
            </div>

            {/* CTA buttons */}
            <div className="flex flex-wrap gap-4">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#22c55e] text-white rounded-2xl font-bold shadow-lg shadow-green-500/20 hover:bg-green-600 transition-colors"
              >
                {config.landing_cta_text}
                <ChevronRight className="w-4 h-4" />
              </Link>
              <Link
                href="#how-it-works"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-[#0F172A] border-2 border-gray-200 rounded-2xl font-bold hover:border-[#22c55e] hover:text-[#22c55e] transition-colors"
              >
                {c.hero.secondaryCta}
              </Link>
            </div>
          </div>

          {/* Right — dashboard mockup card */}
          <div className="relative flex items-center justify-center">
            {/* Main card */}
            <div className="w-full max-w-sm bg-[#0F172A] rounded-2xl shadow-2xl shadow-slate-900/40 p-6 space-y-5">
              {/* Card header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    LIVE
                  </span>
                  <span className="text-white font-semibold text-sm">Route A</span>
                </div>
                <Navigation className="w-4 h-4 text-green-400" />
              </div>

              {/* Student count */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
                  <Users className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-white font-bold text-lg leading-none">28 Students</p>
                  <p className="text-slate-400 text-xs mt-0.5">on board</p>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-slate-700" />

              {/* Stop info */}
              <div className="flex items-center justify-between text-sm">
                <div>
                  <p className="text-slate-400 text-xs uppercase tracking-wider">Stop</p>
                  <p className="text-white font-semibold mt-0.5">3 of 8</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-400 text-xs uppercase tracking-wider">ETA</p>
                  <p className="text-green-400 font-semibold mt-0.5">4 min away</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="relative h-2 bg-slate-700 rounded-full">
                <div
                  className="absolute left-0 top-0 h-full bg-[#22c55e] rounded-full"
                  style={{ width: '37.5%' }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-[#22c55e] rounded-full border-2 border-[#0F172A] shadow"
                  style={{ left: 'calc(37.5% - 8px)' }}
                />
              </div>

              {/* Driver + Bus row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800 rounded-xl px-3 py-2.5">
                  <p className="text-slate-400 text-[10px] uppercase tracking-wider">Driver</p>
                  <p className="text-white text-sm font-medium mt-0.5">Ravi Kumar</p>
                </div>
                <div className="bg-slate-800 rounded-xl px-3 py-2.5">
                  <p className="text-slate-400 text-[10px] uppercase tracking-wider">Bus No.</p>
                  <p className="text-white text-sm font-medium mt-0.5">TN-01 AB-1234</p>
                </div>
              </div>
            </div>

            {/* Floating attendance badge */}
            <div className="absolute -bottom-4 -right-4 md:bottom-4 md:-right-8 bg-white rounded-xl shadow-lg border border-gray-100 px-4 py-3 flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-[#22c55e] flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-[#0F172A]">Attendance</p>
                <p className="text-[11px] text-gray-500">26 / 28 marked</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SCHOOLS ─────────────────────────────────────────────────────── */}
      {schools.length > 0 && (
        <section id="schools" className="py-16 bg-gray-50 overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 md:px-10">
            <p className="text-center text-xs font-bold text-gray-400 uppercase tracking-widest mb-10">
              {c.schoolsHeading}
            </p>
          </div>
          {/* Marquee row */}
          <div className="flex gap-10 overflow-x-auto no-scrollbar px-6 md:px-10 pb-2">
            {schools.map((school) => (
              <div
                key={school.id}
                className="flex-shrink-0 flex flex-col items-center gap-3 min-w-[100px]"
              >
                {school.logo_url ? (
                  <img
                    src={school.logo_url}
                    alt={school.name}
                    className="w-16 h-16 rounded-full object-contain bg-white border border-gray-200 shadow-sm"
                  />
                ) : (
                  <InitialsAvatar name={school.name} size="md" />
                )}
                <p className="text-xs font-medium text-gray-600 text-center leading-tight max-w-[90px]">
                  {school.name}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── FEATURES ────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          {/* Section heading */}
          <div className="text-center mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gray-200">
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                {c.features.badge}
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-[#0F172A] tracking-tight">
              {c.features.title}
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto text-lg">
              {c.features.subtitle}
            </p>
          </div>

          {/* 3 main cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {c.features.cards.map((card, i) => {
              const Icon = iconFor(card.icon);
              const col = colorFor(card.color);
              return (
                <div key={i} className="bg-white rounded-2xl p-8 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
                  <div className={`w-12 h-12 ${col.bg} rounded-xl flex items-center justify-center mb-5`}>
                    <Icon className={`w-6 h-6 ${col.text}`} />
                  </div>
                  {card.badge && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gray-50 border border-gray-100 mb-3">
                      <span className={`w-1.5 h-1.5 rounded-full ${col.text.replace('text-', 'bg-')}`} />
                      <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">{card.badge}</span>
                    </div>
                  )}
                  <h3 className="text-lg font-bold text-[#0F172A] mb-2">{card.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{card.desc}</p>
                </div>
              );
            })}
          </div>

          {/* 4 secondary pills */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
            {c.features.pills.map((pill, i) => {
              const Icon = iconFor(pill.icon);
              const col = colorFor(pill.color);
              return (
                <div key={i} className="bg-white rounded-xl p-5 border border-gray-100 hover:shadow-md transition-shadow">
                  <div className={`w-9 h-9 ${col.bg} rounded-lg flex items-center justify-center mb-3`}>
                    <Icon className={`w-5 h-5 ${col.text}`} />
                  </div>
                  <p className="text-sm font-bold text-[#0F172A] mb-1">{pill.label}</p>
                  <p className="text-xs text-gray-400">{pill.sub}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          {/* Section heading */}
          <div className="text-center mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gray-100">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                {c.how.badge}
              </span>
            </div>
            <h2 className="text-4xl font-bold text-[#0F172A]">{c.how.title}</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              {c.how.subtitle}
            </p>
          </div>

          {/* Steps */}
          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Connector line (desktop only) */}
            <div className="hidden md:block absolute top-8 left-[22%] right-[22%] h-px bg-gradient-to-r from-green-200 via-blue-200 to-orange-200 z-0" />

            {c.how.steps.map((s, i) => {
              const Icon = iconFor(s.icon);
              const col = colorFor(s.color);
              return (
                <div key={i} className="relative z-10 flex flex-col items-center text-center">
                  <div className={`w-14 h-14 ${col.bg} rounded-2xl flex items-center justify-center mb-5 shadow-sm`}>
                    <Icon className={`w-7 h-7 ${col.text}`} />
                  </div>
                  <p className={`text-xs font-black ${col.text} mb-2 tracking-widest`}>
                    STEP {String(i + 1).padStart(2, '0')}
                  </p>
                  <h3 className="text-lg font-bold text-[#0F172A] mb-2">{s.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed max-w-xs">{s.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── PARTNERS ────────────────────────────────────────────────────── */}
      {partners.length > 0 && (
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-6 md:px-10">
            <p className="text-center text-xs font-bold text-gray-400 uppercase tracking-widest mb-12">
              {c.partnersHeading}
            </p>
            <div className="flex flex-wrap justify-center gap-8">
              {partners.map((partner) => (
                <div
                  key={partner.id}
                  className="flex flex-col items-center gap-3"
                >
                  {partner.logo_url ? (
                    <img
                      src={partner.logo_url}
                      alt={partner.name}
                      className="h-12 w-auto object-contain grayscale hover:grayscale-0 transition-all"
                    />
                  ) : (
                    <span className="text-base font-semibold text-gray-500">{partner.name}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FOUNDERS / TEAM ─────────────────────────────────────────────── */}
      {founders.length > 0 && (
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-6 md:px-10">
            <div className="text-center mb-14 space-y-3">
              <h2 className="text-4xl font-bold text-[#0F172A]">{c.teamHeading}</h2>
              <p className="text-gray-500 max-w-md mx-auto">
                {c.teamSubtitle.replace('{product}', config.product_name)}
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-8">
              {founders.map((founder) => (
                <div
                  key={founder.id}
                  className="flex flex-col items-center text-center w-44 space-y-3"
                >
                  {founder.photo_url ? (
                    <img
                      src={founder.photo_url}
                      alt={founder.name}
                      className="w-20 h-20 rounded-full object-cover border-2 border-gray-100 shadow"
                    />
                  ) : (
                    <InitialsAvatar name={founder.name} size="lg" />
                  )}
                  <div>
                    <p className="text-sm font-bold text-[#0F172A]">{founder.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{founder.title}</p>
                  </div>
                  {founder.linkedin && (
                    <a
                      href={founder.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <Linkedin className="w-3.5 h-3.5" />
                      LinkedIn
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA BANNER ──────────────────────────────────────────────────── */}
      <section className="bg-[#0F172A] py-24 px-6 md:px-10">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <p className="text-green-400 font-bold text-xs uppercase tracking-widest">
            {c.cta.eyebrow}
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight">
            {c.cta.title}
          </h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            {c.cta.body.replace('{product}', config.product_name)}
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-10 py-4 bg-[#22c55e] text-white rounded-2xl font-bold shadow-xl shadow-green-500/20 hover:bg-green-600 transition-colors"
            >
              {c.cta.primary}
              <ChevronRight className="w-4 h-4" />
            </Link>
            <Link
              href="#features"
              className="px-10 py-4 bg-white/10 text-white border border-white/20 rounded-2xl font-bold hover:bg-white/15 transition-colors"
            >
              {c.cta.secondary}
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="bg-[#020617] text-white py-16 px-6 md:px-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Brand column */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-[#22c55e] rounded-full flex items-center justify-center flex-shrink-0">
                <Bus className="w-[18px] h-[18px] text-white" />
              </div>
              <span className="text-xl font-bold">{config.product_name}</span>
            </div>
            <p className="text-slate-400 max-w-xs leading-relaxed text-sm">
              {config.landing_footer_tagline}
            </p>
          </div>

          {/* Portal links */}
          <div>
            <h4 className="font-bold mb-5 text-[#22c55e] uppercase tracking-widest text-xs">
              {c.footer.portalHeading}
            </h4>
            <ul className="space-y-3 text-slate-400 text-sm">
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  {c.footer.schoolAdmin}
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  {c.footer.driverApp}
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  {c.footer.parentApp}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-bold mb-5 text-[#22c55e] uppercase tracking-widest text-xs">
              {c.footer.contactHeading}
            </h4>
            <ul className="space-y-3 text-slate-400 text-sm">
              {config.landing_footer_email && (
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4 flex-shrink-0 text-slate-500" />
                  <a
                    href={`mailto:${config.landing_footer_email}`}
                    className="hover:text-white transition-colors"
                  >
                    {config.landing_footer_email}
                  </a>
                </li>
              )}
              {config.landing_footer_phone && (
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4 flex-shrink-0 text-slate-500" />
                  <a
                    href={`tel:${config.landing_footer_phone}`}
                    className="hover:text-white transition-colors"
                  >
                    {config.landing_footer_phone}
                  </a>
                </li>
              )}
              {config.landing_footer_address && (
                <li className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 flex-shrink-0 text-slate-500 mt-0.5" />
                  <span>{config.landing_footer_address}</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-white/10 text-center text-slate-600 text-xs">
          &copy; {new Date().getFullYear()} {config.landing_footer_copyright}
        </div>
      </footer>
    </div>
  );
}
