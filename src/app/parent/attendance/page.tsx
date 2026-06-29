'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, Minus, Clock, MapPin, Bus } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { ta, useT } from '@/lib/i18n';

interface AttendanceRecord {
  date: string;
  status: 'present' | 'absent' | 'holiday';
  note?: string;
  marked_at?: string;
  stop_name?: string;
  pickup_status?: 'present' | 'absent' | null;
  dropoff_status?: 'present' | 'absent' | null;
  pickup_at?: string | null;
  dropoff_at?: string | null;
}
interface Child { id: string; name: string; }

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getDaysInMonth(year: number, month: number) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDayOfWeek(year: number, month: number) { return (new Date(year, month, 1).getDay() + 6) % 7; }

// ── ALL EXISTING LOGIC PRESERVED ──────────────────────────────────────────
export default function AttendancePage() {
  const t = useT();
  const { user } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(now.getDate());
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/students/my-children')
      .then(r => {
        const list: Child[] = Array.isArray(r.data) ? r.data : [];
        setChildren(list);
        if (list.length > 0) setSelectedChild(list[0].id);
      }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedChild) return;
    setLoading(true);
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
    api.get(`/attendance?student_id=${selectedChild}&month=${monthStr}`)
      .then(r => setRecords(Array.isArray(r.data) ? r.data : []))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, [selectedChild, year, month]);

  const recordMap = useMemo(() => {
    const m: Record<string, AttendanceRecord> = {};
    records.forEach(r => { const day = new Date(r.date).getDate(); m[day] = r; });
    return m;
  }, [records]);

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); setSelectedDay(null); };
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); setSelectedDay(null); };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOffset = getFirstDayOfWeek(year, month);

  const dotColor = (day: number) => {
    const rec = recordMap[day];
    if (!rec) return 'bg-slate-200 dark:bg-slate-600';
    if (rec.status === 'present') return 'bg-emerald-400';
    if (rec.status === 'absent') return 'bg-red-400';
    return 'bg-slate-300 dark:bg-slate-600';
  };

  const selectedRecord = selectedDay ? recordMap[selectedDay] : null;

  const timeline = useMemo(() => {
    const r = selectedRecord;
    if (!r) return [];
    const wasPresent = r.status === 'present' || r.pickup_status === 'present' || r.dropoff_status === 'present';
    if (!wasPresent) return [];
    const fmt = (ts?: string | null) => ts ? new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';
    const items: { icon: typeof Bus; label: string; time: string; colorClass: string }[] = [];
    // Picked up / boarded (morning: at the stop; evening: at school). Old rows without the
    // per-phase column fall back to the single `status`.
    if (r.pickup_status === 'present' || (!r.pickup_status && !r.dropoff_status && r.status === 'present')) {
      items.push({ icon: r.stop_name ? MapPin : Bus, label: r.stop_name ? `Picked up at ${r.stop_name}` : 'Picked up', time: fmt(r.pickup_at || r.marked_at), colorClass: 'text-[var(--brand)]' });
    }
    // Dropped off (evening: at the child's stop).
    if (r.dropoff_status === 'present') {
      items.push({ icon: Bus, label: r.stop_name ? `Dropped off at ${r.stop_name}` : 'Dropped off', time: fmt(r.dropoff_at || r.marked_at), colorClass: 'text-emerald-600 dark:text-emerald-400' });
    }
    return items;
  }, [selectedRecord]);

  const stats = useMemo(() => {
    const present = records.filter(r => r.status === 'present').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const pct = records.length > 0 ? Math.round((present / records.length) * 100) : 0;
    return { present, absent, pct, total: records.length };
  }, [records]);

  const selectedChildName = children.find(c => c.id === selectedChild)?.name || '';

  // ─── NEW BILINGUAL UI ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-emerald-600 dark:bg-emerald-800 px-4 pt-10 pb-5">
        <h1 className="text-xl font-bold text-white">
          {t('Attendance', ta.attendance)}
        </h1>
        {selectedChildName && (
          <p className="text-white/80 text-sm mt-0.5">{selectedChildName} {children.find(c => c.id === selectedChild)?.name ? '' : ''}</p>
        )}
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Child selector */}
        {children.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {children.map(c => (
              <button key={c.id} onClick={() => setSelectedChild(c.id)} className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${selectedChild === c.id ? 'bg-[var(--brand)] text-white' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'}`}>
                {c.name}
              </button>
            ))}
          </div>
        )}

        {/* Monthly summary card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {t("This Month's Attendance", ta.thisMonthAttendance)}
              </p>
              <div className="flex items-center gap-4 mt-3">
                <div className="text-center">
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.present}</p>
                  <p className="text-xs text-slate-500">{t('Present', ta.present)}</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-500">{stats.absent}</p>
                  <p className="text-xs text-slate-500">{t('Absent', ta.absent)}</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-400">{stats.total}</p>
                  <p className="text-xs text-slate-500">{t('Total', 'மொத்தம்')}</p>
                </div>
              </div>
              {stats.total > 0 && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-500">{stats.present} / {stats.total} {t('days', ta.days)}</span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${stats.pct}%` }} />
                  </div>
                </div>
              )}
            </div>
            {/* % circle */}
            <div className="w-16 h-16 rounded-full border-4 border-emerald-500 flex items-center justify-center ml-4 shrink-0">
              <div className="text-center">
                <p className="text-base font-black text-emerald-600 dark:text-emerald-400 leading-none">{stats.pct}%</p>
                <p className="text-[9px] text-slate-400 leading-none mt-0.5">Attendance</p>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
          <div className="flex items-center justify-between mb-5">
            <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center bg-slate-50 dark:bg-slate-700 rounded-xl">
              <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            </button>
            <p className="font-bold text-slate-900 dark:text-white text-sm">
              {new Date(year, month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </p>
            <button onClick={nextMonth} disabled={year === now.getFullYear() && month === now.getMonth()} className="w-8 h-8 flex items-center justify-center bg-slate-50 dark:bg-slate-700 rounded-xl disabled:opacity-30">
              <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            </button>
          </div>
          <div className="grid grid-cols-7 mb-2">
            {DAYS.map(d => <div key={d} className="text-center text-[9px] font-semibold uppercase tracking-widest text-slate-400 py-1">{d}</div>)}
          </div>
          {loading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <div className="grid grid-cols-7 gap-y-1">
              {Array.from({ length: firstDayOffset }).map((_, i) => <div key={`e-${i}`} />)}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                const rec = recordMap[day];
                const isToday = day === now.getDate() && month === now.getMonth() && year === now.getFullYear();
                const isSelected = day === selectedDay;
                const isWeekend = (() => { const dow = (new Date(year, month, day).getDay() + 6) % 7; return dow === 5 || dow === 6; })();
                return (
                  <button key={day} onClick={() => setSelectedDay(day === selectedDay ? null : day)} className={`flex flex-col items-center py-1.5 rounded-xl transition-all ${isSelected ? 'bg-[var(--brand)]/10 ring-1 ring-[var(--brand)]' : 'hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                    <span className={`text-xs font-semibold ${isToday ? 'text-[var(--brand)]' : isWeekend ? 'text-slate-300 dark:text-slate-600' : 'text-slate-700 dark:text-slate-300'}`}>{day}</span>
                    <div className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isWeekend && !rec ? 'bg-transparent' : dotColor(day)}`} />
                  </button>
                );
              })}
            </div>
          )}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
            {[{ color: 'bg-emerald-400', label: t('Present', ta.present) }, { color: 'bg-red-400', label: t('Absent', ta.absent) }, { color: 'bg-slate-200 dark:bg-slate-600', label: t('No record', 'பதிவு இல்லை') }].map(l => (
              <div key={l.label} className="flex items-center gap-1.5"><div className={`w-2 h-2 rounded-full ${l.color}`} /><span className="text-[10px] text-slate-500">{l.label}</span></div>
            ))}
          </div>
        </div>

        {/* Selected day detail */}
        {selectedDay && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-4">
              {new Date(year, month, selectedDay).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>
            {!selectedRecord ? (
              <div className="flex items-center gap-3 text-slate-400"><Minus className="w-4 h-4" /><span className="text-sm">{t('No attendance recorded', 'வருகை பதிவு இல்லை')}</span></div>
            ) : selectedRecord.status === 'absent' ? (
              <div className="flex items-center gap-3">
                <XCircle className="w-5 h-5 text-red-500" />
                <div><p className="font-semibold text-red-600 dark:text-red-400 text-sm">{t('Absent', ta.absent)}</p>{selectedRecord.note && <p className="text-sm text-slate-500 mt-0.5">{selectedRecord.note}</p>}</div>
              </div>
            ) : selectedRecord.status === 'present' ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 mb-4"><CheckCircle2 className="w-5 h-5 text-emerald-500" /><p className="font-semibold text-emerald-600 dark:text-emerald-400 text-sm">{t('Present', ta.present)}</p></div>
                {timeline.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 pl-2 relative">
                    {idx < timeline.length - 1 && <div className="absolute left-[13px] top-6 w-px h-full bg-slate-100 dark:bg-slate-700" />}
                    <div className={`w-5 h-5 rounded-lg bg-slate-50 dark:bg-slate-700 flex items-center justify-center shrink-0 ${item.colorClass}`}><item.icon className="w-3 h-3" /></div>
                    <div className="flex-1"><p className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.label}</p><p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><Clock className="w-3 h-3" />{item.time}</p></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-3 text-slate-400"><Minus className="w-4 h-4" /><span className="text-sm capitalize">{selectedRecord.status}</span></div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
