import { notFound } from 'next/navigation';
import { POLICIES, POLICY_LINKS } from './legalData';
import PolicyBody from './PolicyBody';
import Link from 'next/link';

// Renders one legal policy from the structured content in legalData.ts.
// Used by each /legal/<slug>/page.tsx route.
export default function PolicyView({ slug }: { slug: string }) {
  const policy = POLICIES[slug];
  if (!policy) notFound();

  return (
    <article>
      <header className="mb-8">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">{policy.title}</h1>
      </header>

      <PolicyBody policy={policy} />

      {/* Cross-links to the other policies. */}
      <footer className="mt-12 border-t border-slate-200 pt-6 dark:border-slate-800">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Related documents</p>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {POLICY_LINKS.filter((l) => l.slug !== slug).map((l) => (
            <Link
              key={l.slug}
              href={`/legal/${l.slug}`}
              className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </footer>
    </article>
  );
}
