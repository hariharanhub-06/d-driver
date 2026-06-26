'use client';

import { useState, useEffect } from 'react';
import { CalendarX, User } from 'lucide-react';
import api from '@/lib/api';
import { useT } from '@/lib/i18n';

interface Absence {
    id: string;
    date: string;
    reason?: string | null;
    student?: { id: string; name: string; grade?: string | null; photo_url?: string | null };
}

function fmtDate(d: string) {
    try {
        return new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    } catch {
        return d;
    }
}

export default function LeaveRequestsPage() {
    const t = useT();
    const [absences, setAbsences] = useState<Absence[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/absence?upcoming=true')
            .then(res => setAbsences(Array.isArray(res.data?.absences) ? res.data.absences : []))
            .catch(() => setAbsences([]))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="space-y-6 animate-in">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('Leave Requests', 'விடுப்பு கோரிக்கைகள்')}</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {t("Upcoming absences reported by parents. Students are auto-marked absent for the bus on these dates.", 'பெற்றோர்கள் தெரிவித்த வரவிருக்கும் விடுப்புகள். இந்த தேதிகளில் மாணவர்கள் தானாக வராதவராக குறிக்கப்படுவர்.')}
                </p>
            </div>

            <div className="page-card p-0 overflow-hidden">
                {loading ? (
                    <div className="flex justify-center py-16">
                        <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : absences.length === 0 ? (
                    <div className="text-center py-16 text-slate-400 dark:text-slate-500">
                        <CalendarX className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="font-semibold text-sm">{t('No leave requests', 'விடுப்பு கோரிக்கைகள் இல்லை')}</p>
                        <p className="text-xs mt-1">{t('Parent-reported absences will appear here', 'பெற்றோர் தெரிவித்த விடுப்புகள் இங்கே தோன்றும்')}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700">
                                    <th className="px-5 py-3 font-semibold">{t('Student', 'மாணவர்')}</th>
                                    <th className="px-5 py-3 font-semibold">{t('Date', 'தேதி')}</th>
                                    <th className="px-5 py-3 font-semibold">{t('Reason', 'காரணம்')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {absences.map(a => (
                                    <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-3">
                                                {a.student?.photo_url ? (
                                                    <img src={a.student.photo_url} alt={a.student.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                                                        <User className="w-4 h-4 text-slate-400" />
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-slate-900 dark:text-white truncate">{a.student?.name || '—'}</p>
                                                    {a.student?.grade && <p className="text-xs text-slate-400">{t('Grade', 'வகுப்பு')} {a.student.grade}</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className="inline-flex items-center bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full px-2.5 py-0.5 text-xs font-medium">
                                                {fmtDate(a.date)}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{a.reason || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
