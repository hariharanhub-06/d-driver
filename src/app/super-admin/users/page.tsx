'use client';

import { useState, useEffect } from 'react';
import { Users, Plus, Loader2, X, Shield, UserX, Trash2, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

interface SAUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  is_active: boolean;
  is_dev_sa: boolean;
  created_at: string;
}

export default function SAUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<SAUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [formError, setFormError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<SAUser | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/users/sa-users');
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim() || !form.email.trim()) {
      setFormError('Name and email are required.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/users/sa-users', form);
      setShowModal(false);
      setForm({ name: '', email: '', phone: '' });
      fetchUsers();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to create user.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (user: SAUser) => {
    setActionLoading(user.id + '_toggle');
    try {
      await api.patch(`/users/${user.id}/active`, {});
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update status.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setActionLoading(confirmDelete.id + '_delete');
    try {
      await api.delete(`/users/sa-users/${confirmDelete.id}`);
      setConfirmDelete(null);
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete user.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-8 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tighter flex items-center gap-3">
            <Users className="w-7 h-7 text-primary-400" />
            SA Users
          </h1>
          <p className="text-white/30 text-xs font-bold uppercase tracking-widest mt-1">
            Manage super admin platform accounts
          </p>
        </div>
        <button
          onClick={() => { setShowModal(true); setFormError(''); setForm({ name: '', email: '', phone: '' }); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#3B82F6] hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" /> Create SA
        </button>
      </div>

      {/* Table */}
      <div className="bg-[#161b22] rounded-2xl border border-[#30363d] overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-12">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-white/20 font-bold">No SA users found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#30363d]">
                  {['Name', 'Email', 'Phone', 'Status', 'Created', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[10px] font-black text-white/30 uppercase tracking-widest">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30363d]">
                {users.map(u => {
                  const isSelf = u.id === currentUser?.id;
                  const toggleLoading = actionLoading === u.id + '_toggle';
                  const deleteLoading = actionLoading === u.id + '_delete';

                  return (
                    <tr key={u.id} className="hover:bg-white/[0.02] transition-all">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-primary-600/20 border border-primary-600/20 flex items-center justify-center font-black text-primary-400 text-sm shrink-0">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-white font-bold text-sm">{u.name}</p>
                            {u.is_dev_sa && (
                              <span className="text-[9px] font-black uppercase tracking-widest bg-purple-500/10 text-purple-400 border border-purple-500/20 px-1.5 py-0.5 rounded-full">
                                DEV
                              </span>
                            )}
                            {isSelf && (
                              <span className="ml-1 text-[9px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded-full">
                                You
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-white/60 text-sm font-mono">{u.email}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-white/40 text-sm">{u.phone || '—'}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-[9px] font-black uppercase border',
                          u.is_active
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                        )}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-white/30 text-xs font-bold">
                          {new Date(u.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {!isSelf && !u.is_dev_sa && (
                            <button
                              onClick={() => handleToggleActive(u)}
                              disabled={!!actionLoading}
                              className={cn(
                                'flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-black border transition-all active:scale-95 disabled:opacity-50',
                                u.is_active
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                              )}
                            >
                              {toggleLoading
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : <UserX className="w-3 h-3" />}
                              {u.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                          )}
                          {!isSelf && !u.is_dev_sa && (
                            <button
                              onClick={() => setConfirmDelete(u)}
                              disabled={!!actionLoading}
                              className="flex items-center gap-1 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-[10px] font-black border border-red-500/20 transition-all active:scale-95 disabled:opacity-50"
                            >
                              {deleteLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                              Delete
                            </button>
                          )}
                          {(isSelf || u.is_dev_sa) && (
                            <span className="text-white/20 text-[10px] font-bold italic">
                              {isSelf ? 'Current session' : 'Protected'}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create SA Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-[#161b22] border border-[#30363d] rounded-[2rem] w-full max-w-md shadow-2xl">
            <div className="px-8 py-6 border-b border-[#30363d] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-primary-400" />
                <h3 className="text-lg font-black text-white">Create Super Admin</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-white/40 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="px-8 py-6 space-y-4">
              <p className="text-white/30 text-xs font-bold">
                A temporary password will be generated and emailed to the new SA.
              </p>

              <div>
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-2">Full Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Jane Doe"
                  required
                  className="w-full bg-white/5 border border-[#30363d] rounded-xl px-4 py-3 text-white text-sm font-bold outline-none focus:border-primary-500 transition-colors placeholder:text-white/20"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-2">Email Address *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="jane@ddriver.app"
                  required
                  className="w-full bg-white/5 border border-[#30363d] rounded-xl px-4 py-3 text-white text-sm font-bold outline-none focus:border-primary-500 transition-colors placeholder:text-white/20"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-2">Phone (optional)</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  placeholder="+91 98765 43210"
                  className="w-full bg-white/5 border border-[#30363d] rounded-xl px-4 py-3 text-white text-sm font-bold outline-none focus:border-primary-500 transition-colors placeholder:text-white/20"
                />
              </div>

              {formError && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {formError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white/60 rounded-xl font-bold text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-[#3B82F6] hover:bg-blue-500 text-white rounded-xl font-black text-sm disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create SA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-[#161b22] border border-[#30363d] rounded-[2rem] w-full max-w-sm shadow-2xl p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-lg font-black text-white">Delete User?</h3>
            </div>
            <p className="text-white/40 text-sm font-bold mb-6">
              This will permanently delete <span className="text-white">{confirmDelete.name}</span> ({confirmDelete.email}). This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white/60 rounded-xl font-bold text-sm transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={!!actionLoading}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-black text-sm disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
