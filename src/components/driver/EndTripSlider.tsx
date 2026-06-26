'use client';

import { useState, useRef } from 'react';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { useT } from '@/lib/i18n';

// Slide-to-confirm modal for ending a trip (shared by the ride page + dashboard).
export default function EndTripSlider({
    onConfirm,
    onCancel,
    isEnding,
}: {
    onConfirm: () => void;
    onCancel: () => void;
    isEnding: boolean;
}) {
    const t = useT();
    const [filled, setFilled] = useState(0);
    const filledRef = useRef(0);
    const trackRef = useRef<HTMLDivElement>(null);
    const dragging = useRef(false);
    const done = useRef(false);

    const toFilled = (clientX: number) => {
        const track = trackRef.current;
        if (!track) return filledRef.current;
        const rect = track.getBoundingClientRect();
        const usable = rect.width - 56;
        const relX = clientX - rect.left - 28;
        return Math.max(0, Math.min(100, (relX / usable) * 100));
    };

    const onStart = (e: React.PointerEvent) => {
        if (done.current) return;
        dragging.current = true;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    };
    const onMove = (e: React.PointerEvent) => {
        if (!dragging.current || done.current) return;
        const f = toFilled(e.clientX);
        filledRef.current = f;
        setFilled(f);
    };
    const onEnd = () => {
        if (done.current) return;
        dragging.current = false;
        if (filledRef.current >= 90) {
            done.current = true;
            setFilled(100);
            filledRef.current = 100;
            setTimeout(onConfirm, 350);
        } else {
            setFilled(0);
            filledRef.current = 0;
        }
    };

    const thumbLeft = `calc(4px + ${filled / 100} * (100% - 56px))`;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[500] flex items-center justify-center p-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
                <div className="w-12 h-12 bg-red-50 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                    <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white text-center mb-1">{t('End Trip?', 'பயணம் முடிவா?')}</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 text-center mb-5">{t('Slide all the way to confirm', 'உறுதிப்படுத்த நழுவுங்கள்')}</p>

                <div
                    ref={trackRef}
                    className="relative h-14 bg-red-50 dark:bg-red-900/20 rounded-full select-none overflow-hidden"
                    style={{ touchAction: 'none' }}
                    onPointerDown={onStart}
                    onPointerMove={onMove}
                    onPointerUp={onEnd}
                    onPointerCancel={onEnd}
                >
                    <div
                        className="absolute inset-y-0 left-0 bg-red-200/60 dark:bg-red-800/40 rounded-full transition-none"
                        style={{ width: `calc(4px + ${filled / 100} * (100% - 56px) + 28px)` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-xs font-bold text-red-500 uppercase tracking-widest">
                            {filled >= 98 ? t('Ending trip…', 'பயணம் முடிக்கிறது…') : t('Slide to End →', 'முடிக்க ஸ்லைடு செய்யவும் →')}
                        </span>
                    </div>
                    <div
                        className="absolute top-1 bottom-1 w-12 bg-red-500 rounded-full shadow-lg flex items-center justify-center pointer-events-none"
                        style={{ left: thumbLeft }}
                    >
                        {isEnding
                            ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            : <ChevronRight className="w-5 h-5 text-white" />
                        }
                    </div>
                </div>

                <button
                    onClick={onCancel}
                    className="w-full mt-4 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 py-2 transition-colors text-center"
                >
                    {t('Cancel', 'ரத்து செய்')}
                </button>
            </div>
        </div>
    );
}
