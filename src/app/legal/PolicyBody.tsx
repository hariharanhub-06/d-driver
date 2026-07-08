import { EFFECTIVE_DATE, type Policy } from './legalData';

// Pure presentational renderer for a single policy's body (effective date, intro,
// and sections). Shared by the /legal/* routes (PolicyView) and the in-page consent
// modal on the first-login screen, so the two never drift.
export default function PolicyBody({ policy }: { policy: Policy }) {
  return (
    <div>
      <p className="text-sm text-slate-500 dark:text-slate-400">Effective Date: {EFFECTIVE_DATE}</p>
      <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{policy.intro}</p>

      <div className="mt-8 space-y-8">
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
    </div>
  );
}
