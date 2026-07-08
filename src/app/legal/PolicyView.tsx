import { notFound } from 'next/navigation';
import { EFFECTIVE_DATE, POLICIES, POLICY_LINKS } from './legalData';
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
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Effective Date: {EFFECTIVE_DATE}</p>
        <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{policy.intro}</p>
      </header>

      <div className="space-y-8">
        {policy.sections.map((section, i) => (
          <section key={i}>
            {section.heading && (
              <h2 className="mb-3 text-lg font-bold text-slate-800 dark:text-slate-100">{section.heading}</h2>
            )}
            <div className="space-y-3">
              {section.blocks.map((block, j) =>
                block.type === 'p' ? (
                  <p key={j} className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {block.text}
                  </p>
                ) : (
                  <ul key={j} className="list-disc space-y-2 pl-5">
                    {block.items.map((item, k) => (
                      <li key={k} className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                        {item}
                      </li>
                    ))}
                  </ul>
                )
              )}
            </div>
          </section>
        ))}
      </div>

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
