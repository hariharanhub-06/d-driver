'use client';

import { Check, X } from 'lucide-react';

// Mirrors the backend password rule (backend/src/validators/auth.js):
// min 8 chars, at least one letter, at least one number.
const RULES: { label: string; test: (p: string) => boolean }[] = [
    { label: 'At least 8 characters', test: p => p.length >= 8 },
    { label: 'At least one letter', test: p => /[A-Za-z]/.test(p) },
    { label: 'At least one number', test: p => /[0-9]/.test(p) },
];

/** True when the password satisfies every rule (use to gate the submit button). */
export function passwordMeetsRules(password: string): boolean {
    return RULES.every(r => r.test(password));
}

export default function PasswordRules({ password }: { password: string }) {
    if (!password) return null;
    return (
        <ul className="mt-2 space-y-1">
            {RULES.map(r => {
                const ok = r.test(password);
                return (
                    <li key={r.label} className={`flex items-center gap-1.5 text-xs ${ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                        {ok ? <Check className="w-3.5 h-3.5 shrink-0" /> : <X className="w-3.5 h-3.5 shrink-0" />}
                        {r.label}
                    </li>
                );
            })}
        </ul>
    );
}
