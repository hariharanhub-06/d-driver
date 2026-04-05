'use client';

import { Bus, Users, Locate, CheckCircle2, CreditCard, Shield, MapPin, Navigation, Clock, Bell, Globe, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans selection:bg-primary-100 selection:text-primary-700">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 md:px-20 py-8 border-b border-gray-50 bg-white/80 backdrop-blur-md sticky top-0 z-[100]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary-500 rounded-lg shadow-lg shadow-primary-500/20">
            <Bus className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-gray-800 tracking-tight">D-DRIVER<span className="text-primary-500">365</span></span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-gray-600">
          <Link href="#" className="text-primary-500">Home</Link>
          <Link href="#" className="hover:text-primary-500 transition-colors">School Portal</Link>
          <Link href="#" className="hover:text-primary-500 transition-colors">Parent App</Link>
          <Link href="/login" className="bg-primary-500 text-white px-6 py-2.5 rounded-full hover:bg-primary-600 transition-all shadow-lg shadow-primary-500/20">Sign In</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-24 px-6 md:px-20 overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="z-10 space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-50 rounded-full border border-primary-100">
              <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></span>
              <span className="text-xs font-bold text-primary-700 uppercase tracking-wider">Number 1 School Bus Tracking ERP</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 leading-[1.1]">
              Ensuring <span className="text-primary-500 underline decoration-primary-200 underline-offset-8">Student Safety</span> Every Mile
            </h1>
            <p className="text-lg text-gray-500 max-w-lg leading-relaxed">
              Complete School Bus management system. Live tracking for parents, automated attendance for drivers, and full ERP control for school admins.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <Link href="/login" className="px-10 py-5 bg-primary-500 text-white rounded-2xl font-bold shadow-2xl shadow-primary-500/30 hover:scale-105 transition-transform">
                Get Started
              </Link>
              <Link href="#" className="px-10 py-5 bg-white text-gray-700 border border-gray-200 rounded-2xl font-bold hover:bg-gray-50 transition-colors">
                View Features
              </Link>
            </div>
          </div>
          <div className="relative">
            <div className="w-full aspect-[4/3] bg-gradient-to-br from-primary-500 to-emerald-600 rounded-[3rem] rotate-3 shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 flex items-center justify-center p-12">
                <Bus className="w-full h-full text-white/20 -rotate-3 group-hover:scale-110 transition-transform duration-700" strokeWidth={1} />
              </div>
              <div className="absolute bottom-10 left-10 right-10 bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center border border-white/20">
                    <Users className="text-white" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-xl">Bus #12: Live</p>
                    <p className="text-white/70 text-sm">34 Students Onboard</p>
                  </div>
                </div>
                <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white w-2/3 shadow-[0_0_8px_rgba(255,255,255,0.8)]"></div>
                </div>
                <div className="mt-4 flex justify-between items-center text-[10px] text-white/50 font-bold uppercase tracking-widest">
                  <span>Route Started</span>
                  <span>Next Stop: Oak Street</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Simplified Features */}
      <section className="py-24 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-6 md:px-20 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-4 tracking-tight">The D-DRIVER Advantage</h2>
          <p className="text-gray-500 mb-20 max-w-2xl mx-auto text-lg leading-relaxed">Modern solutions for the modern school. Streamline your operations and give parents peace of mind.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 text-left">
            <div className="p-10 bg-white rounded-[2.5rem] border border-gray-100 hover:shadow-2xl transition-all group hover:-translate-y-2">
              <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-10 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                <Locate size={32} />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-800">Live GPS Tracking</h3>
              <p className="text-gray-500 leading-relaxed">Parents track their child's bus in real-time with automated 1km departure alerts.</p>
            </div>
            <div className="p-10 bg-white rounded-[2.5rem] border border-gray-100 hover:shadow-2xl transition-all group hover:-translate-y-2">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mb-10 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-800">Smart Attendance</h3>
              <p className="text-gray-500 leading-relaxed">Drivers mark attendance with student photo pop-ups at every stop.</p>
            </div>
            <div className="p-10 bg-white rounded-[2.5rem] border border-gray-100 hover:shadow-2xl transition-all group hover:-translate-y-2">
              <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center mb-10 group-hover:bg-orange-600 group-hover:text-white transition-all shadow-sm">
                <CreditCard size={32} />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-800">Fee Management</h3>
              <p className="text-gray-500 leading-relaxed">Centralized fee collection with instant digital receipts for parents.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1a2226] text-white py-24 px-6 md:px-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-16">
          <div className="col-span-2 space-y-8">
            <div className="flex items-center gap-2">
              <Bus className="w-8 h-8 text-primary-500" />
              <span className="text-3xl font-bold tracking-tight">D-DRIVER<span className="text-primary-500">365</span></span>
            </div>
            <p className="text-gray-400 max-w-sm leading-relaxed text-lg">
              The ultimate School Bus ERP for safety, efficiency, and parent satisfaction.
            </p>
            <div className="flex gap-4">
              <div className="bg-black/40 p-4 rounded-2xl border border-white/10 hover:border-primary-500/50 cursor-pointer transition-colors">
                <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Download for iOS</p>
                <p className="font-bold">App Store</p>
              </div>
              <div className="bg-black/40 p-4 rounded-2xl border border-white/10 hover:border-primary-500/50 cursor-pointer transition-colors">
                <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Download for Android</p>
                <p className="font-bold">Google Play</p>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-bold mb-8 text-primary-500 uppercase tracking-widest text-xs">Solutions</h4>
            <ul className="space-y-4 text-gray-400">
              <li><Link href="#" className="hover:text-white transition-colors">For Schools</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">For Drivers</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">For Parents</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Pricing Plan</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-8 text-primary-500 uppercase tracking-widest text-xs">Contact</h4>
            <div className="space-y-4 text-gray-400 text-sm">
              <p>Support: support@ddriver.com</p>
              <p>Sales: sales@ddriver.com</p>
              <p>Toll Free: 1-800-DDRIVE</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
