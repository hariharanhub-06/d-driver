'use client';

import { Check, Hand } from 'lucide-react';
import { useT } from '@/lib/i18n';

export interface TimelineStop {
    id: string;
    name: string;
    sequence?: number;
    pickup_time?: string;
}

interface StopTimelineProps {
    stops: TimelineStop[];
    currentStopIndex: number;
    myStopId?: string;
    status: string; // running | idle | completed | paused
    direction?: string | null; // morning | evening — shown as a badge
    onStopClick?: (id: string, name: string) => void;
}

// Vertical bus-stops timeline for the parent Track sheet.
// Passed stops get a green tick, the current stop pulses, upcoming stops are grey,
// and the parent's own stop is highlighted in orange regardless of progress.
export default function StopTimeline({ stops, currentStopIndex, myStopId, status, direction, onStopClick }: StopTimelineProps) {
    const t = useT();
    const live = status === 'running';

    if (!stops.length) {
        return (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-4 text-center">
                {t('No stops on this route yet.', 'இந்த வழியில் இன்னும் நிறுத்தங்கள் இல்லை.')}
            </p>
        );
    }

    return (
        <div className="pt-1">
            <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-3 flex items-center gap-1.5">
                🚏 {t('Bus Stops', 'நிறுத்தங்கள்')}
                {direction && (
                    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${direction === 'evening' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}>
                        {direction === 'evening' ? t('Evening', 'மாலை') : t('Morning', 'காலை')}
                    </span>
                )}
            </h4>
            <ol className="relative">
                {stops.map((stop, idx) => {
                    const isMyStop = !!myStopId && stop.id === myStopId;
                    const passed = live && idx < currentStopIndex;
                    const isCurrent = live && idx === currentStopIndex;
                    const isLast = idx === stops.length - 1;
                    const clickable = !!onStopClick && !isMyStop;

                    // Connector line above this row reflects whether we've already passed it.
                    const lineColor = passed || isCurrent ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-600';

                    // Dot styling by state.
                    let dot: string;
                    if (isMyStop) dot = 'bg-orange-500 border-orange-500';
                    else if (passed) dot = 'bg-emerald-500 border-emerald-500';
                    else if (isCurrent) dot = 'bg-[var(--brand)] border-[var(--brand)] animate-pulse';
                    else dot = 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-500';

                    return (
                        <li
                            key={stop.id}
                            className={`relative flex gap-3 pb-4 ${clickable ? 'cursor-pointer group' : ''}`}
                            onClick={clickable ? () => onStopClick!(stop.id, stop.name) : undefined}
                        >
                            {/* Rail: connector + dot */}
                            <div className="relative flex flex-col items-center shrink-0 w-5">
                                {!isLast && (
                                    <span className={`absolute top-4 left-1/2 -translate-x-1/2 w-0.5 h-full ${lineColor}`} />
                                )}
                                <span className={`relative z-10 w-4 h-4 rounded-full border-2 ${dot} shrink-0 mt-0.5`} />
                            </div>

                            {/* Stop label */}
                            <div
                                className={`flex-1 min-w-0 -mt-0.5 rounded-lg px-2 py-1 transition-colors ${
                                    isMyStop ? 'bg-orange-50 dark:bg-orange-900/20' : 'group-hover:bg-slate-50 dark:group-hover:bg-slate-700/40'
                                }`}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <p className={`text-sm font-semibold truncate ${
                                        isMyStop ? 'text-orange-600 dark:text-orange-400'
                                            : passed ? 'text-slate-400 dark:text-slate-500'
                                            : 'text-slate-900 dark:text-white'
                                    }`}>
                                        {stop.name}
                                    </p>
                                    {passed && <Check className="w-4 h-4 text-emerald-500 shrink-0" />}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                    {isMyStop && (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 dark:text-orange-400">
                                            <Hand className="w-3 h-3" /> {t('Your Stop', 'உங்கள் நிறுத்தம்')}
                                        </span>
                                    )}
                                    {isCurrent && !isMyStop && (
                                        <span className="text-[11px] font-semibold text-[var(--brand)] uppercase tracking-wide">
                                            {t('Bus heading here', 'பேருந்து வருகிறது')}
                                        </span>
                                    )}
                                    {stop.pickup_time && (
                                        <span className="text-[11px] text-slate-400">{stop.pickup_time}</span>
                                    )}
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ol>
        </div>
    );
}
