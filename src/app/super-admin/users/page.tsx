'use client';

import { useState, useEffect } from 'react';
import { Users, Plus, Loader2, X, Shield, UserX, Trash2, AlertTriangle, Pencil, KeyRound, Check, Building2 } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n';

interface School { id: string; name: string; }

interface ManageSchool {
  id: string;
  name: string;
  logo_url?: string;
  primary_color?: string;
  status: string;
  assigned_sa_id: string | null;
}

interface SAUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  is_active: boolean;
  is_dev_sa: boolean;
  created_at: string;
  assigned_schools_count?: number;
}

const inputCls = "w-full bg-white dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/40 focus:border-[var(--brand)] transition-all";

function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in-0 zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ icon, title, subtitle, onClose, iconColor = 'text-[var(--brand)]', iconBg = 'bg-[var(--brand)]/10' }: {
  icon: React.ReactNode; title: string; subtitle?: string; onClose: () => void;
  iconColor?: string; iconBg?: string;
}) {
  return (
    <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-700 shrink-0">
      <div className="flex items-center gap-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', iconBg)}>
          <span className={iconColor}>{icon}</span>
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <button
        onClick={onClose}
        className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all flex items-center justify-center"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function FieldError({ msg }: { msg: string }) {
  return (
    <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-xs font-medium">
      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
      <span>{msg}</span>
    </div>
  );
}

export default function SAUsersPage() {
  const t = useT();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<SAUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [schools, setSchools] = useState<School[]>([]);

  // Create SA modal
  const [showCreate, setShowCreate] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [createError, setCreateError] = useState('');

  // Edit modal
  const [editUser, setEditUser] = useState<SAUser | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '' });
  const [editError, setEditError] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Reset password modal
  const [resetUser, setResetUser] = useState<SAUser | null>(null);
  const [resetPw, setResetPw] = useState('');
  const [resetPwConfirm, setResetPwConfirm] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Delete modal
  const [deleteUser, setDeleteUser] = useState<SAUser | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Toggle loading per-row
  const [toggleLoading, setToggleLoading] = useState<string | null>(null);

  // Manage Schools modal
  const [manageSAUser, setManageSAUser] = useState<SAUser | null>(null);
  const [manageSASchools, setManageSASchools] = useState<ManageSchool[]>([]);
  const [manageSALoading, setManageSALoading] = useState(false);
  const [schoolAssigning, setSchoolAssigning] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchUsers();
    api.get('/schools').then(r => setSchools((r.data || []).map((s: any) => ({ id: s.id, name: s.name })))).catch(() => {});
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/users/sa');
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // ── CREATE ──────────────────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    if (!createForm.name.trim() || !createForm.email.trim()) return setCreateError('Name and email are required.');
    if (!createForm.password || createForm.password.length < 8) return setCreateError('Password must be at least 8 characters.');
    if (createForm.password !== createForm.confirmPassword) return setCreateError('Passwords do not match.');
    setCreateSubmitting(true);
    try {
      await api.post('/users/sa', { name: createForm.name.trim(), email: createForm.email.trim(), phone: createForm.phone.trim() || undefined, password: createForm.password });
      setShowCreate(false);
      setCreateForm({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
      fetchUsers();
    } catch (err: any) {
      setCreateError(err.response?.data?.error || err.response?.data?.message || 'Failed to create user.');
    } finally {
      setCreateSubmitting(false);
    }
  };

  // ── EDIT ────────────────────────────────────────────────────────────────────
  const openEdit = (u: SAUser) => { setEditUser(u); setEditForm({ name: u.name, email: u.email, phone: u.phone || '' }); setEditError(''); };
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setEditError('');
    if (!editForm.name.trim() || !editForm.email.trim()) return setEditError('Name and email are required.');
    setEditSubmitting(true);
    try {
      await api.put(`/users/${editUser.id}`, { name: editForm.name.trim(), email: editForm.email.trim().toLowerCase(), phone: editForm.phone.trim() || null });
      setEditUser(null);
      fetchUsers();
    } catch (err: any) {
      setEditError(err.response?.data?.error || 'Failed to update user.');
    } finally {
      setEditSubmitting(false);
    }
  };

  // ── RESET PASSWORD ──────────────────────────────────────────────────────────
  const openReset = (u: SAUser) => { setResetUser(u); setResetPw(''); setResetPwConfirm(''); setResetError(''); setResetSuccess(false); };
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUser) return;
    setResetError('');
    if (resetPw.length < 8) return setResetError('Password must be at least 8 characters.');
    if (resetPw !== resetPwConfirm) return setResetError('Passwords do not match.');
    setResetSubmitting(true);
    try {
      await api.patch(`/users/${resetUser.id}/reset-password`, { new_password: resetPw });
      setResetSuccess(true);
      setTimeout(() => setResetUser(null), 1500);
    } catch (err: any) {
      setResetError(err.response?.data?.error || 'Failed to reset password.');
    } finally {
      setResetSubmitting(false);
    }
  };

  // ── TOGGLE ACTIVE ────────────────────────────────────────────────────────────
  const handleToggleActive = async (u: SAUser) => {
    setToggleLoading(u.id);
    try {
      await api.patch(`/users/${u.id}/active`, {});
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update status.');
    } finally {
      setToggleLoading(null);
    }
  };

  // ── DELETE ───────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteUser) return;
    setDeleteSubmitting(true);
    try {
      await api.delete(`/users/${deleteUser.id}`);
      setDeleteUser(null);
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete user.');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const openManageSchools = async (sa: SAUser) => {
    setManageSAUser(sa);
    setManageSALoading(true);
    setManageSASchools([]);
    try {
      const { data } = await api.get('/schools');
      setManageSASchools(Array.isArray(data) ? data : []);
    } catch { /* show empty list */ }
    setManageSALoading(false);
  };

  const handleToggleSchool = async (schoolId: string, currentlyAssigned: boolean) => {
    if (!manageSAUser) return;
    setSchoolAssigning(prev => ({ ...prev, [schoolId]: true }));
    try {
      await api.put(`/schools/${schoolId}/assign-sa`, {
        sa_id: currentlyAssigned ? null : manageSAUser.id,
      });
      setManageSASchools(prev => prev.map(s =>
        s.id === schoolId ? { ...s, assigned_sa_id: currentlyAssigned ? null : manageSAUser.id } : s
      ));
      setUsers(prev => prev.map(u =>
        u.id === manageSAUser.id
          ? { ...u, assigned_schools_count: (u.assigned_schools_count ?? 0) + (currentlyAssigned ? -1 : 1) }
          : u
      ));
    } catch { alert('Failed to update school assignment'); }
    setSchoolAssigning(prev => ({ ...prev, [schoolId]: false }));
  };

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Users className="w-7 h-7 text-[var(--brand)]" />
            {t('Super Admin Users', 'சூப்பர் அட்மின் பயனர்கள்')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('Manage super admin platform accounts', 'தள நிர்வாகிகளை நிர்வகிக்கவும்')}</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setCreateError(''); setCreateForm({ name: '', email: '', phone: '', password: '', confirmPassword: '' }); }}
          className="flex items-center gap-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl px-5 py-2.5 font-semibold text-sm transition-all active:scale-95 shadow-sm"
        >
          <Plus className="w-4 h-4" /> {t('Add User', 'பயனர் சேர்க்கவும்')}
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-20 text-slate-400 text-sm">{t('No users found', 'பயனர்கள் இல்லை')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700">
                  {[
                    t('User', 'பயனர்'),
                    t('Email', 'மின்னஞ்சல்'),
                    t('Phone', 'தொலைபேசி'),
                    t('Schools', 'பள்ளிகள்'),
                    t('Status', 'நிலை'),
                    t('Created', 'உருவாக்கப்பட்டது'),
                    t('Actions', 'செயல்கள்'),
                  ].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-700/50">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {users.map(u => {
                  const isSelf = u.id === currentUser?.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[var(--brand)]/10 flex items-center justify-center font-bold text-[var(--brand)] text-sm shrink-0">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white text-sm">{u.name}</p>
                            <div className="flex gap-1 mt-0.5">
                              {u.is_dev_sa && (
                                <span className="text-[10px] font-bold bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded-full uppercase tracking-wide">DEV</span>
                              )}
                              {isSelf && (
                                <span className="text-[10px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full uppercase tracking-wide">You</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300 font-mono">{u.email}</td>
                      <td className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400">{u.phone || '—'}</td>
                      <td className="px-5 py-4 text-sm">
                        {u.is_dev_sa ? (
                          <span className="text-slate-400 dark:text-slate-500 text-xs">All</span>
                        ) : currentUser?.is_dev_sa ? (
                          <button
                            onClick={() => openManageSchools(u)}
                            className="text-xs font-semibold text-[var(--brand)] hover:underline cursor-pointer"
                          >
                            {u.assigned_schools_count ?? 0} school{(u.assigned_schools_count ?? 0) !== 1 ? 's' : ''}
                          </button>
                        ) : (
                          <span className="font-semibold text-slate-900 dark:text-white">{u.assigned_schools_count ?? 0}</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
                          u.is_active
                            ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                        )}>
                          <span className={cn('w-1.5 h-1.5 rounded-full', u.is_active ? 'bg-emerald-500' : 'bg-slate-400')} />
                          {u.is_active ? t('Active', 'செயலில்') : t('Inactive', 'செயலற்றது')}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400">
                        {new Date(u.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-5 py-4">
                        {isSelf || u.is_dev_sa ? (
                          <span className="text-xs text-slate-400 dark:text-slate-500 italic">{isSelf ? 'Current session' : 'Protected'}</span>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEdit(u)} title={t('Edit', 'திருத்து')} className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-300 hover:text-[var(--brand)] hover:border-[var(--brand)]/40 hover:bg-[var(--brand)]/5 transition-all flex items-center justify-center">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            {currentUser?.is_dev_sa && (
                              <button onClick={() => openManageSchools(u)} title="Manage Schools" className="w-8 h-8 rounded-lg border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 text-blue-500 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all flex items-center justify-center">
                                <Building2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button onClick={() => openReset(u)} title={t('Reset Password', 'கடவுச்சொல் மீட்டமை')} className="w-8 h-8 rounded-lg border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-all flex items-center justify-center">
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleToggleActive(u)}
                              disabled={toggleLoading === u.id}
                              title={u.is_active ? t('Deactivate', 'செயலிழக்கவும்') : t('Activate', 'செயல்படுத்து')}
                              className={cn('w-8 h-8 rounded-lg border transition-all flex items-center justify-center disabled:opacity-50',
                                u.is_active
                                  ? 'border-orange-200 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/40'
                                  : 'border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
                              )}
                            >
                              {toggleLoading === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserX className="w-3.5 h-3.5" />}
                            </button>
                            <button onClick={() => setDeleteUser(u)} title={t('Delete', 'நீக்கு')} className="w-8 h-8 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all flex items-center justify-center">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── CREATE SA MODAL ──────────────────────────────────────────────────── */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)}>
        <ModalHeader icon={<Shield className="w-5 h-5" />} title={t('Create Super Admin', 'சூப்பர் அட்மின் உருவாக்கு')} subtitle={t('New Super Admin will change password on first login', 'புதிய சூப்பர் அட்மின் முதல் உள்நுழைவில் கடவுச்சொல் மாற்றும்')} onClose={() => setShowCreate(false)} />
        <form onSubmit={handleCreate} className="p-6 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('Full Name', 'முழு பெயர்')} *</label>
              <input type="text" value={createForm.name} onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))} placeholder="Jane Doe" required className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('Email Address', 'மின்னஞ்சல் முகவரி')} *</label>
              <input type="email" value={createForm.email} onChange={e => setCreateForm(p => ({ ...p, email: e.target.value }))} placeholder="jane@company.com" required className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('Phone', 'தொலைபேசி')} <span className="text-slate-400 font-normal">({t('optional', 'விருப்பத்தேர்வு')})</span></label>
              <input type="tel" value={createForm.phone} onChange={e => setCreateForm(p => ({ ...p, phone: e.target.value }))} placeholder="+91 98765 43210" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('Password', 'கடவுச்சொல்')} * <span className="text-slate-400 font-normal">{t('min. 8 characters', 'குறைந்தது 8 எழுத்துகள்')}</span></label>
              <input type="password" value={createForm.password} onChange={e => setCreateForm(p => ({ ...p, password: e.target.value }))} placeholder="••••••••" required minLength={8} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('Confirm Password', 'கடவுச்சொல் உறுதிப்படுத்து')} *</label>
              <input type="password" value={createForm.confirmPassword} onChange={e => setCreateForm(p => ({ ...p, confirmPassword: e.target.value }))} placeholder="••••••••" required className={inputCls} />
            </div>
          </div>
          {createError && <FieldError msg={createError} />}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">{t('Cancel', 'ரத்து செய்')}</button>
            <button type="submit" disabled={createSubmitting} className="flex-1 py-2.5 rounded-xl bg-[var(--brand)] text-white text-sm font-semibold hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
              {createSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> {t('Add User', 'பயனர் சேர்க்கவும்')}</>}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── EDIT MODAL ───────────────────────────────────────────────────────── */}
      <Modal open={!!editUser} onClose={() => setEditUser(null)}>
        <ModalHeader icon={<Pencil className="w-5 h-5" />} title={t('Edit User', 'பயனரை திருத்து')} subtitle={editUser?.email} onClose={() => setEditUser(null)} />
        <form onSubmit={handleUpdate} className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('Full Name', 'முழு பெயர்')} *</label>
            <input type="text" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} required className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('Email Address', 'மின்னஞ்சல் முகவரி')} *</label>
            <input type="email" value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} required className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('Phone', 'தொலைபேசி')} <span className="text-slate-400 font-normal">({t('optional', 'விருப்பத்தேர்வு')})</span></label>
            <input type="tel" value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} className={inputCls} />
          </div>
          {editError && <FieldError msg={editError} />}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setEditUser(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">{t('Cancel', 'ரத்து செய்')}</button>
            <button type="submit" disabled={editSubmitting} className="flex-1 py-2.5 rounded-xl bg-[var(--brand)] text-white text-sm font-semibold hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
              {editSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('Save Changes', 'மாற்றங்களை சேமி')}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── RESET PASSWORD MODAL ─────────────────────────────────────────────── */}
      <Modal open={!!resetUser} onClose={() => setResetUser(null)}>
        <ModalHeader
          icon={<KeyRound className="w-5 h-5" />}
          title={t('Reset Password', 'கடவுச்சொல் மீட்டமை')}
          subtitle={resetUser ? `${resetUser.name} · ${resetUser.email}` : ''}
          onClose={() => setResetUser(null)}
          iconColor="text-amber-600"
          iconBg="bg-amber-50 dark:bg-amber-900/30"
        />
        <div className="p-6 space-y-4 overflow-y-auto">
          {resetSuccess ? (
            <div className="flex flex-col items-center py-6 gap-3">
              <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                <Check className="w-7 h-7 text-emerald-500" />
              </div>
              <p className="text-slate-700 dark:text-slate-300 font-semibold text-sm">{t('Password reset successfully', 'கடவுச்சொல் வெற்றிகரமாக மீட்டமைக்கப்பட்டது')}</p>
              <p className="text-slate-500 text-xs text-center">{t('The user will be required to change it on next login.', 'அடுத்த உள்நுழைவில் பயனர் அதை மாற்ற வேண்டும்.')}</p>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div className="flex items-start gap-3 p-3.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-300">{t('The user must change this password on their next login.', 'பயனர் அடுத்த உள்நுழைவில் இந்த கடவுச்சொல்லை மாற்ற வேண்டும்.')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('New Password', 'புதிய கடவுச்சொல்')} * <span className="text-slate-400 font-normal">{t('min. 8 characters', 'குறைந்தது 8 எழுத்துகள்')}</span></label>
                <input type="password" value={resetPw} onChange={e => setResetPw(e.target.value)} required minLength={8} placeholder="••••••••" className={inputCls} autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('Confirm Password', 'கடவுச்சொல் உறுதிப்படுத்து')} *</label>
                <input type="password" value={resetPwConfirm} onChange={e => setResetPwConfirm(e.target.value)} required placeholder="••••••••" className={inputCls} />
              </div>
              {resetError && <FieldError msg={resetError} />}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setResetUser(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">{t('Cancel', 'ரத்து செய்')}</button>
                <button type="submit" disabled={resetSubmitting} className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-sm font-semibold transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                  {resetSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><KeyRound className="w-4 h-4" /> {t('Reset Password', 'கடவுச்சொல் மீட்டமை')}</>}
                </button>
              </div>
            </form>
          )}
        </div>
      </Modal>

      {/* ── MANAGE SCHOOLS MODAL ─────────────────────────────────────────────── */}
      {manageSAUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9000] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700 shrink-0">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  {t('Manage Schools', 'பள்ளிகளை நிர்வகி')} — {manageSAUser.name}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {manageSASchools.filter(s => s.assigned_sa_id === manageSAUser.id).length} {t('school(s) assigned', 'பள்ளி(கள்) ஒதுக்கப்பட்டது')}
                </p>
              </div>
              <button onClick={() => setManageSAUser(null)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {manageSALoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : manageSASchools.length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-8">{t('No schools found', 'பள்ளிகள் இல்லை')}</p>
              ) : manageSASchools.map(school => {
                const isAssigned = school.assigned_sa_id === manageSAUser.id;
                const assigningThis = schoolAssigning[school.id];
                return (
                  <button
                    key={school.id}
                    onClick={() => !assigningThis && handleToggleSchool(school.id, isAssigned)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left border',
                      isAssigned
                        ? 'bg-[var(--brand)]/5 border-[var(--brand)]/20'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 border-transparent'
                    )}
                  >
                    <div
                      className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center overflow-hidden"
                      style={{ background: school.primary_color ? school.primary_color + '22' : '#f1f5f9' }}
                    >
                      {school.logo_url
                        ? <img src={school.logo_url} alt="" className="w-full h-full object-cover" />
                        : <span className="text-xs font-bold" style={{ color: school.primary_color || '#64748b' }}>
                            {school.name.charAt(0)}
                          </span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{school.name}</p>
                      <span className={cn('text-[10px] font-medium', school.status === 'active' ? 'text-emerald-500' : 'text-slate-400')}>
                        {school.status === 'active' ? t('Active', 'செயலில்') : t('Inactive', 'செயலற்றது')}
                      </span>
                    </div>
                    <div className="shrink-0 w-5 h-5 flex items-center justify-center">
                      {assigningThis
                        ? <div className="w-4 h-4 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
                        : <div className={cn(
                            'w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors',
                            isAssigned ? 'bg-[var(--brand)] border-[var(--brand)]' : 'border-slate-300 dark:border-slate-600'
                          )}>
                            {isAssigned && <Check className="w-3 h-3 text-white" />}
                          </div>
                      }
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-700 shrink-0">
              <button
                onClick={() => setManageSAUser(null)}
                className="w-full py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white rounded-xl font-semibold text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                {t('Done', 'முடிந்தது')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM MODAL ─────────────────────────────────────────────── */}
      <Modal open={!!deleteUser} onClose={() => setDeleteUser(null)}>
        <div className="p-6">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-900/30 flex items-center justify-center shrink-0">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('Delete User?', 'பயனரை நீக்கவா?')}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t('This action cannot be undone.', 'இந்த செயலை மாற்ற முடியாது.')}</p>
            </div>
            <button onClick={() => setDeleteUser(null)} className="ml-auto w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-all flex items-center justify-center">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 bg-slate-50 dark:bg-slate-700/50 rounded-xl px-4 py-3">
            {t('Permanently deleting', 'நிரந்தரமாக நீக்குகிறது')} <span className="font-semibold text-slate-900 dark:text-white">{deleteUser?.name}</span>
            <br /><span className="text-slate-500 dark:text-slate-400 text-xs font-mono">{deleteUser?.email}</span>
          </p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteUser(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">{t('Cancel', 'ரத்து செய்')}</button>
            <button onClick={handleDelete} disabled={deleteSubmitting} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
              {deleteSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-4 h-4" /> {t('Delete', 'நீக்கு')}</>}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
