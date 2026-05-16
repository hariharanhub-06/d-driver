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
    if (!rec) return 'bg-slate-700';
    if (rec.status === 'present') return 'bg-green-400';
    if (rec.status === 'absent') return 'bg-red-400';
    return 'bg-slate-600';
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
        color: 'text-blue-400',
      });
    }
    items.push({
      icon: Bus,
      label: 'Marked Present at School',
      time: selectedRecord.marked_at
        ? new Date(selectedRecord.marked_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        : '—',
      color: 'text-green-400',
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
    <div className="min-h-full bg-black text-white font-sans pb-8">
      {/* Ambient glow */}
      <div className="absolute top-0 left-0 w-full h-64 bg-blue-600/5 blur-[120px] pointer-events-none" />

      <div className="relative z-10 p-6 pt-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-black tracking-tight">Attendance</h1>
          <p className="text-white/30 font-bold uppercase tracking-widest text-[10px] mt-1">
            Monthly record
          </p>
        </div>

        {/* Child selector */}
        {children.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {children.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedChild(c.id)}
                className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-tight transition-all whitespace-nowrap ${
                  selectedChild === c.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/5 text-white/50 border border-white/10'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Days Tracked', value: stats.total, color: 'text-white' },
            { label: 'Present', value: stats.present, color: 'text-green-400' },
            { label: 'Absent', value: stats.absent, color: 'text-red-400' },
          ].map(s => (
            <div key={s.label} className="bg-[#121212] rounded-2xl p-4 border border-white/5 text-center">
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Calendar */}
        <div className="bg-[#121212] rounded-[2rem] border border-white/5 p-5">
          {/* Month navigator */}
          <div className="flex items-center justify-between mb-5">
            <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center bg-white/5 rounded-xl hover:bg-white/10 transition-all">
              <ChevronLeft className="w-4 h-4 text-white/60" />
            </button>
            <p className="font-black text-sm">{formatMonth(year, month)}</p>
            <button
              onClick={nextMonth}
              disabled={year === now.getFullYear() && month === now.getMonth()}
              className="w-8 h-8 flex items-center justify-center bg-white/5 rounded-xl hover:bg-white/10 transition-all disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4 text-white/60" />
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS.map(d => (
              <div key={d} className="text-center text-[9px] font-black uppercase tracking-widest text-white/20 py-1">
                {d}
              </div>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
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
                        ? 'bg-blue-600/30 ring-1 ring-blue-500'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <span className={`text-xs font-black ${
                      isToday ? 'text-blue-400' : isWeekend ? 'text-white/20' : 'text-white/60'
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
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/5">
            {[
              { color: 'bg-green-400', label: 'Present' },
              { color: 'bg-red-400', label: 'Absent' },
              { color: 'bg-slate-700', label: 'No record' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${l.color}`} />
                <span className="text-[10px] text-white/30 font-bold">{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Selected day detail */}
        {selectedDay && (
          <div className="bg-[#121212] rounded-[2rem] border border-white/5 p-6">
            <h3 className="font-black text-sm mb-4">
              {new Date(year, month, selectedDay).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>

            {!selectedRecord ? (
              <div className="flex items-center gap-3 text-white/30">
                <Minus className="w-4 h-4" />
                <span className="text-sm font-bold">No attendance recorded</span>
              </div>
            ) : selectedRecord.status === 'absent' ? (
              <div className="flex items-center gap-3">
                <XCircle className="w-5 h-5 text-red-400" />
                <div>
                  <p className="font-black text-red-400 text-sm">Absent</p>
                  {selectedRecord.note && (
                    <p className="text-white/40 text-xs mt-0.5">{selectedRecord.note}</p>
                  )}
                </div>
              </div>
            ) : selectedRecord.status === 'present' ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <p className="font-black text-green-400 text-sm">Present</p>
                </div>
                {/* Timeline */}
                {timeline.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 pl-2 relative">
                    {idx < timeline.length - 1 && (
                      <div className="absolute left-[13px] top-6 w-px h-full bg-white/10" />
                    )}
                    <div className={`w-5 h-5 rounded-lg bg-white/5 flex items-center justify-center shrink-0 ${item.color}`}>
                      <item.icon className="w-3 h-3" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-white/80">{item.label}</p>
                      <p className="text-[10px] text-white/30 font-bold flex items-center gap-1 mt-0.5 uppercase tracking-widest">
                        <Clock className="w-3 h-3" />
                        {item.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-3 text-white/30">
                <Minus className="w-4 h-4" />
                <span className="text-sm font-bold capitalize">{selectedRecord.status}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
