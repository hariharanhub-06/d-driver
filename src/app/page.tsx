'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import LandingInstallButton from '@/components/LandingInstallButton';
import {
  Bus, Users, CheckCircle2, MapPin, Navigation, Menu, X, Linkedin, Mail, Phone, Globe,
  ShieldCheck, Zap, Leaf, Cpu, Bell, BarChart3, CreditCard, Route as RouteIcon, IdCard,
  Gauge, Fuel, Wrench, Activity, Siren, Heart, Star, TrendingUp, Award, Building2,
  Handshake, GraduationCap, Store, Calendar, Trophy, TreePine, FileText, ChevronDown,
  ArrowRight, Facebook, Instagram, Youtube, Twitter, Send, MessageCircle, Wallet, Camera,
} from 'lucide-react';
import { mergeLandingContent, iconFor, type LandingContent } from '@/lib/landingContent';

// ─── TypeScript interfaces ────────────────────────────────────────────────────
interface Config {
  product_name: string;
  platform_logo_url: string | null;
  landing_footer_tagline: string;
  landing_footer_email: string | null;
  landing_footer_phone: string | null;
  landing_footer_address: string | null;
  landing_footer_copyright: string;
  landing_content?: LandingContent | null;
}
interface Stats { schools: number; parents: number; buses_live: number; drivers: number; staff_admins: number }
interface School { id: string; name: string; logo_url: string | null; website?: string | null }
interface LandingData { config: Config; stats: Stats; schools: School[] }

const DEFAULT_CONFIG: Config = {
  product_name: 'OnLIVE',
  platform_logo_url: null,
  landing_footer_tagline:
    "India's most advanced AI-powered school transport management platform for schools, parents, students, drivers & fleet owners.",
  landing_footer_email: 'onliveecosystem@gmail.com',
  landing_footer_phone: '+91 91509 50444',
  landing_footer_address: 'www.onlive.co.in',
  landing_footer_copyright: 'OnLIVE Ecosystem. All rights reserved.',
};
const DEFAULT_STATS: Stats = { schools: 0, parents: 0, buses_live: 0, drivers: 0, staff_admins: 0 };

// ─── Static marketing content (mirrors the OnLIVE reference design) ────────────
const HERO_CHIPS = [
  { icon: ShieldCheck, label: 'Safe', color: 'text-emerald-400' },
  { icon: Zap, label: 'Smart', color: 'text-amber-400' },
  { icon: IdCard, label: 'Secure', color: 'text-blue-400' },
  { icon: Leaf, label: 'Sustainable', color: 'text-green-400' },
];

const HERO_PANEL = [
  { icon: MapPin, title: 'Live Tracking', sub: 'ETA 08 min', color: 'bg-blue-500' },
  { icon: ShieldCheck, title: 'Safety First', sub: 'SOS Alert', color: 'bg-red-500' },
  { icon: RouteIcon, title: 'AI Route Optimization', sub: '', color: 'bg-emerald-500' },
  { icon: CheckCircle2, title: 'Attendance Checked', sub: '', color: 'bg-amber-500' },
  { icon: Users, title: 'Parent-Student Engagement', sub: 'Platform', color: 'bg-purple-500' },
];

const HERO_STATS = [
  { icon: Users, value: '10 Lakh+', label: 'Students' },
  { icon: Building2, value: '5000+', label: 'Schools' },
  { icon: Bus, value: '20,000+', label: 'Buses' },
  { icon: MapPin, value: '50+', label: 'Cities' },
  { icon: TrendingUp, value: '99.9%', label: 'Uptime' },
];

const ECOSYSTEM_NODES = [
  { icon: Users, title: 'Parent App', sub: 'Live Tracking, Alerts, Payments & more' },
  { icon: GraduationCap, title: 'Student App', sub: 'ID Card, Attendance, Alerts, SOS & more' },
  { icon: Building2, title: 'School ERP', sub: 'Fees, Attendance, Timetable, Communication' },
  { icon: Navigation, title: 'Driver App', sub: 'Navigation, Pickup/Drop, Attendance & more' },
  { icon: Bus, title: 'Fleet Owner', sub: 'Vehicle Health, Fuel, Reports' },
];

const ECOSYSTEM_PILLS = [
  { icon: MapPin, label: 'GPS Tracking' }, { icon: RouteIcon, label: 'AI Route Optimization' },
  { icon: CheckCircle2, label: 'Attendance' }, { icon: Siren, label: 'SOS Emergency' },
  { icon: IdCard, label: 'Digital ID' }, { icon: CreditCard, label: 'Cashless Payments' },
  { icon: Trophy, label: 'Talent Passport' }, { icon: Leaf, label: 'Go Green Initiative' },
  { icon: BarChart3, label: 'Analytics & Reports' },
];

// Gradient palette applied to solution cards by index (visual design, not editable copy).
const SOLUTION_GRADIENTS = [
  'from-blue-500 to-blue-700', 'from-emerald-500 to-emerald-700', 'from-amber-500 to-orange-600',
  'from-cyan-500 to-blue-600', 'from-pink-500 to-rose-600', 'from-red-500 to-rose-700',
  'from-indigo-500 to-indigo-700', 'from-violet-500 to-purple-700', 'from-teal-500 to-emerald-700',
];

const PARTNER_PROGRAMS = [
  { icon: Building2, label: 'School Founder Program' }, { icon: Wallet, label: 'Referral Income' },
  { icon: Store, label: 'Franchise Opportunities' }, { icon: Handshake, label: 'Transport Operator Partnership' },
  { icon: Users, label: 'Consultancy Services' }, { icon: GraduationCap, label: 'College Admission Support' },
  { icon: Store, label: 'Student Marketplace' }, { icon: Calendar, label: 'Events & Competitions' },
];

const PARTNER_BADGES = [
  { icon: TrendingUp, label: 'High ROI Business Model' }, { icon: Wallet, label: 'Recurring Revenue' },
  { icon: ShieldCheck, label: 'Complete Support' }, { icon: Handshake, label: 'Win-Win Partnership' },
];

const APP_PREVIEWS = [
  { name: 'PARENT APP', accent: 'text-blue-400', lines: ['Live Tracking', 'Bus-07 · KA-01 AB 1234', 'Pickup 07:35 AM', 'School 07:55 AM'] },
  { name: 'STUDENT APP', accent: 'text-emerald-400', lines: ['My ID Card', 'BE STU094966', 'Class 6 - A', 'Attendance · Present'] },
  { name: 'DRIVER APP', accent: 'text-amber-400', lines: ['Current Trip', 'Route - 12', 'Stop 1 · 07:15 AM', 'Trip Started'] },
  { name: 'SCHOOL ERP', accent: 'text-purple-400', lines: ['Dashboard', 'Students 1,250', 'Buses 32', 'Drivers 45'] },
];

const ANALYTICS = [
  { value: '10,245', label: 'Total Students', delta: '+12.5%' },
  { value: '235', label: 'Active Buses', delta: '+8.2%' },
  { value: '58', label: 'Total Routes', delta: '+6.1%' },
  { value: '468', label: 'Daily Trips', delta: '+10.3%' },
];

const GO_GREEN = [
  { icon: TreePine, value: '1,25,000+', label: 'Trees Saved' },
  { icon: FileText, value: '8.5 Cr+', label: 'Paperless Pages' },
  { icon: Leaf, value: '2,300+ Tons', label: 'CO₂ Reduced' },
  { icon: Award, value: '3-Star', label: 'Eco Score for Schools' },
];

// Fixed platform icon/colour; the URL comes from editable content and empty ones are hidden.
const SOCIAL_META = [
  { key: 'facebook', icon: Facebook, label: 'Facebook', color: 'bg-[#1877f2]' },
  { key: 'instagram', icon: Instagram, label: 'Instagram', color: 'bg-gradient-to-br from-[#feda75] via-[#d62976] to-[#4f5bd5]' },
  { key: 'linkedin', icon: Linkedin, label: 'LinkedIn', color: 'bg-[#0a66c2]' },
  { key: 'youtube', icon: Youtube, label: 'YouTube', color: 'bg-[#ff0000]' },
  { key: 'twitter', icon: Twitter, label: 'X (Twitter)', color: 'bg-black' },
  { key: 'whatsapp', icon: MessageCircle, label: 'WhatsApp', color: 'bg-[#25d366]' },
  { key: 'telegram', icon: Send, label: 'Telegram', color: 'bg-[#229ED9]' },
  { key: 'website', icon: Globe, label: 'Website', color: 'bg-slate-600' },
] as const;

const normUrl = (u: string) => (/^https?:\/\//i.test(u) ? u : `https://${u}`);

// ─── Small presentational helpers ─────────────────────────────────────────────
function Logo({ url }: { url: string | null }) {
  // Prefer the configured platform logo, then the bundled OnLIVE logo asset; fall back to
  // a styled wordmark only if the image fails to load.
  const [err, setErr] = useState(false);
  const src = url || '/onlive-logo.png';
  if (!err) {
    return <img src={src} alt="OnLIVE" className="h-9 w-auto object-contain" onError={() => setErr(true)} />;
  }
  return (
    <div className="flex flex-col leading-none">
      <span className="text-xl font-black tracking-tight">
        <span className="text-white">On</span><span className="text-blue-400">LIVE</span>
      </span>
      <span className="text-[7px] font-bold text-slate-400 tracking-[0.2em] uppercase">Smart Transport Ecosystem</span>
    </div>
  );
}

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-[#0d162b]/80 border border-white/10 ${className}`}>{children}</div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-center text-lg md:text-xl font-black tracking-wide text-white uppercase mb-6 flex items-center justify-center gap-2">
      <span className="text-amber-400">◆</span>{children}
    </h2>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [data, setData] = useState<LandingData | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) { setData({ config: DEFAULT_CONFIG, stats: DEFAULT_STATS, schools: [] }); return; }
    fetch(`${apiUrl}/platform/landing`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j: any) => setData({
        config: { ...DEFAULT_CONFIG, ...j.config },
        stats: { ...DEFAULT_STATS, ...j.stats },
        schools: j.schools ?? [],
      }))
      .catch(() => setData({ config: DEFAULT_CONFIG, stats: DEFAULT_STATS, schools: [] }));
  }, []);

  // "Speed" reveal — each section rushes into place when it enters the viewport (on scroll
  // and when a nav tab jumps to it). Runs once sections exist (after data loads).
  useEffect(() => {
    if (typeof window === 'undefined' || !data) return;
    const els = Array.from(document.querySelectorAll('.speed-reveal'));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { e.target.classList.add('in-view'); io.unobserve(e.target); }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [data]);

  const config = data?.config ?? DEFAULT_CONFIG;
  const schools = data?.schools ?? [];
  // All editable marketing copy (super-admin Settings → Landing content), merged with defaults.
  const c = mergeLandingContent(config.landing_content);
  const navLinks = ['Home', 'Solutions', 'Ecosystem', 'Features', 'Pricing', 'Resources', 'About Us'];
  const chWords = (c.challenges.title || '').trim().split(' ');
  const chFirst = chWords[0] || '';
  const chRest = chWords.slice(1).join(' ');

  return (
    <div className="min-h-screen bg-[#060b18] text-white font-sans overflow-x-hidden">
      {/* ══ NAVBAR ══ */}
      <nav className="sticky top-0 z-50 bg-[#060b18]/90 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <Logo url={config.platform_logo_url} />
          <div className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-300">
            <Link href="#top" className="text-white hover:text-blue-400 transition-colors">Home</Link>
            <Link href="#solutions" className="hover:text-blue-400 transition-colors flex items-center gap-1">Solutions <ChevronDown className="w-3 h-3" /></Link>
            <Link href="#ecosystem" className="hover:text-blue-400 transition-colors">Ecosystem</Link>
            <Link href="#features" className="hover:text-blue-400 transition-colors">Features</Link>
            <Link href="#partners" className="hover:text-blue-400 transition-colors">Pricing</Link>
            <Link href="#challenges" className="hover:text-blue-400 transition-colors flex items-center gap-1">Resources <ChevronDown className="w-3 h-3" /></Link>
            <Link href="#contact" className="hover:text-blue-400 transition-colors">About Us</Link>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden sm:inline-flex px-4 py-2 rounded-lg border border-white/20 text-sm font-semibold hover:bg-white/10 transition-colors">Login</Link>
            <Link href="/login" className="px-4 py-2 rounded-lg bg-[#f97316] hover:bg-[#ea6a0c] text-white text-sm font-bold transition-colors shadow-lg shadow-orange-500/20">Book a Demo</Link>
            <button onClick={() => setMenuOpen(v => !v)} className="lg:hidden p-2 text-slate-300">{menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}</button>
          </div>
        </div>
        {menuOpen && (
          <div className="lg:hidden border-t border-white/10 px-4 py-3 flex flex-col gap-2 text-sm text-slate-300">
            {navLinks.map((l, i) => (
              <a key={l} href={['#top', '#solutions', '#ecosystem', '#features', '#partners', '#challenges', '#contact'][i]} onClick={() => setMenuOpen(false)} className="py-1.5 hover:text-blue-400">{l}</a>
            ))}
          </div>
        )}
      </nav>

      {/* ══ HERO ══ */}
      <section id="top" className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a1631] via-[#070d1e] to-[#060b18]" />
        <div className="absolute inset-0 opacity-[0.15]" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, #1d4ed8 0, transparent 40%), radial-gradient(circle at 80% 30%, #f97316 0, transparent 35%)' }} />
        <div className="relative max-w-7xl mx-auto px-4 md:px-8 pt-12 pb-8 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          {/* Left */}
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-[11px] font-bold text-blue-300 uppercase tracking-wider">
              <Cpu className="w-3.5 h-3.5" /> {c.hero.badge}
            </span>
            <h1 className="mt-4 text-4xl md:text-6xl font-black tracking-tight leading-[1.05]">
              {c.hero.title}<br /><span className="text-[#f97316]">{c.hero.titleAccent}</span>
            </h1>
            <p className="mt-3 text-slate-300 text-base md:text-lg font-medium">{c.hero.subtitle}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              {HERO_CHIPS.map((c) => (
                <span key={c.label} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold">
                  <c.icon className={`w-4 h-4 ${c.color}`} /> {c.label}
                </span>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#f97316] hover:bg-[#ea6a0c] font-bold shadow-lg shadow-orange-500/25 transition-colors">
                {c.hero.primaryCta} <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="#ecosystem" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/20 font-semibold hover:bg-white/10 transition-colors">
                {c.hero.secondaryCta} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="mt-6 flex items-center gap-3">
              <div className="flex -space-x-2">
                {[0, 1, 2, 3].map(i => <div key={i} className="w-8 h-8 rounded-full border-2 border-[#060b18] bg-gradient-to-br from-blue-500 to-purple-600" />)}
              </div>
              <div className="text-xs text-slate-300">
                <p className="font-semibold">{c.hero.trustLine}</p>
                <p className="flex items-center gap-0.5 text-amber-400">{[0, 1, 2, 3, 4].map(i => <Star key={i} className="w-3 h-3 fill-amber-400" />)}</p>
              </div>
            </div>
          </div>

          {/* Right — hero visual (bus breaking out of the phone) + feature tabs */}
          <div className="relative min-h-[440px] flex items-center justify-center">
            {/* Main visual: the composite hero image (phone + glowing bus) when available,
                otherwise a CSS-built phone-with-bus that mirrors the reference. Drop the
                artwork at public/hero-phone.png (or upload in Settings → Landing → Hero image). */}
            {!heroImgFailed ? (
              <img
                src={c.hero.image_url || '/hero-phone.png'}
                alt="OnLIVE — smart bus tracking"
                className="w-full max-w-[560px] object-contain drop-shadow-[0_20px_50px_rgba(249,115,22,0.25)]"
                onError={() => setHeroImgFailed(true)}
              />
            ) : (
              <div className="relative w-[260px] h-[420px]">
                {/* Phone */}
                <div className="absolute inset-0 rounded-[2.5rem] border-4 border-white/15 bg-gradient-to-b from-[#0b1a3a] to-[#0a1024] shadow-2xl shadow-blue-900/40 overflow-hidden">
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-5 bg-black/60 rounded-full" />
                  <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 70% 40%, rgba(37,99,235,0.35), transparent 55%)' }} />
                </div>
                {/* Glow + curved light trail */}
                <div className="absolute -right-16 top-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-[#f97316]/25 blur-3xl" />
                <div className="absolute right-[-70px] bottom-16 w-56 h-1.5 rounded-full bg-gradient-to-r from-transparent via-[#f97316] to-blue-500 rotate-[-18deg]" />
                {/* Bus breaking out of the phone (right side) */}
                <div className="absolute right-[-60px] top-1/2 -translate-y-1/2 w-52 h-32 rounded-2xl bg-gradient-to-br from-[#facc15] to-[#f97316] flex items-center justify-center shadow-2xl shadow-orange-500/40 border border-orange-300/40">
                  <Bus className="w-24 h-24 text-[#3a2400]" strokeWidth={1.5} />
                </div>
                {/* Location pin */}
                <div className="absolute right-2 top-24 w-16 h-16 rounded-full bg-[#f97316] flex items-center justify-center border-4 border-[#0a1024] shadow-xl">
                  <MapPin className="w-7 h-7 text-white" />
                </div>
              </div>
            )}

            {/* Feature tabs — clean vertical stack on the right (wraps, never truncated) */}
            <div className="hidden lg:flex flex-col gap-2.5 absolute right-0 top-1/2 -translate-y-1/2 w-60 z-10">
              {HERO_PANEL.map((p) => (
                <div key={p.title} className="flex items-center gap-3 rounded-xl bg-[#0d162b]/95 border border-white/10 px-3 py-2.5 backdrop-blur-sm shadow-lg">
                  <div className={`w-9 h-9 rounded-lg ${p.color} flex items-center justify-center shrink-0`}><p.icon className="w-4 h-4 text-white" /></div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold leading-tight">{p.title}</p>
                    {p.sub && <p className="text-[11px] text-slate-400 leading-tight">{p.sub}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stat band */}
        <div className="relative max-w-6xl mx-auto px-4 md:px-8 pb-10">
          <Panel className="grid grid-cols-2 md:grid-cols-5 divide-x divide-white/10">
            {HERO_STATS.map((s) => (
              <div key={s.label} className="flex flex-col items-center justify-center gap-1 py-5 px-2 text-center">
                <s.icon className="w-5 h-5 text-blue-400" />
                <p className="text-xl md:text-2xl font-black">{s.value}</p>
                <p className="text-[11px] text-slate-400 font-medium">{s.label}</p>
              </div>
            ))}
          </Panel>
        </div>
      </section>

      {/* ══ CHALLENGES WITHOUT ONLIVE (image 1) ══ */}
      <section id="challenges" className="speed-reveal py-16 bg-[#f4f6fb] text-slate-900">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight">
              <span className="text-[#0b1f4d]">{chFirst} </span><span className="text-red-600">{chRest}</span>
            </h2>
            <p className="text-slate-500 font-semibold mt-2">{c.challenges.subtitle}</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {c.challenges.groups.map((g) => {
              const GIcon = iconFor(g.icon);
              const tone = g.color === 'blue'
                ? { head: 'bg-[#1e56c8]', ring: 'border-blue-200', chip: 'bg-[#1e56c8]', soft: 'bg-blue-50' }
                : g.color === 'orange'
                  ? { head: 'bg-[#f97316]', ring: 'border-orange-200', chip: 'bg-[#f97316]', soft: 'bg-orange-50' }
                  : { head: 'bg-[#6d28d9]', ring: 'border-purple-200', chip: 'bg-[#6d28d9]', soft: 'bg-purple-50' };
              return (
                <div key={g.role} className={`rounded-2xl bg-white border ${tone.ring} shadow-sm overflow-hidden`}>
                  <div className="flex items-center gap-3 p-4">
                    <div className={`w-11 h-11 rounded-full ${tone.chip} flex items-center justify-center shrink-0`}><GIcon className="w-6 h-6 text-white" /></div>
                    <div className={`px-4 py-1.5 rounded-md ${tone.head} text-white font-black tracking-wide`}>{g.role.toUpperCase()}</div>
                    <span className="text-sm font-bold text-slate-600 hidden sm:block">{g.tagline}</span>
                  </div>
                  <div className="px-4 pb-4 space-y-2.5">
                    {g.items.map((it) => (
                      <div key={it.title} className={`flex items-start gap-3 rounded-xl ${tone.soft} p-3`}>
                        <div className={`w-8 h-8 rounded-full ${tone.chip} flex items-center justify-center shrink-0`}><X className="w-4 h-4 text-white" /></div>
                        <div>
                          <p className="text-sm font-bold text-slate-800 leading-tight">{it.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{it.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-center mt-8 text-slate-700 font-semibold">
            These challenges impact <span className="text-blue-600">safety</span>, <span className="text-[#f97316]">efficiency</span>, and <span className="text-purple-600">peace of mind</span>.
            <span className="block text-lg font-black text-slate-900 mt-1">It&apos;s time for a <span className="text-red-600">smarter solution</span>.</span>
          </p>
        </div>
      </section>

      {/* ══ ECOSYSTEM + SOLUTIONS ══ */}
      <section id="ecosystem" className="speed-reveal py-14">
        <div className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ecosystem hub */}
          <Panel className="p-6">
            <SectionTitle>{c.ecosystemHeading}</SectionTitle>
            <div className="flex flex-col items-center">
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-blue-500 to-indigo-700 flex flex-col items-center justify-center shadow-lg shadow-blue-900/40 mb-6">
                <Cpu className="w-8 h-8 text-white" />
                <span className="text-xs font-black mt-1">OnLIVE</span>
                <span className="text-[8px] text-blue-100">CLOUD PLATFORM</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                {ECOSYSTEM_NODES.map((n) => (
                  <div key={n.title} className="flex items-start gap-3 rounded-xl bg-white/5 border border-white/10 p-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0"><n.icon className="w-5 h-5 text-blue-400" /></div>
                    <div><p className="text-sm font-bold">{n.title}</p><p className="text-[11px] text-slate-400 leading-tight">{n.sub}</p></div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap justify-center gap-2 mt-5">
                {ECOSYSTEM_PILLS.map((p) => (
                  <span key={p.label} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] font-semibold text-slate-300">
                    <p.icon className="w-3.5 h-3.5 text-blue-400" /> {p.label}
                  </span>
                ))}
              </div>
            </div>
          </Panel>

          {/* Solutions grid */}
          <div>
            <SectionTitle>{c.solutions.heading}</SectionTitle>
            <div id="solutions" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {c.solutions.cards.map((s, i) => {
                const SIcon = iconFor(s.icon);
                return (
                  <div key={i} className={`rounded-xl bg-gradient-to-br ${SOLUTION_GRADIENTS[i % SOLUTION_GRADIENTS.length]} p-4 shadow-lg`}>
                    <SIcon className="w-6 h-6 text-white mb-3" />
                    <p className="text-sm font-black leading-tight">{s.title}</p>
                    <p className="text-[11px] text-white/80 mt-1 leading-tight">{s.sub}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ══ SMART FEATURES + SUPER APP ══ */}
      <section id="features" className="speed-reveal py-14">
        <div className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Panel className="p-6">
            <SectionTitle>{c.smartFeatures.heading}</SectionTitle>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {c.smartFeatures.items.map((f, i) => {
                const FIcon = iconFor(f.icon);
                return (
                  <div key={i} className="flex flex-col items-center gap-2 rounded-xl bg-white/5 border border-white/10 p-3 text-center">
                    <div className="w-10 h-10 rounded-full bg-blue-500/15 flex items-center justify-center"><FIcon className="w-5 h-5 text-blue-400" /></div>
                    <p className="text-[10px] font-semibold text-slate-300 leading-tight">{f.label}</p>
                  </div>
                );
              })}
            </div>
          </Panel>

          <div>
            <SectionTitle>{c.superAppHeading}</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              {APP_PREVIEWS.map((a) => (
                <Panel key={a.name} className="p-3">
                  <p className={`text-[10px] font-black tracking-widest ${a.accent} mb-2`}>{a.name}</p>
                  <div className="rounded-lg bg-black/30 border border-white/10 p-3 space-y-1.5">
                    {a.lines.map((l, i) => (
                      <p key={i} className={`text-[11px] ${i === 0 ? 'font-bold text-white' : 'text-slate-400'}`}>{l}</p>
                    ))}
                  </div>
                </Panel>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ ANALYTICS + GO GREEN + PARTNERS ══ */}
      <section id="partners" className="speed-reveal py-14">
        <div className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Analytics */}
          <Panel className="p-5">
            <SectionTitle>{c.analyticsHeading}</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              {ANALYTICS.map((a) => (
                <div key={a.label} className="rounded-xl bg-white/5 border border-white/10 p-3">
                  <p className="text-xl font-black">{a.value}</p>
                  <p className="text-[10px] text-slate-400">{a.label}</p>
                  <p className="text-[10px] text-emerald-400 font-semibold">{a.delta}</p>
                </div>
              ))}
              <div className="col-span-2 rounded-xl bg-white/5 border border-white/10 p-3 flex items-center justify-between">
                <div><p className="text-[10px] text-slate-400">Attendance Overview</p><p className="text-lg font-black text-emerald-400">92% Present</p></div>
                <div className="text-right"><p className="text-[10px] text-slate-400">On Time %</p><p className="text-lg font-black text-blue-400">96.7%</p></div>
              </div>
            </div>
          </Panel>

          {/* Go Green */}
          <Panel className="p-5 bg-gradient-to-b from-emerald-900/40 to-[#0d162b]/80">
            <SectionTitle>{c.goGreenHeading}</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              {GO_GREEN.map((g) => (
                <div key={g.label} className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
                  <g.icon className="w-6 h-6 text-emerald-400 mx-auto mb-1.5" />
                  <p className="text-base font-black">{g.value}</p>
                  <p className="text-[10px] text-slate-400 leading-tight">{g.label}</p>
                </div>
              ))}
            </div>
            <p className="text-center text-emerald-300 font-bold text-sm mt-4">Together, Let&apos;s Build a Sustainable Tomorrow</p>
          </Panel>

          {/* Partner programs */}
          <Panel className="p-5">
            <SectionTitle>Partner & Growth Programs</SectionTitle>
            <div className="grid grid-cols-2 gap-2.5">
              {PARTNER_PROGRAMS.map((p) => (
                <div key={p.label} className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 p-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0"><p.icon className="w-4 h-4 text-blue-400" /></div>
                  <p className="text-[11px] font-semibold text-slate-300 leading-tight">{p.label}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              {PARTNER_BADGES.map((b) => (
                <span key={b.label} className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-slate-300"><b.icon className="w-3.5 h-3.5 text-emerald-400" /> {b.label}</span>
              ))}
            </div>
          </Panel>
        </div>
      </section>

      {/* ══ TRUSTED SCHOOLS (data-driven, website links) ══ */}
      {schools.length > 0 && (
        <section className="speed-reveal py-10 border-y border-white/10 bg-[#080e1e]">
          <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Trusted by Schools</p>
          <div className="flex gap-8 overflow-x-auto no-scrollbar px-4 md:px-8">
            {schools.map((s) => {
              const href = s.website ? (/^https?:\/\//i.test(s.website) ? s.website : `https://${s.website}`) : null;
              const inner = (
                <>
                  {s.logo_url
                    ? <img src={s.logo_url} alt={s.name} className="w-14 h-14 rounded-full object-contain bg-white border border-white/10" />
                    : <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center font-bold text-slate-200">{s.name.slice(0, 2).toUpperCase()}</div>}
                  <p className="text-[11px] text-slate-300 text-center max-w-[90px] leading-tight">{s.name}</p>
                </>
              );
              return href ? (
                <a key={s.id} href={href} target="_blank" rel="noopener noreferrer" title={s.name} className="flex-shrink-0 flex flex-col items-center gap-2 min-w-[90px] hover:-translate-y-1 transition-transform">{inner}</a>
              ) : (
                <div key={s.id} className="flex-shrink-0 flex flex-col items-center gap-2 min-w-[90px]">{inner}</div>
              );
            })}
          </div>
        </section>
      )}

      {/* ══ CONTACT / DEMO / SOCIAL ══ */}
      <section id="contact" className="speed-reveal py-14">
        <div className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Panel className="p-6">
            <h3 className="text-2xl font-black text-blue-400 mb-1">{c.contact.contactHeading}</h3>
            <p className="text-sm text-slate-400 mb-5">{c.contact.contactSub}</p>
            <div className="space-y-3 text-sm">
              {config.landing_footer_phone && <a href={`tel:${config.landing_footer_phone}`} className="flex items-center gap-3"><span className="w-9 h-9 rounded-full bg-[#f97316] flex items-center justify-center"><Phone className="w-4 h-4" /></span>{config.landing_footer_phone}</a>}
              {config.landing_footer_email && <a href={`mailto:${config.landing_footer_email}`} className="flex items-center gap-3"><span className="w-9 h-9 rounded-full bg-[#f97316] flex items-center justify-center"><Mail className="w-4 h-4" /></span>{config.landing_footer_email}</a>}
              {config.landing_footer_address && <span className="flex items-center gap-3"><span className="w-9 h-9 rounded-full bg-[#f97316] flex items-center justify-center"><Globe className="w-4 h-4" /></span>{config.landing_footer_address}</span>}
            </div>
          </Panel>

          <Panel className="p-6 flex flex-col items-center justify-center text-center bg-gradient-to-br from-[#0d162b] to-[#101a34]">
            <h3 className="text-2xl font-black text-blue-300 mb-2">{c.contact.demoHeading}</h3>
            <p className="text-sm text-slate-400 mb-5">{c.contact.demoBody}</p>
            <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#f97316] hover:bg-[#ea6a0c] font-bold transition-colors">{c.contact.demoCta} <ArrowRight className="w-4 h-4" /></Link>
          </Panel>

          <Panel className="p-6">
            <h3 className="text-xl font-black mb-1">{c.contact.followHeading}</h3>
            <p className="text-sm text-slate-400 mb-5">Stay updated with our latest innovations and product launches.</p>
            {(() => {
              const filled = SOCIAL_META.filter((s) => ((c.socials as any)[s.key] || '').trim());
              if (filled.length === 0) return <p className="text-sm text-slate-500">Social links coming soon.</p>;
              return (
                <div className="grid grid-cols-4 gap-3">
                  {filled.map((s) => (
                    <a key={s.key} href={normUrl((c.socials as any)[s.key])} target="_blank" rel="noopener noreferrer" title={s.label} className={`aspect-square rounded-xl ${s.color} flex items-center justify-center hover:opacity-90 transition-opacity`}>
                      <s.icon className="w-5 h-5 text-white" />
                    </a>
                  ))}
                </div>
              );
            })()}
          </Panel>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer className="border-t border-white/10 bg-[#050a15]">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <Logo url={config.platform_logo_url} />
            <p className="text-sm text-slate-400 mt-4 leading-relaxed">{config.landing_footer_tagline}</p>
            <div className="mt-4 space-y-1.5 text-sm">
              {config.landing_footer_phone && (
                <a href={`tel:${config.landing_footer_phone}`} className="flex items-center gap-2 text-slate-300 hover:text-blue-400 transition-colors">
                  <Phone className="w-4 h-4 text-[#f97316]" /> <span className="font-semibold">{config.landing_footer_phone}</span>
                </a>
              )}
              {config.landing_footer_email && (
                <a href={`mailto:${config.landing_footer_email}`} className="flex items-center gap-2 text-slate-300 hover:text-blue-400 transition-colors">
                  <Mail className="w-4 h-4 text-[#f97316]" /> {config.landing_footer_email}
                </a>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Quick Links</p>
            <ul className="space-y-2 text-sm text-slate-400">
              {['Home', 'Solutions', 'Ecosystem', 'Features', 'Pricing'].map(l => <li key={l}><a href="#top" className="hover:text-blue-400">{l}</a></li>)}
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Resources</p>
            <ul className="space-y-2 text-sm text-slate-400">
              {['Blog', 'Case Studies', 'Help Center', 'FAQs', 'Privacy Policy'].map(l => <li key={l}><span className="hover:text-blue-400 cursor-pointer">{l}</span></li>)}
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Support</p>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link href="/login" className="hover:text-blue-400">Login</Link></li>
              {config.landing_footer_phone && <li className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> {config.landing_footer_phone}</li>}
              {config.landing_footer_email && <li className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> {config.landing_footer_email}</li>}
              {config.landing_footer_address && <li className="flex items-center gap-2"><Globe className="w-3.5 h-3.5" /> {config.landing_footer_address}</li>}
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 py-5 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between max-w-7xl mx-auto px-4 md:px-8 gap-2">
          <span>© {config.landing_footer_copyright}</span>
          <span className="flex items-center gap-1">Designed with <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" /> for Smart Schools</span>
        </div>
        <div className="pb-6 flex justify-center"><LandingInstallButton /></div>
      </footer>
    </div>
  );
}
