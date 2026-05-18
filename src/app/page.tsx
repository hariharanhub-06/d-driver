'use client';

import { Bus, Users, Locate, CheckCircle2, CreditCard, MapPin, Bell, BarChart3, Navigation, Clock } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const BusScene = dynamic(() => import('@/components/ui/BusScene'), { ssr: false });

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── Navigation ───────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-6 md:px-20 py-6 bg-white/90 backdrop-blur-md sticky top-0 z-[100] border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#22c55e] rounded-xl shadow-lg shadow-green-500/25">
            <Bus className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900 tracking-tight">
            D-DRIVER<span className="text-[#22c55e]">365</span>
          </span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-gray-600">
          <Link href="#features" className="hover:text-[#22c55e] transition-colors">Features</Link>
          <Link href="#how-it-works" className="hover:text-[#22c55e] transition-colors">How It Works</Link>
          <Link href="/login" className="bg-[#22c55e] text-white px-6 py-2.5 rounded-full hover:bg-green-600 transition-all shadow-md shadow-green-500/20 font-semibold">
            Sign In
          </Link>
        </div>
        {/* Mobile Sign In */}
        <Link href="/login" className="md:hidden bg-[#22c55e] text-white px-4 py-2 rounded-full text-sm font-semibold">
          Sign In
        </Link>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-white pt-12 pb-0 px-6 md:px-20">
        {/* Subtle background road texture pattern */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(0,0,0,0.015) 40px, rgba(0,0,0,0.015) 41px)',
        }} />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-end">
          {/* Left — copy */}
          <div className="z-10 pb-12 lg:pb-20 space-y-7">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-green-200 bg-green-50">
              <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
              <span className="text-xs font-bold text-green-700 uppercase tracking-wider">Live Fleet Tracking</span>
            </div>

            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-[1.08]">
              Every Mile,<br />
              Every Child,{' '}
              <span className="relative inline-block text-[#22c55e]">
                Safe.
                {/* Underline accent */}
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 10" preserveAspectRatio="none">
                  <path d="M0,8 Q50,0 100,8 Q150,16 200,8" stroke="#22c55e" strokeWidth="3" fill="none" strokeLinecap="round"/>
                </svg>
              </span>
            </h1>

            <p className="text-lg text-gray-500 leading-relaxed max-w-md">
              Complete school bus management — live GPS tracking for parents, digital attendance for drivers, and full ERP control for admins.
            </p>

            {/* Stats row */}
            <div className="flex flex-wrap gap-6 pt-2">
              {[
                { n: '500+', l: 'Schools' },
                { n: '25K+', l: 'Students' },
                { n: '1200+', l: 'Buses' },
              ].map(({ n, l }) => (
                <div key={l}>
                  <p className="text-2xl font-bold text-gray-900">{n}</p>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{l}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/login"
                className="px-8 py-4 bg-[#22c55e] text-white rounded-2xl font-bold shadow-xl shadow-green-500/25 hover:scale-105 hover:bg-green-600 transition-all"
              >
                Get Started Free
              </Link>
              <Link
                href="#how-it-works"
                className="px-8 py-4 bg-white text-gray-700 border-2 border-gray-200 rounded-2xl font-bold hover:border-[#22c55e] hover:text-[#22c55e] transition-all"
              >
                See How It Works
              </Link>
            </div>
          </div>

          {/* Right — animated bus landscape scene */}
          <div className="relative lg:h-auto">
            {/* Floating info card — overlaid on scene */}
            <div className="absolute top-6 right-6 z-20 bg-white/90 backdrop-blur-md rounded-2xl shadow-lg px-5 py-4 border border-gray-100 hidden md:block">
              <div className="flex items-center gap-3 mb-2.5">
                <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center">
                  <Navigation className="w-4 h-4 text-[#22c55e]" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-800">Route A — Live</p>
                  <p className="text-[11px] text-gray-400">28 students onboard</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                <Clock className="w-3 h-3" />
                <span>Next stop in <span className="font-bold text-gray-700">4 min</span></span>
              </div>
            </div>

            {/* The animated bus scene fills the right column */}
            <BusScene className="w-full rounded-t-3xl" style={{ height: 320 } as any} />
          </div>
        </div>
      </section>

      {/* ── Road divider stripe ───────────────────────────────────── */}
      <div className="h-3 bg-gray-900 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center">
          <div className="flex w-full gap-8 px-8">
            {Array.from({ length: 30 }).map((_, i) => (
              <div key={i} className="h-1 w-10 bg-yellow-400 rounded-full opacity-60 shrink-0" />
            ))}
          </div>
        </div>
      </div>

      {/* ── Features ─────────────────────────────────────────────── */}
      <section id="features" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 md:px-20">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gray-200 mb-5">
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Platform Features</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight">Built for the road ahead</h2>
            <p className="text-gray-500 max-w-xl mx-auto text-lg">Every feature designed for the real-world needs of school transport operations.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 — GPS Tracking */}
            <div className="group bg-white rounded-3xl p-8 border border-gray-100 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 overflow-hidden relative">
              {/* Background bus route art */}
              <svg className="absolute -right-6 -bottom-6 w-40 h-40 text-green-50 group-hover:text-green-100 transition-colors" viewBox="0 0 100 100" fill="currentColor">
                <circle cx="50" cy="50" r="48" />
                <path d="M10,50 Q30,20 50,50 Q70,80 90,50" stroke="#22c55e" strokeWidth="3" fill="none" opacity="0.3"/>
                <circle cx="50" cy="50" r="5" fill="#22c55e" opacity="0.3"/>
                <circle cx="20" cy="50" r="4" fill="#22c55e" opacity="0.2"/>
                <circle cx="80" cy="50" r="4" fill="#22c55e" opacity="0.2"/>
              </svg>
              <div className="relative z-10">
                <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-[#22c55e] group-hover:shadow-lg group-hover:shadow-green-500/30 transition-all">
                  <Locate className="w-7 h-7 text-[#22c55e] group-hover:text-white transition-colors" />
                </div>
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-50 border border-green-100 mb-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
                  <span className="text-[10px] font-bold text-green-700 uppercase tracking-wider">Real-time</span>
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Live GPS Tracking</h3>
                <p className="text-gray-500 text-sm leading-relaxed">Parents watch their child's bus on a live map. Auto-alert when bus is 1km from their stop — no more waiting outside.</p>
              </div>
            </div>

            {/* Feature 2 — Attendance */}
            <div className="group bg-white rounded-3xl p-8 border border-gray-100 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 overflow-hidden relative">
              <svg className="absolute -right-4 -bottom-4 w-36 h-36 text-blue-50 group-hover:text-blue-100 transition-colors" viewBox="0 0 100 100" fill="currentColor">
                <circle cx="50" cy="50" r="48"/>
                <path d="M20,70 L30,60 L50,75 L80,40" stroke="#3B82F6" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.3"/>
              </svg>
              <div className="relative z-10">
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-500 group-hover:shadow-lg group-hover:shadow-blue-500/30 transition-all">
                  <CheckCircle2 className="w-7 h-7 text-blue-500 group-hover:text-white transition-colors" />
                </div>
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-100 mb-3">
                  <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Stop by stop</span>
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Smart Attendance</h3>
                <p className="text-gray-500 text-sm leading-relaxed">Driver sees each student's photo card at every stop. One tap to mark present or absent. Parents notified instantly on any changes.</p>
              </div>
            </div>

            {/* Feature 3 — Fee Management */}
            <div className="group bg-white rounded-3xl p-8 border border-gray-100 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 overflow-hidden relative">
              <svg className="absolute -right-4 -bottom-4 w-36 h-36 text-orange-50 group-hover:text-orange-100 transition-colors" viewBox="0 0 100 100" fill="currentColor">
                <circle cx="50" cy="50" r="48"/>
                <rect x="22" y="35" width="56" height="35" rx="5" stroke="#F97316" strokeWidth="3" fill="none" opacity="0.3"/>
                <line x1="22" y1="50" x2="78" y2="50" stroke="#F97316" strokeWidth="2" opacity="0.3"/>
              </svg>
              <div className="relative z-10">
                <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-orange-500 group-hover:shadow-lg group-hover:shadow-orange-500/30 transition-all">
                  <CreditCard className="w-7 h-7 text-orange-500 group-hover:text-white transition-colors" />
                </div>
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-orange-50 border border-orange-100 mb-3">
                  <span className="text-[10px] font-bold text-orange-700 uppercase tracking-wider">Automated</span>
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Fee Management</h3>
                <p className="text-gray-500 text-sm leading-relaxed">Auto-generate fees per student schedule. Online Razorpay payments, cash recording, and instant digital receipts — all in one place.</p>
              </div>
            </div>
          </div>

          {/* Secondary features row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            {[
              { icon: Bell,       color: 'purple', label: 'Push Notifications',  sub: 'Bus approaching, boarded, arrived' },
              { icon: BarChart3,  color: 'teal',   label: 'Reports & Analytics', sub: 'Attendance, fuel, shift logs' },
              { icon: MapPin,     color: 'red',    label: 'Stop Management',     sub: 'Sequence, timing, requests' },
              { icon: Users,      color: 'indigo', label: 'Multi-role Access',   sub: 'Admin, Driver, Parent' },
            ].map(({ icon: Icon, color, label, sub }) => (
              <div key={label} className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-md transition-shadow">
                <Icon className={`w-6 h-6 text-${color}-500 mb-3`} />
                <p className="text-sm font-bold text-gray-800 mb-1">{label}</p>
                <p className="text-xs text-gray-400">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 md:px-20">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gray-100 mb-5">
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">The Journey</span>
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">From setup to live in minutes</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Three simple steps to transform how your school manages student transport.</p>
          </div>

          {/* Steps with bus route connecting them */}
          <div className="relative">
            {/* Connecting road line */}
            <div className="hidden md:block absolute top-16 left-[16.66%] right-[16.66%] h-1 bg-gray-200 z-0">
              <div className="absolute inset-0 flex items-center gap-4 px-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="h-1 w-6 bg-[#22c55e] rounded-full opacity-40 shrink-0" />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative z-10">
              {[
                {
                  step: '01',
                  icon: Bus,
                  title: 'Admin Sets Up Routes',
                  desc: 'Add buses, assign drivers, create routes with stops in order. Students are linked to their boarding stop automatically.',
                  color: 'green',
                },
                {
                  step: '02',
                  icon: Navigation,
                  title: 'Driver Starts Trip',
                  desc: 'Driver selects Morning or Evening route, starts trip. GPS goes live. Parents receive "Bus Started" notification instantly.',
                  color: 'blue',
                },
                {
                  step: '03',
                  icon: Bell,
                  title: 'Parents Track Live',
                  desc: 'Parents watch the bus on a real-time map. Get "Bus 1km away" alert. See their child marked as boarded. Peace of mind — every mile.',
                  color: 'orange',
                },
              ].map(({ step, icon: Icon, title, desc, color }) => (
                <div key={step} className="flex flex-col items-center text-center">
                  <div className={`w-14 h-14 bg-${color === 'green' ? 'green' : color === 'blue' ? 'blue' : 'orange'}-100 rounded-2xl flex items-center justify-center mb-5 shadow-sm`}>
                    <Icon className={`w-7 h-7 text-${color === 'green' ? '[#22c55e]' : color === 'blue' ? 'blue-500' : 'orange-500'}`} />
                  </div>
                  <div className={`text-xs font-black ${color === 'green' ? 'text-green-400' : color === 'blue' ? 'text-blue-400' : 'text-orange-400'} mb-2 tracking-widest`}>
                    STEP {step}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────────────────── */}
      <section className="relative bg-gray-900 py-20 px-6 md:px-20 overflow-hidden">
        {/* Road stripe decoration */}
        <div className="absolute bottom-0 left-0 right-0 h-3">
          <div className="flex items-center h-full gap-6 px-6">
            {Array.from({ length: 30 }).map((_, i) => (
              <div key={i} className="h-1.5 w-10 bg-yellow-400 rounded-full opacity-40 shrink-0" />
            ))}
          </div>
        </div>
        {/* Decorative bus silhouette */}
        <div className="absolute right-0 top-0 bottom-0 w-64 flex items-center justify-center opacity-5">
          <Bus className="w-48 h-48" strokeWidth={0.5} />
        </div>

        <div className="max-w-3xl mx-auto text-center relative z-10">
          <p className="text-green-400 font-bold text-sm uppercase tracking-widest mb-4">Ready to roll?</p>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
            Transform your school's transport today
          </h2>
          <p className="text-gray-400 text-lg mb-10 max-w-xl mx-auto">
            Join hundreds of schools running safer, smarter bus operations with D-Driver365.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/login"
              className="px-10 py-4 bg-[#22c55e] text-white rounded-2xl font-bold shadow-xl shadow-green-500/20 hover:scale-105 transition-transform"
            >
              Start for Free
            </Link>
            <Link
              href="#features"
              className="px-10 py-4 bg-white/10 text-white border border-white/20 rounded-2xl font-bold hover:bg-white/20 transition-colors"
            >
              Explore Features
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="bg-[#111827] text-white py-16 px-6 md:px-20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-2 space-y-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-[#22c55e] rounded-xl">
                <Bus className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-bold">D-DRIVER<span className="text-[#22c55e]">365</span></span>
            </div>
            <p className="text-gray-400 max-w-xs leading-relaxed text-sm">
              The complete school bus ERP — built for safety, transparency, and operational efficiency.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-5 text-[#22c55e] uppercase tracking-widest text-xs">Portal</h4>
            <ul className="space-y-3 text-gray-400 text-sm">
              <li><Link href="/login" className="hover:text-white transition-colors">School Admin</Link></li>
              <li><Link href="/login" className="hover:text-white transition-colors">Driver App</Link></li>
              <li><Link href="/login" className="hover:text-white transition-colors">Parent App</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-5 text-[#22c55e] uppercase tracking-widest text-xs">Support</h4>
            <ul className="space-y-3 text-gray-400 text-sm">
              <li>support@ddriver365.com</li>
              <li>Available Mon–Sat</li>
              <li>9 AM – 6 PM IST</li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-10 pt-8 border-t border-white/10 text-center text-gray-600 text-xs">
          © {new Date().getFullYear()} D-Driver365. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
