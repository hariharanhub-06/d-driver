'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, Minus, Clock, MapPin, Bus } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface AttendanceRecord {
  date: string;
  status: 'present' | 'absent' | 'holiday';
  note?: string;
  marked_at?: string;
  stop_name?: string;
}

interface Child {
  id: string;
  name: string;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function formatMonth(year: number, month: number) {
  return new Date(year, month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

// Returns 0=Mon … 6=Sun
function getFirstDayOfWeek(year: number, month: number) {
  const d = new Date(year, month, 1).getDay(); // 0=Sun
  return (d + 6) % 7; // shift so Mon=0
}

export default function AttendancePage() {
  const { user } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(now.getDate());
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Fetch children list once
  useEffect(() => {
    api.get('/students/my-children')
      .then(r => {
        const list: Child[] = Array.isArray(r.data) ? r.data : [];
        setChildren(list);
        if (list.length > 0) setSelectedChild(list[0].id);
      })
      .catch(() => {});
  }, []);

  // Fetch attendance whenever child or month changes
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
    records.forEach(r => {
      const day = new Date(r.date).getDate();
      m[day] = r;
    });
    return m;
  }, [records]);

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelectedDay(null);
  };

  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelectedDay(null);
  };

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

  // Build a fake timeline from the record
  const timeline = useMemo(() => {
    if (!selectedRecord || selectedRecord.status !== 'present') return [];
    const items = [];
    if (selectedRecord.stop_name) {
      items.push({
        icon: MapPin,
        label: `Boarded at ${selectedRecord.stop_name}`,
        time: selectedRecord.marked_at
          ? new Date(selectedRecord.marked_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
          : '—',
        colorClass: 'text-[var(--brand)]',
      });
    }
    items.push({
      icon: Bus,
      label: 'Marked Present at School',
      time: selectedRecord.marked_at
        ? new Date(selectedRecord.marked_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        : '—',
      colorClass: 'text-emerald-600 dark:text-emerald-400',
    });
    return items;
  }, [selectedRecord]);

  const stats = useMemo(() => {
    const total = records.length;
    const present = records.filter(r => r.status === 'present').length;
    const absent = records.filter(r => r.status === 'absent').length;
    return { total, present, absent };
  }, [records]);

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-slate-900 dark:text-white">Attendance</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Monthly record</p>
      </div>

      {/* Child selector */}
      {children.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {children.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedChild(c.id)}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                selectedChild === c.id
                  ? 'bg-[var(--brand)] text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-4 text-center">
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Tracked</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.present}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Present</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-4 text-center">
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.absent}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Absent</p>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
        {/* Month navigator */}
        <div className="flex items-center justify-between mb-5">
          <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center bg-slate-50 dark:bg-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-600 transition-all">
            <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </button>
          <p className="font-bold text-slate-900 dark:text-white text-sm">{formatMonth(year, month)}</p>
          <button
            onClick={nextMonth}
            disabled={year === now.getFullYear() && month === now.getMonth()}
            className="w-8 h-8 flex items-center justify-center bg-slate-50 dark:bg-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-600 transition-all disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 mb-2">
          {DAYS.map(d => (
            <div key={d} className="text-center text-[9px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 py-1">
              {d}
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-y-1">
            {/* Empty offset cells */}
            {Array.from({ length: firstDayOffset }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
              const rec = recordMap[day];
              const isToday = day === now.getDate() && month === now.getMonth() && year === now.getFullYear();
              const isSelected = day === selectedDay;
              const isWeekend = (() => {
                const dow = (new Date(year, month, day).getDay() + 6) % 7;
                return dow === 5 || dow === 6;
              })();

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                  className={`flex flex-col items-center py-1.5 rounded-xl transition-all ${
                    isSelected
                      ? 'bg-[var(--brand)]/10 ring-1 ring-[var(--brand)]'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <span className={`text-xs font-semibold ${
                    isToday ? 'text-[var(--brand)]' : isWeekend ? 'text-slate-300 dark:text-slate-600' : 'text-slate-700 dark:text-slate-300'
                  }`}>
                    {day}
                  </span>
                  <div className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                    isWeekend && !rec ? 'bg-transparent' : dotColor(day)
                  }`} />
                </button>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
          {[
            { color: 'bg-emerald-400', label: 'Present' },
            { color: 'bg-red-400', label: 'Absent' },
            { color: 'bg-slate-200 dark:bg-slate-600', label: 'No record' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${l.color}`} />
              <span className="text-xs text-slate-500 dark:text-slate-400">{l.label}</span>
            </div>
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
            <div className="flex items-center gap-3 text-slate-400">
              <Minus className="w-4 h-4" />
              <span className="text-sm text-slate-500 dark:text-slate-400">No attendance recorded</span>
            </div>
          ) : selectedRecord.status === 'absent' ? (
            <div className="flex items-center gap-3">
              <XCircle className="w-5 h-5 text-red-500" />
              <div>
                <p className="font-semibold text-red-600 dark:text-red-400 text-sm">Absent</p>
                {selectedRecord.note && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{selectedRecord.note}</p>
                )}
              </div>
            </div>
          ) : selectedRecord.status === 'present' ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <p className="font-semibold text-emerald-600 dark:text-emerald-400 text-sm">Present</p>
              </div>
              {/* Timeline */}
              {timeline.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 pl-2 relative">
                  {idx < timeline.length - 1 && (
                    <div className="absolute left-[13px] top-6 w-px h-full bg-slate-100 dark:bg-slate-700" />
                  )}
                  <div className={`w-5 h-5 rounded-lg bg-slate-50 dark:bg-slate-700 flex items-center justify-center shrink-0 ${item.colorClass}`}>
                    <item.icon className="w-3 h-3" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.label}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {item.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3 text-slate-400">
              <Minus className="w-4 h-4" />
              <span className="text-sm text-slate-500 dark:text-slate-400 capitalize">{selectedRecord.status}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
