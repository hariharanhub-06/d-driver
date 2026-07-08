import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

// Shared chrome for the public /legal/* policy pages.
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/onlive-logo.png"
              alt="Onlive"
              className="h-9 w-9 rounded-lg bg-[#0a0f1e] object-contain"
            />
            <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white">ONLIVE</span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
          >
            <ArrowLeft size={14} />
            Home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10 sm:py-14">{children}</main>
    </div>
  );
}
