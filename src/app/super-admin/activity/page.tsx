'use client';

import { useState, useEffect, useCallback } from 'react';
import { UserCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n';

interface LoginLog {
  id: string;
  actor_id: string;
  actor_name: string;
  actor_email: string;
  actor_role: string;
  action: string;
  ip_address: string;
  created_at: string;
  school_id: string | null;
}

interface ApiResponse {
  logs: LoginLog[];
  total: number;
  page: number;
  limit: number;
}

const ROLE_BADGE: Record<string, string> = {
  super_admin: 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  admin: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  driver: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  parent: 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
};

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  driver: 'Driver',
  parent: 'Parent',
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-100 dark:border-slate-700/50">
      {[200, 100, 120, 140].map((w, i) => (
        <td key={i} className="px-4 py-3">
          <div className={`h-4 bg-slate-100 dark:bg-slate-700 rounded animate-pulse`} style={{ width: w }} />
        </td>
      ))}
    </tr>
  );
}

export default function LoginActivityPage() {
  const t = useT();
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [role, setRole] = useState('all');

  // applied filters (only updated on "Apply Filters")
  const [appliedFrom, setAppliedFrom] = useState('');
  const [appliedTo, setAppliedTo] = useState('');
  const [appliedRole, setAppliedRole] = useState('all');

  const limit = 50;

  const fetchLogs = useCallback(async (pg: number) => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page: pg, limit };
      if (appliedFrom) params.date_from = appliedFrom;
      if (appliedTo) params.date_to = appliedTo;
      if (appliedRole !== 'all') params.role = appliedRole;
      const { data } = await api.get<ApiResponse>('/audit/login-activity', { params });
      setLogs(data.logs ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [appliedFrom, appliedTo, appliedRole]);

  useEffect(() => {
    fetchLogs(page);
  }, [fetchLogs, page]);

  const handleApply = () => {
    setAppliedFrom(dateFrom);
    setAppliedTo(dateTo);
    setAppliedRole(role);
    setPage(1);
  };

  const today = new Date().toDateString();
  const todayCount = logs.filter(l => new Date(l.created_at).toDateString() === today).length;
  const uniqueUsers = new Set(logs.map(l => l.actor_id)).size;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <UserCheck className="w-7 h-7 text-[var(--brand)]" />
            {t('Activity', 'செயல்பாடு')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('Recent platform activity', 'சமீபத்திய தள செயல்பாடு')}</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('Date From', 'தேதி முதல்')}</label>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[var(--brand)] transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('Date To', 'தேதி வரை')}</label>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[var(--brand)] transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('Filter', 'வடிகட்டி')}</label>
          <select
            value={role}
            onChange={e => setRole(e.target.value)}
            className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[var(--brand)] transition-colors"
          >
            <option value="all">{t('All Roles', 'அனைத்து பணிகளும்')}</option>
            <option value="super_admin">Super Admin</option>
            <option value="admin">{t('Admin', 'அட்மின்')}</option>
            <option value="driver">{t('Driver', 'ஓட்டுனர்')}</option>
            <option value="parent">{t('Parent', 'பெற்றோர்')}</option>
          </select>
        </div>
        <button
          onClick={handleApply}
          className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2 font-semibold text-sm transition-all active:scale-95"
        >
          {t('Filter', 'வடிகட்டி')}
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: t('Total Trips', 'மொத்த பயணங்கள்'), value: total },
          { label: t('User', 'பயனர்'), value: uniqueUsers },
          { label: t('Today', 'இன்று'), value: todayCount },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{label}</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                {[t('User', 'பயனர்'), t('Action', 'செயல்'), t('School', 'பள்ளி'), t('Time', 'நேரம்')].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-700/50">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">
                    <UserCheck className="w-12 h-12 mx-auto text-slate-200 dark:text-slate-700 mb-4" />
                    <p className="font-medium">{t('No activity yet', 'இன்னும் செயல்பாடு இல்லை')}</p>
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-sm text-slate-900 dark:text-white">{log.actor_name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{log.actor_email}</p>
                      <p className="font-mono text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{log.actor_id}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'rounded-full px-2.5 py-0.5 text-xs font-medium',
                        ROLE_BADGE[log.actor_role] ?? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      )}>
                        {ROLE_LABEL[log.actor_role] ?? log.actor_role}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-slate-700 dark:text-slate-300">
                      {log.ip_address || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {formatDateTime(log.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('This Week', 'இந்த வாரம்')} {page} / {totalPages} &mdash; {total} {t('This Month', 'இந்த மாதம்')}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> {t('Previous', 'முந்தையது')}
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
              >
                {t('Next', 'அடுத்து')} <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
