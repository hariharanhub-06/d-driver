'use client';

import { useState, useEffect, useCallback } from 'react';
import { ClipboardList, Copy, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n';

interface AuditLog {
  id: string;
  actor_id: string;
  actor_name: string;
  actor_email: string;
  actor_role: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  school_id: string | null;
  ip_address: string | null;
  created_at: string;
}

interface ApiResponse {
  logs: AuditLog[];
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
  super_admin: 'SA',
  admin: 'Admin',
  driver: 'Driver',
  parent: 'Parent',
};

function getActionPrefix(action: string): 'create' | 'update' | 'delete' | 'login' | 'other' {
  const a = action.toLowerCase();
  if (a.startsWith('create')) return 'create';
  if (a.startsWith('update') || a.startsWith('edit')) return 'update';
  if (a.startsWith('delete') || a.startsWith('remove')) return 'delete';
  if (a.startsWith('login') || a.startsWith('logout') || a.startsWith('auth')) return 'login';
  return 'other';
}

const ACTION_BADGE: Record<string, string> = {
  create: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  update: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  delete: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  login: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
  other: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
};

function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 2) return 'Just now';
  if (mins < 60) return `${mins} mins ago`;
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  if (days === 1) return 'Yesterday';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function CopyId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  const short = id.length > 8 ? id.slice(0, 8) + '...' : id;

  const handleCopy = () => {
    navigator.clipboard.writeText(id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      onClick={handleCopy}
      title={id}
      className="flex items-center gap-1.5 font-mono text-xs text-slate-600 dark:text-slate-400 hover:text-[var(--brand)] transition-colors"
    >
      {short}
      {copied
        ? <Check className="w-3 h-3 text-emerald-500 shrink-0" />
        : <Copy className="w-3 h-3 shrink-0 opacity-60" />}
    </button>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-100 dark:border-slate-700/50">
      {[100, 180, 90, 80, 100, 80, 100].map((w, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" style={{ width: w }} />
        </td>
      ))}
    </tr>
  );
}

export default function AuditTrailPage() {
  const t = useT();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [actionType, setActionType] = useState('all');
  const [targetType, setTargetType] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [appliedAction, setAppliedAction] = useState('all');
  const [appliedTarget, setAppliedTarget] = useState('all');
  const [appliedFrom, setAppliedFrom] = useState('');
  const [appliedTo, setAppliedTo] = useState('');

  const limit = 50;

  const fetchLogs = useCallback(async (pg: number) => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page: pg, limit };
      if (appliedAction !== 'all') params.action_type = appliedAction;
      if (appliedTarget !== 'all') params.target_type = appliedTarget;
      if (appliedFrom) params.date_from = appliedFrom;
      if (appliedTo) params.date_to = appliedTo;
      const { data } = await api.get<ApiResponse>('/audit/logs', { params });
      setLogs(data.logs ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [appliedAction, appliedTarget, appliedFrom, appliedTo]);

  useEffect(() => {
    fetchLogs(page);
  }, [fetchLogs, page]);

  const handleApply = () => {
    setAppliedAction(actionType);
    setAppliedTarget(targetType);
    setAppliedFrom(dateFrom);
    setAppliedTo(dateTo);
    setPage(1);
  };

  const totalPages = Math.ceil(total / limit);

  const inputCls = "bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[var(--brand)] transition-colors";

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <ClipboardList className="w-7 h-7 text-[var(--brand)]" />
            {t('Audit Trail', 'தணிக்கை பதிவு')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('All changes made across the platform with user IDs', 'தளம் முழுவதும் செய்யப்பட்ட மாற்றங்கள்')}</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('Action Type', 'செயல் வகை')}</label>
          <select value={actionType} onChange={e => setActionType(e.target.value)} className={inputCls}>
            <option value="all">{t('All Actions', 'அனைத்து செயல்களும்')}</option>
            <option value="create">{t('Create', 'உருவாக்கு')}</option>
            <option value="update">{t('Update', 'புதுப்பி')}</option>
            <option value="delete">{t('Delete', 'நீக்கு')}</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('Target Type', 'இலக்கு வகை')}</label>
          <select value={targetType} onChange={e => setTargetType(e.target.value)} className={inputCls}>
            <option value="all">All Targets</option>
            <option value="student">Student</option>
            <option value="driver">Driver</option>
            <option value="bus">Bus</option>
            <option value="school">School</option>
            <option value="user">User</option>
            <option value="auth">Auth</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('Date From', 'தேதி முதல்')}</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('Date To', 'தேதி வரை')}</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={inputCls} />
        </div>
        <button
          onClick={handleApply}
          className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-4 py-2 font-semibold text-sm transition-all active:scale-95"
        >
          {t('Apply Filters', 'வடிகட்டிகள் பயன்படுத்து')}
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                {[
                  t('Time', 'நேரம்'),
                  t('Actor', 'செயல்படுத்தியவர்'),
                  t('Action', 'செயல்'),
                  t('Target Type', 'இலக்கு வகை'),
                  t('Target ID', 'இலக்கு அடையாளம்'),
                  'School',
                  t('IP', 'IP'),
                ].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-700/50 whitespace-nowrap">
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
                  <td colSpan={7} className="text-center py-16 text-slate-400 dark:text-slate-500 text-sm">
                    <ClipboardList className="w-12 h-12 mx-auto text-slate-200 dark:text-slate-700 mb-4" />
                    <p className="font-medium">{t('No audit events found', 'தணிக்கை நிகழ்வுகள் இல்லை')}</p>
                    <p className="text-xs mt-1">{t('Try adjusting your filters', 'வடிகட்டிகளை சரிசெய்யவும்')}.</p>
                  </td>
                </tr>
              ) : (
                logs.map(log => {
                  const prefix = getActionPrefix(log.action);
                  return (
                    <tr key={log.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {formatRelativeTime(log.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-sm text-slate-900 dark:text-white">{log.actor_name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{log.actor_email}</p>
                        <span className={cn(
                          'mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium',
                          ROLE_BADGE[log.actor_role] ?? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        )}>
                          {ROLE_LABEL[log.actor_role] ?? log.actor_role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'rounded-full px-2.5 py-0.5 text-xs font-medium',
                          ACTION_BADGE[prefix]
                        )}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 capitalize">
                        {log.target_type || '—'}
                      </td>
                      <td className="px-4 py-3">
                        {log.target_id ? <CopyId id={log.target_id} /> : <span className="text-slate-400 dark:text-slate-500 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 font-mono">
                        {log.school_id ? log.school_id.slice(0, 8) + '...' : 'Platform'}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">
                        {log.ip_address || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Page {page} of {totalPages} &mdash; {total} total
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
